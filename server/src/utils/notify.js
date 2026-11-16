const pool = require('../config/db');
const { allows } = require('../constants/staffAccess');

async function createNotification({ parishId, recipientId, kind, title, body, href }) {
  if (!parishId || !recipientId || !title || !body) return;
  try {
    await pool.query(
      `INSERT INTO app_notification (parish_id, recipient_id, kind, title, body, href)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [parishId, recipientId, kind || 'staff', title, body, href || 'notifications']
    );
  } catch (err) {
    console.error('createNotification failed:', err.message);
  }
}

/**
 * Notifies the parish office about something in one area (e.g. 'certificates'): every active admin, and every
 * active staff member allowed at least to view that area. Never throws: a notification must not undo the action.
 */
async function notifyOfficeArea(parishId, area, { kind, title, body, href }) {
  try {
    const { rows } = await pool.query(
      `SELECT id, role, staff_access FROM app_user
       WHERE parish_id = $1 AND role IN ('parish_admin', 'parish_staff') AND status = 'active'`,
      [parishId]
    );
    for (const user of rows) {
      if (user.role === 'parish_staff' && !allows(user.staff_access, area, 'view')) continue;
      await createNotification({ parishId, recipientId: user.id, kind, title, body, href });
    }
  } catch (err) {
    console.error(`notifyOfficeArea(${area}) failed:`, err.message);
  }
}

async function notifyStaffRoleChange({
  parishId,
  actorId,
  actorName,
  staffId,
  staffName,
  accessChanged,
  fromAccess,
  toAccess,
  titleChanged,
  fromTitle,
  toTitle,
}) {
  if (!accessChanged && !titleChanged) return;

  const actor = actorName || 'A parish admin';
  const subject = staffName || 'a staff account';
  const parts = [];
  if (accessChanged) {
    parts.push(`access from ${fromAccess} to ${toAccess}`);
  }
  if (titleChanged) {
    parts.push(`role from ${fromTitle} to ${toTitle}`);
  }
  const change = parts.join(' and ');
  const forSubject = `${actor} changed your ${change}.`;
  const forAdmins = `${actor} changed ${subject}'s ${change}.`;


  await createNotification({
    parishId,
    recipientId: staffId,
    kind: 'staff',
    title: 'Your account role was updated',
    body: forSubject,
    href: 'settings/personal',
  });

  try {
    const admins = await pool.query(
      `SELECT id FROM app_user
       WHERE parish_id = $1
         AND role = 'parish_admin'
         AND status = 'active'
         AND id <> $2
         AND id <> $3`,
      [parishId, actorId, staffId]
    );
    for (const row of admins.rows) {
      await createNotification({
        parishId,
        recipientId: row.id,
        kind: 'staff',
        title: 'Staff role changed',
        body: forAdmins,
        href: 'settings/staff',
      });
    }
  } catch (err) {
    console.error('notifyStaffRoleChange admins failed:', err.message);
  }

  if (actorId && actorId !== staffId) {
    await createNotification({
      parishId,
      recipientId: actorId,
      kind: 'staff',
      title: 'Staff role changed',
      body: forAdmins,
      href: 'settings/staff',
    });
  }
}

module.exports = { createNotification, notifyOfficeArea, notifyStaffRoleChange };
