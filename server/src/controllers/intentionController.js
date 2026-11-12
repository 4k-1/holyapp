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
const {
  parseDonation,
  ensureSettings,
  getCapacity,
  isFull,
  slotCount,
  insertOfficeIntention,
} = require('../services/intentionBooking');
const { frontendUrl } = require('../utils/frontendUrl');
const { parishSetupActor } = require('../utils/parishActor');
const {
  configured: gcashConfigured,
  createGcashCheckout,
  retrieveCheckout,
  checkoutUrlFrom,
  checkoutIdFrom,
  sessionIsPaid,
  paidPaymentFromSession,
} = require('../utils/paymongo');

/** How far ahead parishioners can pick a Mass. */
const OPEN_SLOT_DAYS = 60;

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

/** Older rows carried a default ₱100 fee that was never collected; only real donations count. */
function donationOf(row) {
  return row.payment_status === 'paid' || row.payment_status === 'pending' ? Number(row.offering) : 0;
}

function localISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function toIntention(row) {
  return {
    id: row.id,
    referenceNo: row.reference_no,
    parishId: row.parish_id,
    requesterId: row.requester_id,
    intentionType: DB_TO_UI[row.intention_type] || row.intention_type,
    intentionFor: row.intention_for,
    requestedBy: row.requester_name,
    contact: row.contact || undefined,
    status: row.status,
    offering: donationOf(row),
    donation: donationOf(row),
    payment: row.payment_status === 'paid' ? 'paid' : row.payment_status === 'pending' ? 'pending' : 'none',
    scheduleDate: dateOnly(row.schedule_date),
    scheduleTime: row.schedule_time,
    scheduleLabel: row.schedule_label,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
  };
}

/** `max` is null when the parish sets no limit on intentions per Mass. */
function capacityState(booked, max) {
  if (max === null) return 'open';
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

async function offeringAmount(parishId) {
  const named = await pool.query(
    `SELECT amount FROM service_fee
     WHERE parish_id = $1 AND service_name ILIKE '%mass intention%'
     LIMIT 1`,
    [parishId]
  );
  return named.rows[0] ? Number(named.rows[0].amount) : 100;
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

async function computeSlots(parishId, userId, from, to, location) {
  await schedule.ensureDefaultMassSchedule(parishId, userId);
  const maxIntentions = await getCapacity(parishId, userId);
  const recurring = await schedule.loadRecurring(parishId);
  const scheduleEntries = schedule.massScheduleFromCommitments(recurring);
  const intentions = await pool.query(
    `SELECT * FROM mass_intention
     WHERE parish_id = $1 AND schedule_date BETWEEN $2 AND $3
     ORDER BY created_at`,
    [parishId, from, to]
  );
  const mapped = intentions.rows.map(toIntention);
  const slots = [];
  for (const date of datesInRange(from, to)) {
    const occurrences = await schedule.occurrencesForDate(parishId, date);
    const massTimes = [...new Set(occurrences.filter((item) => item.type === 'mass').map((item) => item.start))];
    const label = schedule.scheduleLabelForDate(date, scheduleEntries);
    for (const time of massTimes) {
      const booked = mapped.filter((item) => item.scheduleDate === date && item.scheduleTime === time);
      const bookedCount = booked.length;
      slots.push({
        id: `${date}__${time}`,
        parishId,
        date,
        time,
        scheduleLabel: label,
        location,
        maxIntentions,
        bookedCount,
        remaining: maxIntentions === null ? null : Math.max(0, maxIntentions - bookedCount),
        capacityState: capacityState(bookedCount, maxIntentions),
        intentions: booked,
      });
    }
  }
  return slots;
}

async function listSlots(req, res) {
  try {
    const from = dateValue(req.query.from, 'From');
    const to = dateValue(req.query.to || req.query.from, 'To');
    const location = optionalText(req.query.location) || 'Main church';
    res.json({ slots: await computeSlots(req.parishId, req.user.id, from, to, location) });
  } catch (err) {
    return sendRecordError(res, err);
  }
}

/**
 * Parishioner picker: Masses from tomorrow on that still have room. No one else's intentions are included.
 * Also says whether GCash donations can be offered.
 */
async function listOpenSlots(req, res) {
  try {
    const start = new Date();
    start.setDate(start.getDate() + 1);
    const end = new Date(start);
    end.setDate(end.getDate() + OPEN_SLOT_DAYS - 1);
    const actor = req.user?.id || (await parishSetupActor(req.parishId));
    const slots = await computeSlots(req.parishId, actor, localISO(start), localISO(end), 'Main church');
    res.json({
      slots: slots
        .filter((slot) => slot.remaining === null || slot.remaining > 0)
        .map(({ id, date, time, scheduleLabel, remaining, maxIntentions }) => ({
          id,
          date,
          time,
          scheduleLabel,
          remaining,
          maxIntentions,
        })),
      gcashDonations: gcashConfigured(),
    });
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
  const client = await pool.connect();
  try {
    const date = dateValue(req.body?.scheduleDate, 'Mass date');
    const time = requiredText(req.body?.scheduleTime, 'Mass time');
    const intentionFor = requiredText(req.body?.intentionFor, 'Intention for');
    if (/[\n;]/.test(intentionFor)) {
      throw httpError(400, 'Name one person per request. Submit another request for someone else.');
    }
    const requestedBy = requiredText(req.body?.requestedBy, 'Requested by');
    const guest = !req.user;
    const contact = guest
      ? requiredText(req.body?.contact, 'Mobile number or email')
      : optionalText(req.body?.contact);
    const type = intentionTypeToDb(req.body?.intentionType);
    const donation = parseDonation(req.body?.donation);
    if (date <= localISO(new Date())) {
      throw httpError(400, 'Choose a Mass from tomorrow onward.');
    }
    if (donation > 0 && !gcashConfigured()) {
      throw httpError(503, 'GCash donations are not available yet. Submit without a donation, or give at the parish office.');
    }
    if (donation > 0 && donation < 1) {
      throw httpError(400, 'A GCash donation must be at least ₱1.');
    }
    const maxIntentions = await getCapacity(req.parishId, req.user?.id || (await parishSetupActor(req.parishId)));
    if (isFull(await slotCount(req.parishId, date, time), maxIntentions)) {
      throw httpError(409, 'This Mass is already full. Please choose another time.');
    }
    const recurring = await schedule.loadRecurring(req.parishId);
    const scheduleEntries = schedule.massScheduleFromCommitments(recurring);
    const label =
      optionalText(req.body?.scheduleLabel) || schedule.scheduleLabelForDate(date, scheduleEntries);

    await client.query('BEGIN');
    const inserted = await client.query(
      `INSERT INTO mass_intention (
         parish_id, requester_name, intention_type, intention_for, schedule_date,
         requester_id, schedule_time, schedule_label, status, offering, payment_status, contact
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10, $11)
       RETURNING *`,
      [
        req.parishId,
        requestedBy,
        type,
        intentionFor,
        date,
        req.user?.id || null,
        time,
        label,
        donation,
        donation > 0 ? 'pending' : 'none',
        contact,
      ]
    );
    const row = inserted.rows[0];

    let checkoutUrl = null;
    if (donation > 0) {
      const payment = await client.query(
        `INSERT INTO payment (payment_type, amount_due, status, mass_intention_id)
         VALUES ('gcash', $1, 'unpaid', $2)
         RETURNING id`,
        [donation, row.id]
      );
      const slug = await client.query('SELECT slug FROM parish WHERE id = $1', [req.parishId]);
      const account = guest
        ? { rows: [{ email: contact && contact.includes('@') ? contact : undefined }] }
        : await client.query('SELECT email FROM app_user WHERE id = $1', [req.user.id]);
      // Back to the request page, which confirms the donation and shows the thank-you screen.
      const back = guest
        ? `${frontendUrl()}/give/${slug.rows[0].slug}/intention`
        : `${frontendUrl()}/${slug.rows[0].slug}/portal/intention`;
      const session = await createGcashCheckout({
        amountCentavos: Math.round(donation * 100),
        description: 'Mass intention donation',
        referenceNumber: row.id,
        successUrl: `${back}?donation=done&intention=${row.id}`,
        cancelUrl: `${back}?donation=cancelled&intention=${row.id}`,
        metadata: { intention_id: row.id, parish_id: req.parishId },
        // Pre-fill PayMongo's payer details so the parishioner does not retype them.
        billing: { name: requestedBy, email: account.rows[0]?.email || undefined },
      });
      checkoutUrl = checkoutUrlFrom(session);
      await client.query(
        'UPDATE payment SET paymongo_reference = $1, checkout_url = $2 WHERE id = $3',
        [checkoutIdFrom(session), checkoutUrl, payment.rows[0].id]
      );
    }
    await client.query('COMMIT');

    await notifyOffice(
      req.parishId,
      'New Mass intention request',
      `${requestedBy} requested a Mass intention for ${intentionFor} on ${date} at ${time}.`
    );
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user?.id || null,
      action: 'mass_intention.requested',
      entityType: 'mass_intention',
      entityId: row.id,
      metadata: { date, time, donation, guest },
    });
    res.status(201).json({ intention: toIntention(row), checkoutUrl });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // nothing to roll back
    }
    return sendRecordError(res, err);
  } finally {
    client.release();
  }
}

/** Marks a GCash donation paid. Shared by the return-from-GCash sync and the PayMongo webhook. */
async function markIntentionDonationPaid(client, { intentionId, reference, receiptUrl }) {
  const payment = await client.query(
    `UPDATE payment
     SET status = 'paid', paid_at = NOW(), paymongo_reference = COALESCE($2, paymongo_reference),
         receipt_url = COALESCE($3, receipt_url)
     WHERE mass_intention_id = $1 AND status = 'unpaid'
     RETURNING amount_due`,
    [intentionId, reference || null, receiptUrl || null]
  );
  const updated = await client.query(
    "UPDATE mass_intention SET payment_status = 'paid' WHERE id = $1 RETURNING *",
    [intentionId]
  );
  return {
    alreadyPaid: payment.rowCount === 0,
    amount: payment.rows[0] ? Number(payment.rows[0].amount_due) : 0,
    row: updated.rows[0] || null,
  };
}

async function announceDonation(row, amount, actorId, source) {
  await notifyOffice(
    row.parish_id,
    'Mass intention donation received',
    `${row.requester_name} donated ₱${amount.toLocaleString('en-PH')} through GCash for the Mass on ${dateOnly(row.schedule_date)} at ${row.schedule_time}.`
  );
  await writeAudit({
    parishId: row.parish_id,
    actorId,
    action: 'mass_intention.donation_received',
    entityType: 'mass_intention',
    entityId: row.id,
    metadata: { amount, method: 'gcash', source },
  });
}

/** After returning from GCash: ask PayMongo whether the donation went through. */
async function syncDonation(req, res) {
  const client = await pool.connect();
  try {
    const found = await client.query(
      `SELECT i.*, p.paymongo_reference, p.status AS donation_status
       FROM mass_intention i
       JOIN payment p ON p.mass_intention_id = i.id
       WHERE i.id = $1 AND i.parish_id = $2 AND i.requester_id IS NOT DISTINCT FROM $3
       ORDER BY p.created_at DESC
       LIMIT 1`,
      [req.params.id, req.parishId, req.user?.id || null]
    );
    const row = found.rows[0];
    if (!row) return res.status(404).json({ error: 'No donation found for this intention.' });
    if (row.donation_status === 'paid' || !row.paymongo_reference || !gcashConfigured()) {
      return res.json({ intention: toIntention(row), paid: row.donation_status === 'paid' });
    }
    const session = await retrieveCheckout(row.paymongo_reference);
    if (!sessionIsPaid(session)) return res.json({ intention: toIntention(row), paid: false });

    const paidPay = paidPaymentFromSession(session);
    await client.query('BEGIN');
    const marked = await markIntentionDonationPaid(client, {
      intentionId: row.id,
      reference: checkoutIdFrom(session),
      receiptUrl: paidPay?.attributes?.receipt_url || paidPay?.attributes?.invoice_url,
    });
    await client.query('COMMIT');
    if (!marked.alreadyPaid) await announceDonation(marked.row, marked.amount, req.user?.id || null, 'sync');
    res.json({ intention: toIntention(marked.row), paid: true });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // nothing to roll back
    }
    return sendRecordError(res, err);
  } finally {
    client.release();
  }
}

async function bookIntention(req, res) {
  try {
    const date = dateValue(req.body?.date, 'Mass date');
    const time = requiredText(req.body?.time, 'Mass time');
    const requesterName = requiredText(req.body?.requesterName, 'Requested by');
    const intentionFor = requiredText(req.body?.intentionText || req.body?.intentionFor, 'Intention');
    const type = intentionTypeToDb(req.body?.intentionType);
    const offering = parseDonation(req.body?.offering);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const row = await insertOfficeIntention(client, {
        parishId: req.parishId,
        actorId: req.user.id,
        date,
        time,
        requesterName,
        type,
        intentionFor,
        offering,
        contact: optionalText(req.body?.contact),
        scheduleLabel: optionalText(req.body?.scheduleLabel),
      });
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
    // null means no limit, stored as 0.
    const requested = req.body?.massIntentionCapacity ?? req.body?.capacity;
    const unlimited = requested === null;
    const next = unlimited ? 0 : Number(requested);
    if (!unlimited && (!Number.isInteger(next) || next < 1)) {
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
    if (!unlimited && next < bookedMax) {
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
    res.json({ capacity: unlimited ? null : next });
  } catch (err) {
    return sendRecordError(res, err);
  }
}

module.exports = {
  markIntentionDonationPaid,
  announceDonation,
  listOpenSlots,
  syncDonation,
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
