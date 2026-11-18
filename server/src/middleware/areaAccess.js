const pool = require('../config/db');
const { ROLES } = require('../constants/roles');
const { AREAS, allows } = require('../constants/staffAccess');

const LABELS = Object.fromEntries(AREAS.map((a) => [a.key, a.label]));

async function loadStaffAccess(req) {
  if (req.staffAccess === undefined) {
    const result = await pool.query('SELECT staff_access FROM app_user WHERE id = $1', [req.user.id]);
    req.staffAccess = result.rows[0] ? result.rows[0].staff_access : null;
  }
  return req.staffAccess;
}

/**
 * E1: checks a staff sign-in's access to one area. Admins, super admins and parishioners pass through;
 * their own route rules already decide what they can do.
 *
 * `level` defaults by method: reads need View, anything that changes data needs Manage.
 */
function requireArea(area, level) {
  if (!LABELS[area]) throw new Error(`Unknown access area: ${area}`);

  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (req.user.role !== ROLES.PARISH_STAFF) return next();

    const needed = level || (req.method === 'GET' || req.method === 'HEAD' ? 'view' : 'manage');
    try {
      const access = await loadStaffAccess(req);
      if (allows(access, area, needed)) return next();
      return res.status(403).json({
        error:
          needed === 'manage'
            ? `You can view ${LABELS[area]} but not change it. Ask your parish admin for Manage access.`
            : `You don't have access to ${LABELS[area]}. Ask your parish admin.`,
        area,
        required_level: needed,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  };
}

/**
 * Like requireArea, but a staff sign-in passes with any one of several areas, e.g. a certificate copy
 * can be printed by someone with Manage on Certificates OR View on Registers (who can issue it from
 * the record). `options` is a list of [area, level]; the refusal names the first option.
 */
function requireAnyArea(...options) {
  for (const [area] of options) if (!LABELS[area]) throw new Error(`Unknown access area: ${area}`);

  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (req.user.role !== ROLES.PARISH_STAFF) return next();
    try {
      const access = await loadStaffAccess(req);
      if (options.some(([area, level]) => allows(access, area, level))) return next();
      const [area, level] = options[0];
      return res.status(403).json({
        error: `You don't have access to this. Ask your parish admin for ${level === 'manage' ? 'Manage' : 'View'} access to ${LABELS[area]}.`,
        area,
        required_level: level,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  };
}

module.exports = { requireArea, requireAnyArea };
