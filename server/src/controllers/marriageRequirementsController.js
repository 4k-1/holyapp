// Settings → Marriage Requirements (item 5a): the parish's own list. Built-in items can be renamed,
// turned off or given another validity; the parish can add its own. Nothing is deleted, so applications
// that already used an item keep it.

const pool = require('../config/db');
const { writeAudit } = require('../utils/audit');
const { requiredText, optionalText, sendRecordError } = require('../utils/recordFields');
const { CIRCUMSTANCES, CIRCUMSTANCE_KEYS } = require('../constants/marriageRequirements');
const { ensureRequirementTypes, addMissingRows } = require('./marriageApplicationController');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function toItem(row) {
  return {
    id: row.id,
    key: row.template_key || null,
    builtIn: Boolean(row.template_key),
    name: row.requirement_name,
    required: row.is_required,
    active: row.active,
    condition: row.condition || 'always',
    skipWhen: row.skip_when || null,
    validForDays: row.valid_for_days || null,
    note: row.note || '',
    sortOrder: row.sort_order,
  };
}

function parseDays(value) {
  if (value === null || value === '' || value === undefined) return null;
  const days = Number(value);
  if (!Number.isInteger(days) || days < 1 || days > 3650) {
    throw httpError(400, 'Valid for must be a whole number of days, from 1 to 3650, or left blank.');
  }
  return days;
}

function parseCondition(value) {
  const condition = value || 'always';
  if (condition !== 'always' && !CIRCUMSTANCE_KEYS.includes(condition)) throw httpError(400, 'Choose when it applies.');
  return condition;
}

async function listRequirements(req, res) {
  try {
    await ensureRequirementTypes(req.parishId, req.user.id);
    const result = await pool.query(
      'SELECT * FROM marriage_requirement_type WHERE parish_id = $1 ORDER BY sort_order, created_at',
      [req.parishId]
    );
    res.json({ requirements: result.rows.map(toItem), circumstances: CIRCUMSTANCES });
  } catch (err) {
    sendRecordError(res, err);
  }
}

async function addRequirement(req, res) {
  try {
    const name = requiredText(req.body?.name, 'Name');
    if (name.length > 255) throw httpError(400, 'Keep the name under 255 characters.');
    const next = await pool.query(
      'SELECT GREATEST(COALESCE(MAX(sort_order), 0), 990) + 10 AS n FROM marriage_requirement_type WHERE parish_id = $1',
      [req.parishId]
    );
    const inserted = await pool.query(
      `INSERT INTO marriage_requirement_type
         (parish_id, requirement_name, is_required, created_by, condition, valid_for_days, sort_order, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        req.parishId,
        name,
        req.body?.required !== false,
        req.user.id,
        parseCondition(req.body?.condition),
        parseDays(req.body?.validForDays),
        next.rows[0].n,
        optionalText(req.body?.note),
      ]
    );
    await addMissingRows(pool, req.parishId);
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'marriage_requirement.added',
      entityType: 'marriage_requirement_type',
      entityId: inserted.rows[0].id,
      metadata: { name },
    });
    res.status(201).json({ requirement: toItem(inserted.rows[0]) });
  } catch (err) {
    sendRecordError(res, err);
  }
}

async function updateRequirement(req, res) {
  try {
    const found = await pool.query('SELECT * FROM marriage_requirement_type WHERE id = $1 AND parish_id = $2', [
      req.params.id,
      req.parishId,
    ]);
    const row = found.rows[0];
    if (!row) return res.status(404).json({ error: 'Requirement not found.' });
    const body = req.body || {};
    const name = body.name !== undefined ? requiredText(body.name, 'Name') : row.requirement_name;
    if (name.length > 255) throw httpError(400, 'Keep the name under 255 characters.');
    const active = body.active !== undefined ? body.active === true : row.active;
    const required = body.required !== undefined ? body.required === true : row.is_required;
    const days = body.validForDays !== undefined ? parseDays(body.validForDays) : row.valid_for_days;
    const note = body.note !== undefined ? optionalText(body.note) : row.note;
    // A built-in item keeps the question it depends on; the parish's own items can change it.
    const condition =
      body.condition !== undefined && !row.template_key ? parseCondition(body.condition) : row.condition;

    const updated = await pool.query(
      `UPDATE marriage_requirement_type
       SET requirement_name = $1, active = $2, is_required = $3, valid_for_days = $4, note = $5, condition = $6
       WHERE id = $7
       RETURNING *`,
      [name, active, required, days, note, condition, row.id]
    );
    if (active && !row.active) await addMissingRows(pool, req.parishId);
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'marriage_requirement.updated',
      entityType: 'marriage_requirement_type',
      entityId: row.id,
      metadata: { name, active, required, validForDays: days, condition },
    });
    res.json({ requirement: toItem(updated.rows[0]) });
  } catch (err) {
    sendRecordError(res, err);
  }
}

module.exports = { listRequirements, addRequirement, updateRequirement };
