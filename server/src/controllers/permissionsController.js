const pool = require('../config/db');
const { ROLES } = require('../constants/roles');
const { writeAudit } = require('../utils/audit');

const MANAGEABLE_ROLES = [ROLES.PARISH_ADMIN, ROLES.PARISH_STAFF, ROLES.PARISHIONER];
const LOCKED_PERMISSION = 'manage_role_permissions';

function emptyMatrix() {
  return {
    [ROLES.PARISH_ADMIN]: {},
    [ROLES.PARISH_STAFF]: {},
    [ROLES.PARISHIONER]: {},
  };
}

async function listPermissions(req, res) {
  try {
    const permissions = await pool.query(
      `SELECT key, label, description, sort_order
       FROM permission
       ORDER BY sort_order ASC, label ASC`
    );
    const assignments = await pool.query(
      `SELECT role, permission_key, allowed
       FROM role_permission
       WHERE role = ANY($1::user_role[])`,
      [MANAGEABLE_ROLES]
    );

    const matrix = emptyMatrix();
    for (const perm of permissions.rows) {
      for (const role of MANAGEABLE_ROLES) {
        matrix[role][perm.key] = false;
      }
    }
    for (const row of assignments.rows) {
      if (matrix[row.role]) {
        matrix[row.role][row.permission_key] = row.allowed === true;
      }
    }

    res.json({
      roles: MANAGEABLE_ROLES,
      permissions: permissions.rows,
      matrix,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updatePermissions(req, res) {
  const assignments = Array.isArray(req.body.assignments) ? req.body.assignments : null;
  if (!assignments) {
    return res.status(400).json({ error: 'assignments array is required' });
  }

  try {
    const validKeys = await pool.query('SELECT key FROM permission');
    const keys = new Set(validKeys.rows.map((row) => row.key));

    for (const item of assignments) {
      const role = item.role;
      const permissionKey = item.permission_key || item.permissionKey;
      const allowed = Boolean(item.allowed);

      if (!MANAGEABLE_ROLES.includes(role)) {
        return res.status(400).json({ error: 'Only parish admin, parish staff, and parishioner permissions can be changed.' });
      }
      if (!keys.has(permissionKey)) {
        return res.status(400).json({ error: `Unknown permission: ${permissionKey}` });
      }
      if (permissionKey === LOCKED_PERMISSION && allowed) {
        return res.status(400).json({
          error: 'Role permission management stays with the platform super admin.',
        });
      }

      await pool.query(
        `INSERT INTO role_permission (role, permission_key, allowed)
         VALUES ($1, $2, $3)
         ON CONFLICT (role, permission_key)
         DO UPDATE SET allowed = EXCLUDED.allowed`,
        [role, permissionKey, allowed]
      );
    }

    await writeAudit({
      parishId: null,
      actorId: req.user.id,
      action: 'rbac.permissions_updated',
      entityType: 'role_permission',
      entityId: req.user.id,
      metadata: { count: assignments.length },
    });

    return listPermissions(req, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { listPermissions, updatePermissions };
