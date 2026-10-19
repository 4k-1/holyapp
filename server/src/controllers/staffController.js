const pool = require('../config/db');
const { ROLES } = require('../constants/roles');
const { hashPassword } = require('../utils/password');
const { writeAudit } = require('../utils/audit');
const { notifyStaffRoleChange } = require('../utils/notify');

const JOB_TITLES = new Set(['Priest', 'Parish Secretary', 'Admin Staff']);
const DEV_PASSWORD = 'password123';

function displayName(row) {
  if (row.personnel_name) return row.personnel_name;
  return [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(' ') || row.email;
}

function jobTitle(row) {
  if (JOB_TITLES.has(row.role_title)) return row.role_title;
  return row.role === ROLES.PARISH_ADMIN ? 'Admin Staff' : 'Priest';
}

function toStaff(row) {
  return {
    id: row.id,
    name: displayName(row),
    role: jobTitle(row),
    email: row.email,
    status: row.status === 'active' ? 'Active' : 'Inactive',
    accessRole: row.role === ROLES.PARISH_ADMIN ? 'admin' : 'staff',
  };
}

function splitName(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return { firstName: 'Staff', lastName: 'Member' };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function accessToRole(accessRole) {
  return accessRole === 'admin' ? ROLES.PARISH_ADMIN : ROLES.PARISH_STAFF;
}

async function loadOfficeUser(parishId, userId) {
  const result = await pool.query(
    `SELECT u.id, u.email, u.role, u.status, u.first_name, u.middle_name, u.last_name,
            p.full_name AS personnel_name, p.role_title, p.id AS personnel_id
     FROM app_user u
     LEFT JOIN parish_personnel p ON p.user_id = u.id
     WHERE u.id = $1
       AND u.parish_id = $2
       AND u.role IN ('parish_admin', 'parish_staff')`,
    [userId, parishId]
  );
  return result.rows[0] || null;
}

async function upsertPersonnel({ parishId, userId, fullName, roleTitle, status }) {
  const existing = await pool.query(
    'SELECT id FROM parish_personnel WHERE user_id = $1',
    [userId]
  );
  const personnelStatus = status === 'active' ? 'active' : 'inactive';
  if (existing.rows.length > 0) {
    await pool.query(
      `UPDATE parish_personnel
       SET full_name = $1, role_title = $2, status = $3, updated_at = NOW()
       WHERE user_id = $4`,
      [fullName, roleTitle, personnelStatus, userId]
    );
    return;
  }
  await pool.query(
    `INSERT INTO parish_personnel (parish_id, full_name, role_title, contact_info, user_id, status)
     VALUES ($1, $2, $3, NULL, $4, $5)`,
    [parishId, fullName, roleTitle, userId, personnelStatus]
  );
}

async function listStaff(req, res) {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.role, u.status, u.first_name, u.middle_name, u.last_name,
              p.full_name AS personnel_name, p.role_title
       FROM app_user u
       LEFT JOIN parish_personnel p ON p.user_id = u.id
       WHERE u.parish_id = $1
         AND u.role IN ('parish_admin', 'parish_staff')
       ORDER BY u.created_at ASC`,
      [req.parishId]
    );
    res.json({ staff: result.rows.map(toStaff) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createStaff(req, res) {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const roleTitle = JOB_TITLES.has(req.body.role) ? req.body.role : 'Admin Staff';
  const accessRole = req.body.accessRole === 'admin' ? 'admin' : 'staff';

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  try {
    const taken = await pool.query('SELECT id FROM app_user WHERE lower(email) = $1', [email]);
    if (taken.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const { firstName, lastName } = splitName(name);
    const passwordHash = await hashPassword(DEV_PASSWORD);
    const userRole = accessToRole(accessRole);
    const inserted = await pool.query(
      `INSERT INTO app_user (
         parish_id, role, first_name, last_name, email, password_hash, status, email_verified_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW())
       RETURNING id, email, role, status, first_name, last_name`,
      [req.parishId, userRole, firstName, lastName, email, passwordHash]
    );
    const user = inserted.rows[0];
    await upsertPersonnel({
      parishId: req.parishId,
      userId: user.id,
      fullName: name,
      roleTitle,
      status: 'active',
    });
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'app_user.created',
      entityType: 'app_user',
      entityId: user.id,
      metadata: { role: userRole, email },
    });

    const loaded = await loadOfficeUser(req.parishId, user.id);
    res.status(201).json({ staff: toStaff(loaded) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateStaff(req, res) {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const roleTitle = JOB_TITLES.has(req.body.role) ? req.body.role : 'Admin Staff';
  const accessRole = req.body.accessRole === 'admin' ? 'admin' : 'staff';

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }

  try {
    const current = await loadOfficeUser(req.parishId, req.params.id);
    if (!current) {
      return res.status(404).json({ error: 'Staff account not found.' });
    }

    if (current.id === req.user.id && current.role === ROLES.PARISH_ADMIN && accessRole !== 'admin') {
      return res.status(400).json({ error: "You can't remove your own admin access." });
    }

    const taken = await pool.query(
      'SELECT id FROM app_user WHERE lower(email) = $1 AND id <> $2',
      [email, current.id]
    );
    if (taken.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const { firstName, lastName } = splitName(name);
    const nextRole = accessToRole(accessRole);
    await pool.query(
      `UPDATE app_user
       SET first_name = $1, last_name = $2, email = $3, role = $4, updated_at = NOW()
       WHERE id = $5`,
      [firstName, lastName, email, nextRole, current.id]
    );
    await upsertPersonnel({
      parishId: req.parishId,
      userId: current.id,
      fullName: name,
      roleTitle,
      status: current.status,
    });
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'app_user.updated',
      entityType: 'app_user',
      entityId: current.id,
      metadata: { role: nextRole, email },
    });

    const accessChanged = current.role !== nextRole;
    const titleChanged = jobTitle(current) !== roleTitle;
    if (accessChanged || titleChanged) {
      const actor = await pool.query(
        'SELECT first_name, last_name FROM app_user WHERE id = $1',
        [req.user.id]
      );
      const actorRow = actor.rows[0];
      const actorName = actorRow
        ? [actorRow.first_name, actorRow.last_name].filter(Boolean).join(' ')
        : 'A parish admin';
      await notifyStaffRoleChange({
        parishId: req.parishId,
        actorId: req.user.id,
        actorName: actorName || 'A parish admin',
        staffId: current.id,
        staffName: name,
        accessChanged,
        fromAccess: current.role === ROLES.PARISH_ADMIN ? 'admin access' : 'staff access',
        toAccess: accessRole === 'admin' ? 'admin access' : 'staff access',
        titleChanged,
        fromTitle: jobTitle(current),
        toTitle: roleTitle,
      });
    }

    const loaded = await loadOfficeUser(req.parishId, current.id);
    res.json({ staff: toStaff(loaded) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function setStaffStatus(req, res) {
  const nextStatus = req.body.status === 'Inactive' ? 'suspended' : 'active';

  try {
    const current = await loadOfficeUser(req.parishId, req.params.id);
    if (!current) {
      return res.status(404).json({ error: 'Staff account not found.' });
    }
    if (current.id === req.user.id && nextStatus === 'suspended') {
      return res.status(400).json({ error: "You can't deactivate your own account." });
    }

    await pool.query(
      `UPDATE app_user SET status = $1, updated_at = NOW() WHERE id = $2`,
      [nextStatus, current.id]
    );
    await upsertPersonnel({
      parishId: req.parishId,
      userId: current.id,
      fullName: displayName(current),
      roleTitle: jobTitle(current),
      status: nextStatus,
    });
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: nextStatus === 'suspended' ? 'app_user.suspended' : 'app_user.reactivated',
      entityType: 'app_user',
      entityId: current.id,
      metadata: { email: current.email },
    });

    const loaded = await loadOfficeUser(req.parishId, current.id);
    res.json({ staff: toStaff(loaded) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { listStaff, createStaff, updateStaff, setStaffStatus };
