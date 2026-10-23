const pool = require('../config/db');
const { writeAudit } = require('../utils/audit');
const { requiredText, optionalText, sendRecordError } = require('../utils/recordFields');
const { PERSONNEL_ROLES, isClergy } = require('../constants/personnelRoles');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function toPerson(row) {
  return {
    id: row.id,
    name: row.full_name,
    role: row.role_title,
    clergy: isClergy(row.role_title),
    contact: row.contact_info || '',
    status: row.status,
    hasAccount: Boolean(row.user_id),
  };
}

function parseRole(value) {
  const role = requiredText(value, 'Role');
  if (!PERSONNEL_ROLES.includes(role)) throw httpError(400, 'Role is not valid.');
  return role;
}

/** Everyone who serves the parish: priests and staff, with or without a sign-in account. */
async function listPersonnel(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, full_name, role_title, contact_info, status, user_id
       FROM parish_personnel
       WHERE parish_id = $1
       ORDER BY status, full_name`,
      [req.parishId]
    );
    res.json({ personnel: result.rows.map(toPerson), roles: PERSONNEL_ROLES });
  } catch (err) {
    sendRecordError(res, err);
  }
}

async function createPerson(req, res) {
  try {
    const name = requiredText(req.body?.name, 'Name');
    const role = parseRole(req.body?.role);
    const inserted = await pool.query(
      `INSERT INTO parish_personnel (parish_id, full_name, role_title, contact_info, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING *`,
      [req.parishId, name, role, optionalText(req.body?.contact)]
    );
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'personnel.added',
      entityType: 'parish_personnel',
      entityId: inserted.rows[0].id,
      metadata: { name, role },
    });
    res.status(201).json({ person: toPerson(inserted.rows[0]) });
  } catch (err) {
    sendRecordError(res, err);
  }
}

/**
 * Name and status of people with an account follow their staff account, so only their role and contact change
 * here. People without an account can be renamed and set inactive.
 */
async function updatePerson(req, res) {
  try {
    const current = await pool.query('SELECT * FROM parish_personnel WHERE id = $1 AND parish_id = $2', [
      req.params.id,
      req.parishId,
    ]);
    const row = current.rows[0];
    if (!row) return res.status(404).json({ error: 'Person not found.' });

    const role = parseRole(req.body?.role ?? row.role_title);
    const contact = req.body?.contact !== undefined ? optionalText(req.body.contact) : row.contact_info;
    let name = row.full_name;
    let status = row.status;
    if (!row.user_id) {
      if (req.body?.name !== undefined) name = requiredText(req.body.name, 'Name');
      if (req.body?.status !== undefined) {
        if (!['active', 'inactive'].includes(req.body.status)) throw httpError(400, 'Status is not valid.');
        status = req.body.status;
      }
    } else if (req.body?.status !== undefined && req.body.status !== row.status) {
      throw httpError(400, 'This person has a staff account. Change their status under Staff accounts.');
    }

    const updated = await pool.query(
      `UPDATE parish_personnel
       SET full_name = $1, role_title = $2, contact_info = $3, status = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [name, role, contact, status, row.id]
    );
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'personnel.updated',
      entityType: 'parish_personnel',
      entityId: row.id,
      metadata: { name, role, status },
    });
    res.json({ person: toPerson(updated.rows[0]) });
  } catch (err) {
    sendRecordError(res, err);
  }
}

/**
 * Removes someone without a staff account. Events they were assigned to keep their name as text, so past
 * schedules still show who served; only the link to this row is cleared.
 */
async function removePerson(req, res) {
  const client = await pool.connect();
  try {
    const current = await client.query('SELECT * FROM parish_personnel WHERE id = $1 AND parish_id = $2', [
      req.params.id,
      req.parishId,
    ]);
    const row = current.rows[0];
    if (!row) return res.status(404).json({ error: 'Person not found.' });
    if (row.user_id) {
      throw httpError(400, 'This person has a staff account. Deactivate it under Settings → Staff Accounts instead.');
    }
    await client.query('BEGIN');
    await client.query('UPDATE event SET assigned_to = NULL WHERE assigned_to = $1', [row.id]);
    await client.query('DELETE FROM parish_personnel WHERE id = $1', [row.id]);
    await client.query('COMMIT');
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'personnel.removed',
      entityType: 'parish_personnel',
      entityId: row.id,
      metadata: { name: row.full_name, role: row.role_title },
    });
    res.json({ ok: true });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // nothing to roll back
    }
    sendRecordError(res, err);
  } finally {
    client.release();
  }
}

module.exports = { listPersonnel, createPerson, updatePerson, removePerson };
