const pool = require('../config/db');
const { writeAudit } = require('../utils/audit');
const { requiredText, optionalText, dateValue, sendRecordError } = require('../utils/recordFields');
const schedule = require('../services/scheduleService');

function send(res, err) {
  return sendRecordError(res, err);
}

function parseBlockInput(body) {
  return {
    title: requiredText(body.title, 'Title'),
    date: dateValue(body.date, 'Date'),
    start: requiredText(body.start, 'Start time'),
    end: requiredText(body.end, 'End time'),
    type: requiredText(body.type, 'Type'),
    source: optionalText(body.source) || 'manual',
    assignee: optionalText(body.assignee) || '',
    location: optionalText(body.location),
    showOnOverview: body.showOnOverview !== false,
  };
}

async function listMonth(req, res) {
  try {
    await schedule.ensureDefaultMassSchedule(req.parishId, req.user.id);
    const year = Number(req.query.year);
    const month = Number(req.query.month);
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 0 || month > 11) {
      return res.status(400).json({ error: 'year and month are required.' });
    }
    const occurrences = await schedule.occurrencesForMonth(req.parishId, year, month);
    res.json({ occurrences });
  } catch (err) {
    return send(res, err);
  }
}

async function listBlocks(req, res) {
  try {
    const blocks = await schedule.loadBlocks(req.parishId);
    res.json({ blocks });
  } catch (err) {
    return send(res, err);
  }
}

async function listStaffNames(req, res) {
  try {
    const staff = await schedule.listAssignableStaff(req.parishId);
    res.json({ staff });
  } catch (err) {
    return send(res, err);
  }
}

async function checkConflict(req, res) {
  try {
    const date = dateValue(req.body?.date, 'Date');
    const start = requiredText(req.body?.start, 'Start time');
    const end = requiredText(req.body?.end, 'End time');
    const occurrences = await schedule.occurrencesForDate(req.parishId, date);
    const conflict = schedule.findConflict(
      occurrences,
      start,
      end,
      optionalText(req.body?.excludeId) || undefined,
      optionalText(req.body?.assignee) || undefined
    );
    res.json({ conflict: conflict || null });
  } catch (err) {
    return send(res, err);
  }
}

async function createBlock(req, res) {
  try {
    const input = parseBlockInput(req.body || {});
    const id = await schedule.createEvent(req.parishId, req.user.id, input);
    const blocks = await schedule.loadBlocks(req.parishId);
    const block = blocks.find((item) => item.id === id);
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'schedule.event_created',
      entityType: 'event',
      entityId: id,
      metadata: { title: input.title, date: input.date, type: input.type },
    });
    res.status(201).json({ block });
  } catch (err) {
    return send(res, err);
  }
}

async function assignOccurrence(req, res) {
  try {
    const occurrenceId = requiredText(req.body?.occurrenceId, 'Occurrence');
    const assignee = optionalText(req.body?.assignee) || '';
    await schedule.assignOccurrence(req.parishId, occurrenceId, assignee);
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'schedule.assigned',
      entityType: 'event',
      entityId: occurrenceId,
      metadata: { assignee },
    });
    res.json({ ok: true });
  } catch (err) {
    return send(res, err);
  }
}

async function markRecord(req, res) {
  try {
    const status = requiredText(req.body?.status, 'Record status');
    if (status !== 'Pending' && status !== 'Recorded') {
      return res.status(400).json({ error: 'Record status is not valid.' });
    }
    const updated = await pool.query(
      `UPDATE event
       SET record_status = $1, updated_at = NOW()
       WHERE id = $2 AND parish_id = $3
       RETURNING id`,
      [status, req.params.id, req.parishId]
    );
    if (!updated.rowCount) return res.status(404).json({ error: 'Event not found.' });
    res.json({ ok: true });
  } catch (err) {
    return send(res, err);
  }
}

async function listRecurring(req, res) {
  try {
    await schedule.ensureDefaultMassSchedule(req.parishId, req.user.id);
    const commitments = await schedule.loadRecurring(req.parishId);
    res.json({ commitments });
  } catch (err) {
    return send(res, err);
  }
}

function parseRecurring(body) {
  const days = Array.isArray(body.days) ? body.days.map((d) => String(d)) : [];
  const slots = Array.isArray(body.slots) ? body.slots : [];
  if (days.length === 0) throw schedule.httpError(400, 'Choose at least one day.');
  if (slots.length === 0) throw schedule.httpError(400, 'Add at least one time slot.');
  return {
    label: requiredText(body.label, 'Label'),
    type: requiredText(body.type, 'Type'),
    days,
    slots,
    assignee: optionalText(body.assignee) || '',
    showOnOverview: body.showOnOverview !== false,
  };
}

async function createRecurring(req, res) {
  try {
    const input = parseRecurring(req.body || {});
    const inserted = await pool.query(
      `INSERT INTO parish_recurring_commitment
         (parish_id, label, event_type, days, slots, assignee, show_on_overview, created_by)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
       RETURNING *`,
      [
        req.parishId,
        input.label,
        input.type,
        input.days,
        JSON.stringify(input.slots),
        input.assignee,
        input.showOnOverview,
        req.user.id,
      ]
    );
    res.status(201).json({ commitment: schedule.toRecurring(inserted.rows[0]) });
  } catch (err) {
    return send(res, err);
  }
}

async function updateRecurring(req, res) {
  try {
    const input = parseRecurring(req.body || {});
    const updated = await pool.query(
      `UPDATE parish_recurring_commitment
       SET label = $1, event_type = $2, days = $3, slots = $4::jsonb,
           assignee = $5, show_on_overview = $6, updated_at = NOW()
       WHERE id = $7 AND parish_id = $8
       RETURNING *`,
      [
        input.label,
        input.type,
        input.days,
        JSON.stringify(input.slots),
        input.assignee,
        input.showOnOverview,
        req.params.id,
        req.parishId,
      ]
    );
    if (!updated.rowCount) return res.status(404).json({ error: 'Commitment not found.' });
    res.json({ commitment: schedule.toRecurring(updated.rows[0]) });
  } catch (err) {
    return send(res, err);
  }
}

async function removeRecurring(req, res) {
  try {
    const deleted = await pool.query(
      `DELETE FROM parish_recurring_commitment WHERE id = $1 AND parish_id = $2 RETURNING id`,
      [req.params.id, req.parishId]
    );
    if (!deleted.rowCount) return res.status(404).json({ error: 'Commitment not found.' });
    await pool.query(
      `DELETE FROM parish_schedule_override
       WHERE parish_id = $1 AND occurrence_id LIKE $2`,
      [req.parishId, `${req.params.id}-%`]
    );
    res.json({ ok: true });
  } catch (err) {
    return send(res, err);
  }
}

async function listMassTimes(req, res) {
  try {
    await schedule.ensureDefaultMassSchedule(req.parishId, req.user.id);
    const recurring = await schedule.loadRecurring(req.parishId);
    const scheduleEntries = schedule.massScheduleFromCommitments(recurring);
    const date = String(req.query.date || '').trim();
    if (!date) {
      return res.json({ schedule: scheduleEntries });
    }
    const occurrences = await schedule.occurrencesForDate(req.parishId, date);
    const times = [...new Set(occurrences.filter((item) => item.type === 'mass').map((item) => item.start))];
    res.json({
      schedule: scheduleEntries,
      times,
      label: schedule.scheduleLabelForDate(date, scheduleEntries),
    });
  } catch (err) {
    return send(res, err);
  }
}

module.exports = {
  listMonth,
  listBlocks,
  listStaffNames,
  checkConflict,
  createBlock,
  assignOccurrence,
  markRecord,
  listRecurring,
  createRecurring,
  updateRecurring,
  removeRecurring,
  listMassTimes,
};
