const pool = require('../config/db');
const { writeAudit } = require('../utils/audit');
const { requiredText, optionalText, dateValue, sendRecordError } = require('../utils/recordFields');
const schedule = require('../services/scheduleService');
const { ROLES } = require('../constants/roles');
const massTimes = require('../services/massTimeChanges');

/** Runs `work` in a transaction; rolls back if it throws. */
async function inTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

function send(res, err) {
  return sendRecordError(res, err);
}

/** The regular Mass timetable lives in Settings, so only the parish admin may change it. */
async function assertCanEditRecurring(req, nextType, id) {
  let touchesMass = nextType === 'mass';
  if (id) {
    const current = await pool.query(
      'SELECT event_type FROM parish_recurring_commitment WHERE id = $1 AND parish_id = $2',
      [id, req.parishId]
    );
    if (current.rows[0]?.event_type === 'mass') touchesMass = true;
  }
  if (touchesMass && req.user.role !== ROLES.PARISH_ADMIN) {
    throw schedule.httpError(403, 'Only the parish admin can change the Mass schedule.');
  }
}

function parseBlockInput(body) {
  return {
    title: requiredText(body.title, 'Title'),
    date: dateValue(body.date, 'Date'),
    start: requiredText(body.start, 'Start time'),
    end: requiredText(body.end, 'End time'),
    type: requiredText(body.type, 'Type'),
    source: optionalText(body.source) || 'manual',
    ...schedule.assigneeInput(body),
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
    const conflict = schedule.findConflict(occurrences, start, end, {
      excludeId: optionalText(req.body?.excludeId) || undefined,
      ...schedule.assigneeInput(req.body || {}),
      location: optionalText(req.body?.location) || undefined,
    });
    res.json({ conflict: conflict || null, message: conflict ? schedule.conflictMessage(conflict) : null });
  } catch (err) {
    return send(res, err);
  }
}

async function createBlock(req, res) {
  try {
    const input = parseBlockInput(req.body || {});
    await schedule.assertNoConflict(req.parishId, input);
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

/** Edits an event added by hand. Weddings and other events made by another module change from their source. */
async function updateBlock(req, res) {
  try {
    const current = await pool.query('SELECT id, source FROM event WHERE id = $1 AND parish_id = $2', [
      req.params.id,
      req.parishId,
    ]);
    const row = current.rows[0];
    if (!row) return res.status(404).json({ error: 'Event not found.' });
    if ((row.source || 'manual') !== 'manual') {
      throw schedule.httpError(400, `This event comes from ${row.source}. Change it there instead.`);
    }
    const input = parseBlockInput(req.body || {});
    await schedule.assertNoConflict(req.parishId, { ...input, excludeId: row.id });
    await schedule.updateEvent(req.parishId, row.id, input);
    const block = (await schedule.loadBlocks(req.parishId)).find((item) => item.id === row.id);
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'schedule.event_updated',
      entityType: 'event',
      entityId: row.id,
      metadata: { title: input.title, date: input.date, location: input.location, assignee: block?.assignee || '' },
    });
    res.json({ block });
  } catch (err) {
    return send(res, err);
  }
}

async function assignOccurrence(req, res) {
  try {
    const occurrenceId = requiredText(req.body?.occurrenceId, 'Occurrence');
    const who = schedule.assigneeInput(req.body || {});
    const assignee = await schedule.assignOccurrence(req.parishId, occurrenceId, who);
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'schedule.assigned',
      entityType: 'event',
      entityId: occurrenceId,
      metadata: { assignee, assigneeId: who.assigneeId },
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
    ...schedule.assigneeInput(body),
    showOnOverview: body.showOnOverview !== false,
  };
}

async function createRecurring(req, res) {
  try {
    const input = parseRecurring(req.body || {});
    await assertCanEditRecurring(req, input.type);
    await schedule.checkAssignee(req.parishId, input);
    const inserted = await pool.query(
      `INSERT INTO parish_recurring_commitment
         (parish_id, label, event_type, days, slots, assigned_to, assignee, show_on_overview, created_by)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)
       RETURNING id`,
      [
        req.parishId,
        input.label,
        input.type,
        input.days,
        JSON.stringify(input.slots),
        input.assigneeId,
        input.assignee,
        input.showOnOverview,
        req.user.id,
      ]
    );
    res.status(201).json({ commitment: await schedule.loadCommitment(req.parishId, inserted.rows[0].id) });
  } catch (err) {
    return send(res, err);
  }
}

async function updateRecurring(req, res) {
  try {
    const input = parseRecurring(req.body || {});
    await assertCanEditRecurring(req, input.type, req.params.id);
    await schedule.checkAssignee(req.parishId, input);
    const before = await schedule.loadRecurring(req.parishId);
    if (!before.some((c) => c.id === req.params.id)) return res.status(404).json({ error: 'Commitment not found.' });
    // Intentions on a Mass time this edit takes away move with it, or staff say where they go.
    const after = before.map((c) =>
      c.id === req.params.id ? { ...c, type: input.type, days: input.days, slots: input.slots } : c
    );
    const plan = await inTransaction(async (client) => {
      const moves = await massTimes.planIntentionMoves(
        client,
        req.parishId,
        before,
        after,
        massTimes.movesFrom(req.body)
      );
      await client.query(
        `UPDATE parish_recurring_commitment
         SET label = $1, event_type = $2, days = $3, slots = $4::jsonb,
             assigned_to = $5, assignee = $6, show_on_overview = $7, updated_at = NOW()
         WHERE id = $8 AND parish_id = $9
         RETURNING id`,
        [
          input.label,
          input.type,
          input.days,
          JSON.stringify(input.slots),
          input.assigneeId,
          input.assignee,
          input.showOnOverview,
          req.params.id,
          req.parishId,
        ]
      );
      await massTimes.applyIntentionMoves(client, moves);
      return moves;
    });
    await massTimes.announceIntentionMoves({
      parishId: req.parishId,
      actorId: req.user.id,
      commitmentId: req.params.id,
      label: input.label,
      plan,
    });
    res.json({ commitment: await schedule.loadCommitment(req.parishId, req.params.id), movedIntentions: plan.length });
  } catch (err) {
    return send(res, err);
  }
}

async function removeRecurring(req, res) {
  try {
    await assertCanEditRecurring(req, null, req.params.id);
    const before = await schedule.loadRecurring(req.parishId);
    const removed = before.find((c) => c.id === req.params.id);
    if (!removed) return res.status(404).json({ error: 'Commitment not found.' });
    const after = before.filter((c) => c.id !== req.params.id);
    const plan = await inTransaction(async (client) => {
      const moves = await massTimes.planIntentionMoves(
        client,
        req.parishId,
        before,
        after,
        massTimes.movesFrom(req.body)
      );
      await client.query(`DELETE FROM parish_recurring_commitment WHERE id = $1 AND parish_id = $2`, [
        req.params.id,
        req.parishId,
      ]);
      await client.query(
        `DELETE FROM parish_schedule_override
         WHERE parish_id = $1 AND occurrence_id LIKE $2`,
        [req.parishId, `${req.params.id}-%`]
      );
      await massTimes.applyIntentionMoves(client, moves);
      return moves;
    });
    await massTimes.announceIntentionMoves({
      parishId: req.parishId,
      actorId: req.user.id,
      commitmentId: req.params.id,
      label: removed.label,
      plan,
    });
    res.json({ ok: true, movedIntentions: plan.length });
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
  updateBlock,
  assignOccurrence,
  markRecord,
  listRecurring,
  createRecurring,
  updateRecurring,
  removeRecurring,
  listMassTimes,
};
