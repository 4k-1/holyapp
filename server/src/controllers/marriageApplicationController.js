const pool = require('../config/db');
const { writeAudit } = require('../utils/audit');
const { createNotification } = require('../utils/notify');
const {
  requiredText,
  optionalText,
  dateValue,
  dateOnly,
  optionalUuid,
  sendRecordError,
} = require('../utils/recordFields');
const schedule = require('../services/scheduleService');
const { TEMPLATES, normalizeCircumstances, applies } = require('../constants/marriageRequirements');
const { manilaToday } = require('../constants/purposes');

/** "2026-11-09" + 180 → "2027-05-08". */
function addDays(isoDate, days) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function partyName(row, who) {
  return [row[`${who}_first_name`], row[`${who}_middle_name`], row[`${who}_last_name`]]
    .filter(Boolean)
    .join(' ');
}

/**
 * One checklist line. `weddingDate` (or today) decides whether a dated document is still good:
 * expiresOn is the last day it is accepted.
 */
function toRequirement(row, weddingDate) {
  const documentDate = dateOnly(row.document_date) || null;
  const expiresOn = documentDate && row.valid_for_days ? addDays(documentDate, row.valid_for_days) : null;
  const today = manilaToday();
  return {
    id: row.id,
    typeId: row.requirement_type_id,
    key: row.template_key || null,
    name: row.requirement_name,
    note: row.note || '',
    condition: row.condition || 'always',
    required: row.is_required,
    validForDays: row.valid_for_days || null,
    submitted: row.submitted,
    documentDate,
    expiresOn,
    expired: Boolean(expiresOn && expiresOn < today),
    expiresBeforeWedding: Boolean(expiresOn && weddingDate && weddingDate > today && expiresOn < weddingDate),
    verifiedBy: row.verified_by || null,
    verifiedAt: row.verified_at ? new Date(row.verified_at).toISOString() : null,
    verifiedByName: row.verified_by_name || null,
  };
}

function toApplication(row, requirements = [], event = null) {
  return {
    id: row.id,
    referenceNo: row.reference_no,
    parishId: row.parish_id,
    parishionerId: row.parishioner_id || null,
    groomFirstName: row.groom_first_name,
    groomMiddleName: row.groom_middle_name || '',
    groomLastName: row.groom_last_name,
    brideFirstName: row.bride_first_name,
    brideMiddleName: row.bride_middle_name || '',
    brideLastName: row.bride_last_name,
    groomName: partyName(row, 'groom'),
    brideName: partyName(row, 'bride'),
    status: row.status,
    remarks: row.remarks || '',
    dispensationNeeded: row.dispensation_needed === true,
    dispensationStatus: row.dispensation_status || 'none',
    dispensationNotes: row.dispensation_notes || '',
    preferredWeddingDate: dateOnly(row.preferred_wedding_date) || '',
    preferredWeddingStart: row.preferred_wedding_start || '',
    preferredWeddingEnd: row.preferred_wedding_end || '',
    weddingEventId: row.wedding_event_id || null,
    weddingDateStatus: row.wedding_date_status || 'none',
    weddingEvent: event,
    circumstances: normalizeCircumstances(row.circumstances),
    requirements,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  };
}

/**
 * Adds any built-in requirement the parish has never had, matched by its permanent key, so an item
 * the parish renamed or turned off is left alone. Then gives open applications a row for each new
 * type. Confirmed and closed applications are left alone.
 */
async function ensureRequirementTypes(parishId, userId) {
  const existing = await pool.query(
    'SELECT template_key FROM marriage_requirement_type WHERE parish_id = $1 AND template_key IS NOT NULL',
    [parishId]
  );
  const have = new Set(existing.rows.map((row) => row.template_key));
  const missing = TEMPLATES.filter((t) => !have.has(t.key));
  if (missing.length === 0) return;
  for (const t of missing) {
    await pool.query(
      `INSERT INTO marriage_requirement_type
         (parish_id, requirement_name, is_required, created_by, template_key, condition, skip_when,
          valid_for_days, sort_order, note)
       VALUES ($1, $2, true, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (parish_id, template_key) WHERE template_key IS NOT NULL DO NOTHING`,
      [parishId, t.name, userId, t.key, t.condition || 'always', t.skipWhen || null, t.days || null, t.order, t.note || null]
    );
  }
  await addMissingRows(pool, parishId);
}

/** Every open application gets a row for every active requirement type of its parish. */
async function addMissingRows(db, parishId) {
  await db.query(
    `INSERT INTO marriage_application_requirement (marriage_application_id, requirement_type_id)
     SELECT a.id, t.id
     FROM marriage_application a
     JOIN marriage_requirement_type t ON t.parish_id = a.parish_id AND t.active
     WHERE a.parish_id = $1
       AND a.status NOT IN ('approved', 'rejected', 'completed')
       AND NOT EXISTS (
         SELECT 1 FROM marriage_application_requirement r
         WHERE r.marriage_application_id = a.id AND r.requirement_type_id = t.id
       )`,
    [parishId]
  );
}

/**
 * The couple's checklist: only the requirements that apply to them (their answers, and items the
 * parish hasn't turned off). An item already received stays on the list even if it no longer applies.
 */
async function loadRequirements(row, weddingDate) {
  const result = await pool.query(
    `SELECT r.*, t.requirement_name, t.is_required, t.template_key, t.condition, t.skip_when,
            t.valid_for_days, t.note, t.active,
            NULLIF(trim(concat_ws(' ', u.first_name, u.last_name)), '') AS verified_by_name
     FROM marriage_application_requirement r
     JOIN marriage_requirement_type t ON t.id = r.requirement_type_id
     LEFT JOIN app_user u ON u.id = r.verified_by
     WHERE r.marriage_application_id = $1
     ORDER BY t.sort_order, t.created_at`,
    [row.id]
  );
  const answers = normalizeCircumstances(row.circumstances);
  return result.rows
    .filter((item) => item.submitted || applies(item, answers))
    .map((item) => toRequirement(item, weddingDate));
}

/** The reserved wedding date, or the date the couple asked for. */
function weddingDateOf(row, event) {
  return (event && event.date) || dateOnly(row.preferred_wedding_date) || null;
}

async function loadWeddingEvent(eventId) {
  if (!eventId) return null;
  const result = await pool.query(
    `${schedule.EVENT_SELECT} WHERE e.id = $1`,
    [eventId]
  );
  if (!result.rowCount) return null;
  return schedule.toBlock(result.rows[0]);
}

async function loadApplication(parishId, id) {
  const result = await pool.query(
    'SELECT * FROM marriage_application WHERE id = $1 AND parish_id = $2',
    [id, parishId]
  );
  return result.rows[0] || null;
}

async function hydrate(row) {
  const event = await loadWeddingEvent(row.wedding_event_id);
  const requirements = await loadRequirements(row, weddingDateOf(row, event));
  return toApplication(row, requirements, event);
}

function requiredComplete(requirements) {
  return requirements.filter((item) => item.required).every((item) => item.submitted);
}

async function maybeAdvanceRequirements(row) {
  const requirements = await loadRequirements(row, null);
  if (row.status === 'pending' && requiredComplete(requirements)) {
    const updated = await pool.query(
      `UPDATE marriage_application
       SET status = 'checking_requirements', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [row.id]
    );
    return updated.rows[0];
  }
  return row;
}

async function findParishionerByEmail(parishId, email) {
  const text = String(email || '').trim().toLowerCase();
  if (!text) return null;
  const result = await pool.query(
    `SELECT id FROM app_user
     WHERE parish_id = $1 AND lower(email) = $2 AND role = 'parishioner'
     LIMIT 1`,
    [parishId, text]
  );
  return result.rows[0]?.id || null;
}

async function listApplications(req, res) {
  try {
    await ensureRequirementTypes(req.parishId, req.user.id);
    const result = await pool.query(
      `SELECT * FROM marriage_application
       WHERE parish_id = $1
       ORDER BY created_at DESC`,
      [req.parishId]
    );
    const applications = [];
    for (const row of result.rows) {
      applications.push(await hydrate(row));
    }
    res.json({ applications });
  } catch (err) {
    return sendRecordError(res, err);
  }
}

async function getApplication(req, res) {
  try {
    if (req.user.role !== 'parishioner') await ensureRequirementTypes(req.parishId, req.user.id);
    const row = await loadApplication(req.parishId, req.params.id);
    if (!row) return res.status(404).json({ error: 'Application not found.' });
    if (req.user.role === 'parishioner' && row.parishioner_id !== req.user.id) {
      return res.status(404).json({ error: 'Application not found.' });
    }
    res.json({ application: await hydrate(row) });
  } catch (err) {
    return sendRecordError(res, err);
  }
}

async function listMine(req, res) {
  try {
    const result = await pool.query(
      `SELECT * FROM marriage_application
       WHERE parish_id = $1 AND parishioner_id = $2
       ORDER BY created_at DESC`,
      [req.parishId, req.user.id]
    );
    const applications = [];
    for (const row of result.rows) {
      applications.push(await hydrate(row));
    }
    res.json({ applications });
  } catch (err) {
    return sendRecordError(res, err);
  }
}

async function createApplication(req, res) {
  const client = await pool.connect();
  try {
    const body = req.body || {};
    const groomFirst = requiredText(body.groomFirstName, "Groom's first name");
    const groomLast = requiredText(body.groomLastName, "Groom's last name");
    const brideFirst = requiredText(body.brideFirstName, "Bride's first name");
    const brideLast = requiredText(body.brideLastName, "Bride's last name");
    await ensureRequirementTypes(req.parishId, req.user.id);
    const parishionerId =
      optionalUuid(body.parishionerId) || (await findParishionerByEmail(req.parishId, body.parishionerEmail));

    await client.query('BEGIN');
    const inserted = await client.query(
      `INSERT INTO marriage_application (
         parish_id, groom_first_name, groom_middle_name, groom_last_name,
         bride_first_name, bride_middle_name, bride_last_name,
         status, remarks, created_by, parishioner_id,
         dispensation_needed, dispensation_status, dispensation_notes, circumstances
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, $10, $11, $12, $13, $14::jsonb)
       RETURNING *`,
      [
        req.parishId,
        groomFirst,
        optionalText(body.groomMiddleName),
        groomLast,
        brideFirst,
        optionalText(body.brideMiddleName),
        brideLast,
        optionalText(body.remarks),
        req.user.id,
        parishionerId,
        body.dispensationNeeded === true,
        body.dispensationNeeded === true ? 'pending' : 'none',
        optionalText(body.dispensationNotes),
        JSON.stringify(normalizeCircumstances(body.circumstances)),
      ]
    );
    const row = inserted.rows[0];
    const types = await client.query(
      'SELECT id FROM marriage_requirement_type WHERE parish_id = $1 AND active ORDER BY sort_order, created_at',
      [req.parishId]
    );
    for (const type of types.rows) {
      await client.query(
        `INSERT INTO marriage_application_requirement (marriage_application_id, requirement_type_id)
         VALUES ($1, $2)`,
        [row.id, type.id]
      );
    }
    await client.query('COMMIT');

    if (parishionerId) {
      await createNotification({
        parishId: req.parishId,
        recipientId: parishionerId,
        kind: 'parishioner',
        title: 'Marriage application filed',
        body: 'The parish office opened a marriage application for you. You can follow its status in the portal.',
        href: 'marriage',
      });
    }

    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'marriage_application.created',
      entityType: 'marriage_application',
      entityId: row.id,
      metadata: { groom: partyName(row, 'groom'), bride: partyName(row, 'bride') },
    });
    res.status(201).json({ application: await hydrate(row) });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore
    }
    return sendRecordError(res, err);
  } finally {
    client.release();
  }
}

async function verifyRequirement(req, res) {
  try {
    const submitted = req.body?.submitted === true;
    const row = await loadApplication(req.parishId, req.params.id);
    if (!row) return res.status(404).json({ error: 'Application not found.' });
    if (row.status === 'rejected' || row.status === 'completed') {
      throw httpError(400, 'This application can no longer be updated.');
    }
    const found = await pool.query(
      `SELECT r.id, t.valid_for_days, t.requirement_name
       FROM marriage_application_requirement r
       JOIN marriage_requirement_type t ON t.id = r.requirement_type_id
       WHERE r.id = $1 AND r.marriage_application_id = $2`,
      [req.params.requirementId, row.id]
    );
    const item = found.rows[0];
    if (!item) return res.status(404).json({ error: 'Requirement not found.' });

    // A document that expires needs the date printed on it, so the app can check it against the wedding.
    let documentDate = null;
    if (submitted && item.valid_for_days) {
      documentDate = dateValue(req.body?.documentDate, 'Date on the document', { required: false });
      if (!documentDate) throw httpError(400, `Enter the date on the ${item.requirement_name}.`);
      if (documentDate > manilaToday()) throw httpError(400, 'The date on the document cannot be in the future.');
    }
    await pool.query(
      `UPDATE marriage_application_requirement
       SET submitted = $1,
           verified_by = $2,
           verified_at = CASE WHEN $1 THEN NOW() ELSE NULL END,
           document_date = $3
       WHERE id = $4`,
      [submitted, submitted ? req.user.id : null, documentDate, item.id]
    );
    const next = await maybeAdvanceRequirements(row);
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: submitted ? 'marriage_application.requirement_verified' : 'marriage_application.requirement_cleared',
      entityType: 'marriage_application',
      entityId: row.id,
      metadata: { requirementId: req.params.requirementId, name: item.requirement_name, documentDate },
    });
    res.json({ application: await hydrate(next) });
  } catch (err) {
    return sendRecordError(res, err);
  }
}

/** The couple's yes/no answers; they decide which conditional requirements are on the checklist. */
async function updateCircumstances(req, res) {
  try {
    const row = await loadApplication(req.parishId, req.params.id);
    if (!row) return res.status(404).json({ error: 'Application not found.' });
    if (['rejected', 'completed'].includes(row.status)) {
      throw httpError(400, 'This application can no longer be updated.');
    }
    const circumstances = normalizeCircumstances(req.body?.circumstances);
    const updated = await pool.query(
      `UPDATE marriage_application SET circumstances = $1::jsonb, updated_at = NOW()
       WHERE id = $2 AND parish_id = $3 RETURNING *`,
      [JSON.stringify(circumstances), row.id, req.parishId]
    );
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'marriage_application.circumstances_updated',
      entityType: 'marriage_application',
      entityId: row.id,
      metadata: { circumstances },
    });
    res.json({ application: await hydrate(updated.rows[0]) });
  } catch (err) {
    return sendRecordError(res, err);
  }
}

async function updateDispensation(req, res) {
  try {
    const row = await loadApplication(req.parishId, req.params.id);
    if (!row) return res.status(404).json({ error: 'Application not found.' });
    const needed = req.body?.dispensationNeeded === true;
    let status = String(req.body?.dispensationStatus || (needed ? 'pending' : 'none')).toLowerCase();
    if (!['none', 'pending', 'granted', 'denied'].includes(status)) {
      throw httpError(400, 'Dispensation status is not valid.');
    }
    if (!needed) status = 'none';
    if (needed && status === 'none') status = 'pending';
    const updated = await pool.query(
      `UPDATE marriage_application
       SET dispensation_needed = $1,
           dispensation_status = $2,
           dispensation_notes = $3,
           updated_at = NOW()
       WHERE id = $4 AND parish_id = $5
       RETURNING *`,
      [needed, status, optionalText(req.body?.dispensationNotes), row.id, req.parishId]
    );
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'marriage_application.dispensation_updated',
      entityType: 'marriage_application',
      entityId: row.id,
      metadata: { status },
    });
    res.json({ application: await hydrate(updated.rows[0]) });
  } catch (err) {
    return sendRecordError(res, err);
  }
}

async function reserveWeddingDate(req, res) {
  try {
    const row = await loadApplication(req.parishId, req.params.id);
    if (!row) return res.status(404).json({ error: 'Application not found.' });
    if (row.status === 'rejected') throw httpError(400, 'A rejected application cannot reserve a date.');
    const date = dateValue(req.body?.date, 'Wedding date');
    const start = requiredText(req.body?.start, 'Start time');
    const end = requiredText(req.body?.end, 'End time');
    const who = schedule.assigneeInput(req.body || {});
    await schedule.checkAssignee(req.parishId, who);
    // Weddings are celebrated in the church, so they clash with anything else there or with the same priest.
    await schedule.assertNoConflict(req.parishId, {
      date,
      start,
      end,
      ...who,
      location: schedule.DEFAULT_LOCATION,
      excludeId: row.wedding_event_id || undefined,
    });
    await schedule.assertCalendarOk(req.parishId, { date, type: 'wedding', calendarOk: req.body?.calendarOk });

    let eventId = row.wedding_event_id;
    const title = `Wedding — ${partyName(row, 'groom')} & ${partyName(row, 'bride')}`;
    if (eventId) {
      const { toTimestamp } = require('../utils/scheduleTime');
      const updatedEvent = await pool.query(
        `UPDATE event
         SET title = $1, start_datetime = $2, end_datetime = $3,
             assigned_to = $4, assignee_name = $5, updated_at = NOW(), status = 'upcoming',
             location = COALESCE(location, $8)
         WHERE id = $6 AND parish_id = $7
         RETURNING id`,
        [title, toTimestamp(date, start), toTimestamp(date, end), who.assigneeId, who.assigneeId ? null : who.assignee || null, eventId, req.parishId, schedule.DEFAULT_LOCATION]
      );
      if (!updatedEvent.rowCount) eventId = null;
    }
    if (!eventId) {
      eventId = await schedule.createEvent(req.parishId, req.user.id, {
        title,
        date,
        start,
        end,
        type: 'wedding',
        source: 'Marriage Process',
        ...who,
        location: schedule.DEFAULT_LOCATION,
        marriageApplicationId: row.id,
      });
    }

    const updated = await pool.query(
      `UPDATE marriage_application
       SET preferred_wedding_date = $1,
           preferred_wedding_start = $2,
           preferred_wedding_end = $3,
           wedding_event_id = $4,
           wedding_date_status = 'reserved',
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [date, start, end, eventId, row.id]
    );
    if (row.parishioner_id) {
      await createNotification({
        parishId: req.parishId,
        recipientId: row.parishioner_id,
        kind: 'parishioner',
        title: 'Wedding date reserved',
        body: `A wedding date of ${date} at ${start} has been reserved. The parish will confirm it once requirements are complete.`,
        href: 'marriage',
      });
    }
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'marriage_application.date_reserved',
      entityType: 'marriage_application',
      entityId: row.id,
      metadata: { date, start, end },
    });
    res.json({ application: await hydrate(updated.rows[0]) });
  } catch (err) {
    return sendRecordError(res, err);
  }
}

async function confirmWeddingDate(req, res) {
  try {
    const row = await loadApplication(req.parishId, req.params.id);
    if (!row) return res.status(404).json({ error: 'Application not found.' });
    if (row.wedding_date_status !== 'reserved' || !row.wedding_event_id) {
      throw httpError(400, 'Reserve a wedding date before confirming it.');
    }
    const event = await loadWeddingEvent(row.wedding_event_id);
    const requirements = await loadRequirements(row, weddingDateOf(row, event));
    if (!requiredComplete(requirements)) {
      throw httpError(400, 'Verify every required document before confirming the wedding date.');
    }
    const stale = requirements.find((item) => item.submitted && (item.expired || item.expiresBeforeWedding));
    if (stale) {
      throw httpError(400, `The ${stale.name} expires before the wedding. Ask for a newer copy first.`);
    }
    if (row.dispensation_needed && row.dispensation_status !== 'granted') {
      throw httpError(400, 'Dispensation must be granted before the wedding date is confirmed.');
    }
    const updated = await pool.query(
      `UPDATE marriage_application
       SET wedding_date_status = 'confirmed',
           status = 'approved',
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [row.id]
    );
    if (row.parishioner_id) {
      await createNotification({
        parishId: req.parishId,
        recipientId: row.parishioner_id,
        kind: 'parishioner',
        title: 'Wedding date confirmed',
        body: `Your wedding date of ${String(row.preferred_wedding_date).slice(0, 10)} is confirmed.`,
        href: 'marriage',
      });
    }
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'marriage_application.date_confirmed',
      entityType: 'marriage_application',
      entityId: row.id,
      metadata: {},
    });
    res.json({ application: await hydrate(updated.rows[0]) });
  } catch (err) {
    return sendRecordError(res, err);
  }
}

async function rejectApplication(req, res) {
  try {
    const row = await loadApplication(req.parishId, req.params.id);
    if (!row) return res.status(404).json({ error: 'Application not found.' });
    const remarks = requiredText(req.body?.remarks, 'Remarks');
    const updated = await pool.query(
      `UPDATE marriage_application
       SET status = 'rejected', remarks = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [remarks, row.id]
    );
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'marriage_application.rejected',
      entityType: 'marriage_application',
      entityId: row.id,
      metadata: {},
    });
    res.json({ application: await hydrate(updated.rows[0]) });
  } catch (err) {
    return sendRecordError(res, err);
  }
}

module.exports = {
  updateCircumstances,
  ensureRequirementTypes,
  addMissingRows,
  listApplications,
  getApplication,
  listMine,
  createApplication,
  verifyRequirement,
  updateDispensation,
  reserveWeddingDate,
  confirmWeddingDate,
  rejectApplication,
};
