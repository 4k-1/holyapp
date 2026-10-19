const pool = require('../config/db');
const { writeAudit } = require('../utils/audit');
const { createNotification } = require('../utils/notify');
const {
  requiredText,
  optionalText,
  dateValue,
  dateOnly,
  sendRecordError,
} = require('../utils/recordFields');
const schedule = require('../services/scheduleService');

const UI_TO_DB = {
  Thanksgiving: 'thanksgiving',
  Healing: 'healing',
  'In memory of the deceased': 'death_anniversary',
  'Birthday blessing': 'birthday',
  Other: 'special_intention',
  thanksgiving: 'thanksgiving',
  healing: 'healing',
  birthday: 'birthday',
  wedding_anniversary: 'wedding_anniversary',
  death_anniversary: 'death_anniversary',
  special_intention: 'special_intention',
};

const DB_TO_UI = {
  thanksgiving: 'Thanksgiving',
  healing: 'Healing',
  birthday: 'Birthday blessing',
  wedding_anniversary: 'Other',
  death_anniversary: 'In memory of the deceased',
  special_intention: 'Other',
};

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function intentionTypeToDb(value) {
  const key = String(value || '').trim();
  if (!UI_TO_DB[key]) throw httpError(400, 'Intention type is not valid.');
  return UI_TO_DB[key];
}

function toIntention(row) {
  return {
    id: row.id,
    parishId: row.parish_id,
    requesterId: row.requester_id,
    intentionType: DB_TO_UI[row.intention_type] || row.intention_type,
    intentionFor: row.intention_for,
    requestedBy: row.requester_name,
    contact: row.contact || undefined,
    status: row.status,
    offering: Number(row.offering),
    payment: row.payment_status === 'paid' ? 'paid' : 'unpaid',
    scheduleDate: dateOnly(row.schedule_date),
    scheduleTime: row.schedule_time,
    scheduleLabel: row.schedule_label,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
  };
}

function capacityState(booked, max) {
  if (booked >= max) return 'full';
  if (max - booked === 1) return 'nearly_full';
  return 'open';
}

function datesInRange(from, to) {
  const start = from <= to ? from : to;
  const end = from <= to ? to : from;
  const dates = [];
  const cursor = new Date(`${start}T00:00:00`);
  const last = new Date(`${end}T00:00:00`);
  while (cursor <= last && dates.length < 366) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    const d = String(cursor.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

async function ensureSettings(parishId, userId) {
  await pool.query(
    `INSERT INTO parish_settings (parish_id, updated_by)
     VALUES ($1, $2)
     ON CONFLICT (parish_id) DO NOTHING`,
    [parishId, userId]
  );
}

async function getCapacity(parishId, userId) {
  await ensureSettings(parishId, userId);
  const result = await pool.query(
    'SELECT mass_intention_capacity FROM parish_settings WHERE parish_id = $1',
    [parishId]
  );
  return result.rows[0]?.mass_intention_capacity || 5;
}

async function offeringAmount(parishId) {
  const named = await pool.query(
    `SELECT amount FROM service_fee
     WHERE parish_id = $1 AND service_name ILIKE '%mass intention%'
     LIMIT 1`,
    [parishId]
  );
  return named.rows[0] ? Number(named.rows[0].amount) : 100;
}

async function slotCount(parishId, date, time) {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS n
     FROM mass_intention
     WHERE parish_id = $1 AND schedule_date = $2 AND schedule_time = $3
       AND status IN ('pending', 'confirmed', 'said')`,
    [parishId, date, time]
  );
  return result.rows[0].n;
}

async function notifyOffice(parishId, title, body) {
  const office = await pool.query(
    `SELECT id FROM app_user
     WHERE parish_id = $1
       AND role IN ('parish_admin', 'parish_staff')
       AND status = 'active'`,
    [parishId]
  );
  for (const row of office.rows) {
    await createNotification({
      parishId,
      recipientId: row.id,
      kind: 'staff',
      title,
      body,
      href: 'mass-intentions',
    });
  }
}

async function listSlots(req, res) {
  try {
    await schedule.ensureDefaultMassSchedule(req.parishId, req.user.id);
    const from = dateValue(req.query.from, 'From');
    const to = dateValue(req.query.to || req.query.from, 'To');
    const location = optionalText(req.query.location) || 'Main church';
    const maxIntentions = await getCapacity(req.parishId, req.user.id);
    const recurring = await schedule.loadRecurring(req.parishId);
    const scheduleEntries = schedule.massScheduleFromCommitments(recurring);
    const intentions = await pool.query(
      `SELECT * FROM mass_intention
       WHERE parish_id = $1 AND schedule_date BETWEEN $2 AND $3
       ORDER BY created_at`,
      [req.parishId, from, to]
    );
    const mapped = intentions.rows.map(toIntention);
    const slots = [];
    for (const date of datesInRange(from, to)) {
      const occurrences = await schedule.occurrencesForDate(req.parishId, date);
      const massTimes = [...new Set(occurrences.filter((item) => item.type === 'mass').map((item) => item.start))];
      const label = schedule.scheduleLabelForDate(date, scheduleEntries);
      for (const time of massTimes) {
        const booked = mapped.filter((item) => item.scheduleDate === date && item.scheduleTime === time);
        const bookedCount = booked.length;
        slots.push({
          id: `${date}__${time}`,
          parishId: req.parishId,
          date,
          time,
          scheduleLabel: label,
          location,
          maxIntentions,
          bookedCount,
          remaining: Math.max(0, maxIntentions - bookedCount),
          capacityState: capacityState(bookedCount, maxIntentions),
          intentions: booked,
        });
      }
    }
    res.json({ slots });
  } catch (err) {
    return sendRecordError(res, err);
  }
}

async function listMine(req, res) {
  try {
    const result = await pool.query(
      `SELECT * FROM mass_intention
       WHERE parish_id = $1 AND requester_id = $2
       ORDER BY created_at DESC`,
      [req.parishId, req.user.id]
    );
    res.json({ intentions: result.rows.map(toIntention) });
  } catch (err) {
    return sendRecordError(res, err);
  }
}

async function listParishIntentions(req, res) {
  try {
    const result = await pool.query(
      `SELECT * FROM mass_intention
       WHERE parish_id = $1
       ORDER BY schedule_date DESC, created_at DESC`,
      [req.parishId]
    );
    res.json({ intentions: result.rows.map(toIntention) });
  } catch (err) {
    return sendRecordError(res, err);
  }
}

async function insertIntention({
  parishId,
  requesterId,
  requesterName,
  intentionType,
  intentionFor,
  date,
  time,
  label,
  status,
  offering,
  payment,
  contact,
}) {
  const inserted = await pool.query(
    `INSERT INTO mass_intention (
       parish_id, requester_name, intention_type, intention_for, schedule_date,
       requester_id, schedule_time, schedule_label, status, offering, payment_status, contact
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      parishId,
      requesterName,
      intentionType,
      intentionFor,
      date,
      requesterId,
      time,
      label,
      status,
      offering,
      payment,
      contact,
    ]
  );
  return inserted.rows[0];
}

async function submitIntention(req, res) {
  try {
    const date = dateValue(req.body?.scheduleDate, 'Mass date');
    const time = requiredText(req.body?.scheduleTime, 'Mass time');
    const intentionFor = requiredText(req.body?.intentionFor, 'Intention for');
    const requestedBy = requiredText(req.body?.requestedBy, 'Requested by');
    const type = intentionTypeToDb(req.body?.intentionType);
    const maxIntentions = await getCapacity(req.parishId, req.user.id);
    if ((await slotCount(req.parishId, date, time)) >= maxIntentions) {
      throw httpError(409, 'This Mass is at full capacity.');
    }
    const recurring = await schedule.loadRecurring(req.parishId);
    const scheduleEntries = schedule.massScheduleFromCommitments(recurring);
    const label =
      optionalText(req.body?.scheduleLabel) || schedule.scheduleLabelForDate(date, scheduleEntries);
    const row = await insertIntention({
      parishId: req.parishId,
      requesterId: req.user.id,
      requesterName: requestedBy,
      intentionType: type,
      intentionFor,
      date,
      time,
      label,
      status: 'pending',
      offering: await offeringAmount(req.parishId),
      payment: 'unpaid',
      contact: optionalText(req.body?.contact),
    });
    await notifyOffice(
      req.parishId,
      'New Mass intention request',
      `${requestedBy} requested a Mass intention for ${intentionFor} on ${date} at ${time}.`
    );
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'mass_intention.requested',
      entityType: 'mass_intention',
      entityId: row.id,
      metadata: { date, time },
    });
    res.status(201).json({ intention: toIntention(row) });
  } catch (err) {
    return sendRecordError(res, err);
  }
}

async function bookIntention(req, res) {
  try {
    const date = dateValue(req.body?.date, 'Mass date');
    const time = requiredText(req.body?.time, 'Mass time');
    const requesterName = requiredText(req.body?.requesterName, 'Requested by');
    const intentionFor = requiredText(req.body?.intentionText || req.body?.intentionFor, 'Intention');
    const type = intentionTypeToDb(req.body?.intentionType);
    const offering = Number(req.body?.offering);
    if (!Number.isFinite(offering) || offering < 0) {
      throw httpError(400, 'Offering is not valid.');
    }
    const maxIntentions = await getCapacity(req.parishId, req.user.id);
    if ((await slotCount(req.parishId, date, time)) >= maxIntentions) {
      throw httpError(409, 'This Mass is at full capacity.');
    }
    const recurring = await schedule.loadRecurring(req.parishId);
    const scheduleEntries = schedule.massScheduleFromCommitments(recurring);
    const label =
      optionalText(req.body?.scheduleLabel) || schedule.scheduleLabelForDate(date, scheduleEntries);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = await client.query(
        `INSERT INTO mass_intention (
           parish_id, requester_name, intention_type, intention_for, schedule_date,
           requester_id, schedule_time, schedule_label, status, offering, payment_status,
           contact, confirmed_at, confirmed_by
         )
         VALUES ($1, $2, $3, $4, $5, NULL, $6, $7, 'confirmed', $8, 'paid', $9, NOW(), $10)
         RETURNING *`,
        [
          req.parishId,
          requesterName,
          type,
          intentionFor,
          date,
          time,
          label,
          offering,
          optionalText(req.body?.contact),
          req.user.id,
        ]
      );
      const row = inserted.rows[0];
      await client.query(
        `INSERT INTO payment (
           certificate_request_id, payment_type, amount_due, amount_tendered, change,
           status, collected_by, paid_at, mass_intention_id
         )
         VALUES (NULL, 'cash', $1, $1, 0, 'paid', $2, NOW(), $3)`,
        [offering, req.user.id, row.id]
      );
      await client.query('COMMIT');
      await writeAudit({
        parishId: req.parishId,
        actorId: req.user.id,
        action: 'mass_intention.booked',
        entityType: 'mass_intention',
        entityId: row.id,
        metadata: { date, time },
      });
      res.status(201).json({ intention: toIntention(row) });
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // ignore
      }
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    return sendRecordError(res, err);
  }
}

async function loadParishIntention(parishId, id) {
  const result = await pool.query(
    'SELECT * FROM mass_intention WHERE id = $1 AND parish_id = $2',
    [id, parishId]
  );
  return result.rows[0] || null;
}

async function confirmIntention(req, res) {
  try {
    const row = await loadParishIntention(req.parishId, req.params.id);
    if (!row) return res.status(404).json({ error: 'Intention not found.' });
    if (row.status !== 'pending') {
      throw httpError(400, 'Only pending requests can be confirmed.');
    }
    const updated = await pool.query(
      `UPDATE mass_intention
       SET status = 'confirmed', confirmed_at = NOW(), confirmed_by = $1
       WHERE id = $2
       RETURNING *`,
      [req.user.id, row.id]
    );
    if (row.requester_id) {
      await createNotification({
        parishId: req.parishId,
        recipientId: row.requester_id,
        kind: 'parishioner',
        title: 'Mass intention confirmed',
        body: `Your Mass intention for ${row.intention_for} on ${String(row.schedule_date).slice(0, 10)} at ${row.schedule_time} has been confirmed.`,
        href: 'intentions',
      });
    }
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'mass_intention.confirmed',
      entityType: 'mass_intention',
      entityId: row.id,
      metadata: {},
    });
    res.json({ intention: toIntention(updated.rows[0]) });
  } catch (err) {
    return sendRecordError(res, err);
  }
}

async function markSaid(req, res) {
  try {
    const row = await loadParishIntention(req.parishId, req.params.id);
    if (!row) return res.status(404).json({ error: 'Intention not found.' });
    if (row.status !== 'confirmed') {
      throw httpError(400, 'Only confirmed intentions can be marked as said.');
    }
    const updated = await pool.query(
      `UPDATE mass_intention SET status = 'said', said_at = NOW() WHERE id = $1 RETURNING *`,
      [row.id]
    );
    if (row.requester_id) {
      await createNotification({
        parishId: req.parishId,
        recipientId: row.requester_id,
        kind: 'parishioner',
        title: 'Mass intention said',
        body: `The Mass intention for ${row.intention_for} was offered on ${String(row.schedule_date).slice(0, 10)}.`,
        href: 'intentions',
      });
    }
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'mass_intention.said',
      entityType: 'mass_intention',
      entityId: row.id,
      metadata: {},
    });
    res.json({ intention: toIntention(updated.rows[0]) });
  } catch (err) {
    return sendRecordError(res, err);
  }
}

async function getCapacitySetting(req, res) {
  try {
    const capacity = await getCapacity(req.parishId, req.user.id);
    res.json({ capacity });
  } catch (err) {
    return sendRecordError(res, err);
  }
}

async function updateCapacitySetting(req, res) {
  try {
    const next = Number(req.body?.massIntentionCapacity ?? req.body?.capacity);
    if (!Number.isInteger(next) || next < 1) {
      throw httpError(400, 'Capacity must be a whole number of at least 1.');
    }
    const fullest = await pool.query(
      `SELECT COUNT(*)::int AS n
       FROM mass_intention
       WHERE parish_id = $1 AND status IN ('pending', 'confirmed', 'said')
       GROUP BY schedule_date, schedule_time
       ORDER BY n DESC
       LIMIT 1`,
      [req.parishId]
    );
    const bookedMax = fullest.rows[0]?.n || 0;
    if (next < bookedMax) {
      throw httpError(
        400,
        `Capacity can't go below ${bookedMax} — the fullest Mass already has that many intentions.`
      );
    }
    await ensureSettings(req.parishId, req.user.id);
    await pool.query(
      `UPDATE parish_settings
       SET mass_intention_capacity = $1, updated_by = $2, updated_at = NOW()
       WHERE parish_id = $3`,
      [next, req.user.id, req.parishId]
    );
    res.json({ capacity: next });
  } catch (err) {
    return sendRecordError(res, err);
  }
}

module.exports = {
  listSlots,
  listMine,
  listParishIntentions,
  submitIntention,
  bookIntention,
  confirmIntention,
  markSaid,
  getCapacitySetting,
  updateCapacitySetting,
};
