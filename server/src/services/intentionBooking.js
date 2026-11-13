// Mass intentions booked at the parish office: used by the intentions page and by funeral booking (C7),
// which books the family's follow-up Masses (9th day, 40th day, first anniversary) the same way.

const pool = require('../config/db');
const schedule = require('./scheduleService');
const { encrypt } = require('../utils/fieldCrypto');

/** Upper bound for a single donation, to catch typos like an extra zero. */
const MAX_DONATION = 100000;

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function parseDonation(value) {
  if (value === undefined || value === null || value === '') return 0;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) throw httpError(400, 'Donation amount is not valid.');
  if (amount > MAX_DONATION) throw httpError(400, 'Donation amount is too large.');
  return Math.round(amount * 100) / 100;
}

async function ensureSettings(parishId, userId) {
  await pool.query(
    `INSERT INTO parish_settings (parish_id, updated_by)
     VALUES ($1, $2)
     ON CONFLICT (parish_id) DO NOTHING`,
    [parishId, userId]
  );
}

/** Intentions allowed per Mass, or null for no limit (stored as 0). */
async function getCapacity(parishId, userId) {
  await ensureSettings(parishId, userId);
  const result = await pool.query('SELECT mass_intention_capacity FROM parish_settings WHERE parish_id = $1', [
    parishId,
  ]);
  const stored = result.rows[0]?.mass_intention_capacity;
  if (stored === 0) return null;
  return stored || 5;
}

function isFull(booked, max) {
  return max !== null && booked >= max;
}

async function slotCount(parishId, date, time, db = pool) {
  const result = await db.query(
    `SELECT COUNT(*)::int AS n
     FROM mass_intention
     WHERE parish_id = $1 AND schedule_date = $2 AND schedule_time = $3
       AND status IN ('pending', 'confirmed', 'said')`,
    [parishId, date, time]
  );
  return result.rows[0].n;
}

/**
 * Books a confirmed intention taken at the office, with any offering recorded as paid in cash.
 * `db` is a client inside the caller's transaction. Returns the new row.
 */
async function insertOfficeIntention(
  db,
  { parishId, actorId, date, time, requesterName, type, intentionFor, offering = 0, contact, scheduleLabel }
) {
  const maxIntentions = await getCapacity(parishId, actorId);
  if (isFull(await slotCount(parishId, date, time, db), maxIntentions)) {
    throw httpError(409, `The ${time} Mass on ${date} is at full capacity.`);
  }
  let label = scheduleLabel;
  if (!label) {
    const recurring = await schedule.loadRecurring(parishId);
    label = schedule.scheduleLabelForDate(date, schedule.massScheduleFromCommitments(recurring));
  }
  const inserted = await db.query(
    `INSERT INTO mass_intention (
       parish_id, requester_name, intention_type, intention_for, schedule_date,
       requester_id, schedule_time, schedule_label, status, offering, payment_status,
       contact, confirmed_at, confirmed_by
     )
     VALUES ($1, $2, $3, $4, $5, NULL, $6, $7, 'confirmed', $8, $11, $9, NOW(), $10)
     RETURNING *`,
    [
      parishId,
      encrypt(requesterName),
      type,
      encrypt(intentionFor),
      date,
      time,
      label,
      offering,
      encrypt(contact || null),
      actorId,
      offering > 0 ? 'paid' : 'none',
    ]
  );
  const row = inserted.rows[0];
  if (offering > 0) {
    await db.query(
      `INSERT INTO payment (
         certificate_request_id, payment_type, amount_due, amount_tendered, change,
         status, collected_by, paid_at, mass_intention_id
       )
       VALUES (NULL, 'cash', $1, $1, 0, 'paid', $2, NOW(), $3)`,
      [offering, actorId, row.id]
    );
  }
  return row;
}

module.exports = {
  MAX_DONATION,
  parseDonation,
  ensureSettings,
  getCapacity,
  isFull,
  slotCount,
  insertOfficeIntention,
};
