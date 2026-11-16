const pool = require('../config/db');
const { ROLES } = require('../constants/roles');
const crypto = require('crypto');
const { hashPassword } = require('../utils/password');
const { sendSetPasswordLink } = require('../utils/setPasswordLink');
const { writeAudit } = require('../utils/audit');
const { notifyStaffRoleChange } = require('../utils/notify');
const { revokeUserSessions } = require('../utils/sessions');
const { FULL_ACCESS, normalizeAccess, parseAccessInput } = require('../constants/staffAccess');

const { rankForHonorific, splitHonorific, formatPersonName, cleanPersonnelTitle } = require('../constants/personnelRoles');
const { assertCanBeParishPriest } = require('../utils/personnel');


function displayName(row) {
  if (row.personnel_name) {
    return formatPersonName({ honorific: row.honorific, name: row.personnel_name, postNominals: row.post_nominals });
  }
  return [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(' ') || row.email;
}

/** Their title on the Personnel list, listed or typed; "Admin Staff" / "Staff" only when they have none. */
function jobTitle(row) {
  if (row.role_title) return row.role_title;
  return row.role === ROLES.PARISH_ADMIN ? 'Admin Staff' : 'Staff';
}

/** The title sent with an account: a listed or typed one, or "Admin Staff" when none is sent. */
function accountTitle(value) {
  if (value === undefined || value === null || String(value).trim() === '') return { title: 'Admin Staff' };
  return cleanPersonnelTitle(value);
}

function toStaff(row) {
  return {
    id: row.id,
    name: displayName(row),
    role: jobTitle(row),
    email: row.email,
    status: row.status === 'active' ? 'Active' : 'Inactive',
    accessRole: row.role === ROLES.PARISH_ADMIN ? 'admin' : 'staff',
    personnelId: row.personnel_id || null,
    // E1: what this sign-in can open. Admins always have every area.
    areaAccess: row.role === ROLES.PARISH_STAFF ? normalizeAccess(row.staff_access) : { ...FULL_ACCESS },
  };
}

/**
 * The area access sent with a create or update. Admins don't keep one (they have every area), so it's null.
 * Returns undefined when it was sent but isn't a complete, valid map; null when nothing was sent.
 */
function readAreaAccess(body, accessRole) {
  if (accessRole === 'admin') return null;
  if (body.areaAccess == null) return null;
  return parseAccessInput(body.areaAccess) || undefined;
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
    `SELECT u.id, u.email, u.role, u.status, u.first_name, u.middle_name, u.last_name, u.staff_access,
            p.full_name AS personnel_name, p.role_title, p.id AS personnel_id, p.honorific, p.post_nominals
     FROM app_user u
     LEFT JOIN parish_personnel p ON p.user_id = u.id
     WHERE u.id = $1
       AND u.parish_id = $2
       AND u.role IN ('parish_admin', 'parish_staff')`,
    [userId, parishId]
  );
  return result.rows[0] || null;
}

/**
 * Keeps the Staff list in step with the account. The name's honorific ("Fr.") is kept apart; the
 * account's title becomes the person's primary title, and their other titles stay as they are.
 */
async function upsertPersonnel({ parishId, userId, fullName, roleTitle, status }) {
  const existing = await pool.query(
    'SELECT id, honorific, role_title FROM parish_personnel WHERE user_id = $1',
    [userId]
  );
  const personnelStatus = status === 'active' ? 'active' : 'inactive';
  const typed = splitHonorific(fullName);
  const person = existing.rows[0];
  const honorific = typed.honorific || person?.honorific || null;
  if (roleTitle === 'Parish Priest') {
    await assertCanBeParishPriest(pool, { parishId, personId: person ? person.id : null, honorific, status: personnelStatus });
  }
  if (person) {
    await pool.query(
      `UPDATE parish_personnel
       SET full_name = $1, role_title = $2::varchar, status = $3, honorific = $5, clergy_rank = $6,
           role_scope = CASE WHEN role_title = $2::varchar THEN role_scope END, updated_at = NOW()
       WHERE user_id = $4`,
      [typed.name, roleTitle, personnelStatus, userId, honorific, rankForHonorific(honorific)]
    );
    return;
  }
  await pool.query(
    `INSERT INTO parish_personnel (parish_id, full_name, role_title, contact_info, user_id, status, honorific, clergy_rank)
     VALUES ($1, $2, $3, NULL, $4, $5, $6, $7)`,
    [parishId, typed.name, roleTitle, userId, personnelStatus, typed.honorific, rankForHonorific(typed.honorific)]
  );
}

async function parishName(parishId) {
  const { rows } = await pool.query('SELECT name FROM parish WHERE id = $1', [parishId]);
  return rows[0] ? rows[0].name : 'Your parish';
}

/** Emails an office account a link to set its own password (POST /staff/:id/sign-in-link). Admins only. */
async function sendSignInLink(req, res) {
  try {
    const account = await loadOfficeUser(req.parishId, req.params.id);
    if (!account) return res.status(404).json({ error: 'Staff account not found.' });
    if (account.status !== 'active') {
      return res.status(400).json({ error: 'Reactivate this account before sending a sign-in link.' });
    }
    await sendSetPasswordLink(account, { parishName: await parishName(req.parishId), invited: false });
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'app_user.sign_in_link_sent',
      entityType: 'app_user',
      entityId: account.id,
      metadata: { email: account.email },
    });
    res.json({ ok: true, email: account.email });
  } catch (err) {
    const mail = err.code === 'MAIL_NOT_CONFIGURED' || err.code === 'MAIL_SEND_FAILED';
    res.status(mail ? 503 : err.status || 500).json({ error: mail ? "Couldn't send the email. Try again in a moment." : err.message });
  }
}

async function listStaff(req, res) {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.role, u.status, u.first_name, u.middle_name, u.last_name, u.staff_access,
              p.full_name AS personnel_name, p.role_title, p.honorific, p.post_nominals, p.id AS personnel_id
       FROM app_user u
       LEFT JOIN parish_personnel p ON p.user_id = u.id
       WHERE u.parish_id = $1
         AND u.role IN ('parish_admin', 'parish_staff')
       ORDER BY u.created_at ASC`,
      [req.parishId]
    );
    res.json({ staff: result.rows.map(toStaff) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

/**
 * Creates a sign-in. With `personnelId` the account is attached to someone already on the Staff list, who keeps
 * their name, role and schedule; without it a new person is added to the list along with the account.
 */
async function createStaff(req, res) {
  let name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const sentTitle = accountTitle(req.body.role);
  if (sentTitle.error) return res.status(400).json({ error: sentTitle.error });
  let roleTitle = sentTitle.title;
  const accessRole = req.body.accessRole === 'admin' ? 'admin' : 'staff';
  const personnelId = req.body.personnelId ? String(req.body.personnelId) : null;
  const areaAccess = readAreaAccess(req.body, accessRole);
  if (areaAccess === undefined) {
    return res.status(400).json({ error: 'Choose Off, View or Manage for every area.' });
  }

  try {
    let person = null;
    if (personnelId) {
      const found = await pool.query(
        'SELECT id, full_name, honorific, role_title, user_id FROM parish_personnel WHERE id = $1 AND parish_id = $2',
        [personnelId, req.parishId]
      );
      person = found.rows[0];
      if (!person) return res.status(404).json({ error: 'That person is not on the Staff list.' });
      if (person.user_id) return res.status(409).json({ error: `${person.full_name} already has a sign-in.` });
      name = person.full_name;
      roleTitle = person.role_title;
    }

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }
    const taken = await pool.query('SELECT id FROM app_user WHERE lower(email) = $1', [email]);
    if (taken.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Check the one-Parish-Priest rule before anything is saved.
    if (roleTitle === 'Parish Priest') {
      await assertCanBeParishPriest(pool, {
        parishId: req.parishId,
        personId: person ? person.id : null,
        honorific: splitHonorific(name).honorific || person?.honorific,
        status: 'active',
      });
    }
    const { firstName, lastName } = splitName(splitHonorific(name).name);
    // No one knows this password: the person sets their own from the emailed link.
    const passwordHash = await hashPassword(crypto.randomBytes(32).toString('base64url'));
    const userRole = accessToRole(accessRole);
    const inserted = await pool.query(
      `INSERT INTO app_user (
         parish_id, role, first_name, last_name, email, password_hash, status, email_verified_at, staff_access
       )
       VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW(), $7)
       RETURNING id, email, role, status, first_name, last_name`,
      [req.parishId, userRole, firstName, lastName, email, passwordHash, areaAccess]
    );
    const user = inserted.rows[0];
    if (person) {
      await pool.query(
        `UPDATE parish_personnel SET user_id = $1, status = 'active', updated_at = NOW() WHERE id = $2`,
        [user.id, person.id]
      );
    } else {
      await upsertPersonnel({
        parishId: req.parishId,
        userId: user.id,
        fullName: name,
        roleTitle,
        status: 'active',
      });
    }
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'app_user.created',
      entityType: 'app_user',
      entityId: user.id,
      metadata: { role: userRole, email, linkedPersonnelId: person ? person.id : null, areaAccess },
    });

    const loaded = await loadOfficeUser(req.parishId, user.id);
    // The account stays even if the email fails; the admin can send the link again from the account's menu.
    let inviteSent = true;
    try {
      await sendSetPasswordLink(user, { parishName: await parishName(req.parishId), invited: true });
    } catch (err) {
      console.error('[staff] invitation email failed:', err.message);
      inviteSent = false;
    }
    res.status(201).json({ staff: toStaff(loaded), inviteSent });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

async function updateStaff(req, res) {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const sentTitle = accountTitle(req.body.role);
  if (sentTitle.error) return res.status(400).json({ error: sentTitle.error });
  const roleTitle = sentTitle.title;
  const accessRole = req.body.accessRole === 'admin' ? 'admin' : 'staff';
  const sentAccess = readAreaAccess(req.body, accessRole);

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required.' });
  }
  if (sentAccess === undefined) {
    return res.status(400).json({ error: 'Choose Off, View or Manage for every area.' });
  }

  try {
    const current = await loadOfficeUser(req.parishId, req.params.id);
    if (!current) {
      return res.status(404).json({ error: 'Staff account not found.' });
    }
    // Leaving areaAccess out keeps what they have; becoming an admin clears it (admins have every area).
    const nextAccess =
      accessRole === 'admin' ? null : req.body.areaAccess == null ? current.staff_access : sentAccess;
    const areasChanged =
      accessRole === 'staff' &&
      JSON.stringify(normalizeAccess(current.staff_access)) !== JSON.stringify(normalizeAccess(nextAccess));

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

    if (roleTitle === 'Parish Priest') {
      await assertCanBeParishPriest(pool, {
        parishId: req.parishId,
        personId: current.personnel_id,
        honorific: splitHonorific(name).honorific || current.honorific,
        status: current.status,
      });
    }
    const { firstName, lastName } = splitName(splitHonorific(name).name);
    const nextRole = accessToRole(accessRole);
    await pool.query(
      `UPDATE app_user
       SET first_name = $1, last_name = $2, email = $3, role = $4, staff_access = $6, updated_at = NOW()
       WHERE id = $5`,
      [firstName, lastName, email, nextRole, current.id, nextAccess]
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
      metadata: areasChanged
        ? { role: nextRole, email, areaAccess: { from: normalizeAccess(current.staff_access), to: normalizeAccess(nextAccess) } }
        : { role: nextRole, email },
    });

    const accessChanged = current.role !== nextRole;
    if (accessChanged) {
      await revokeUserSessions(current.id);
    }
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
    res.status(err.status || 500).json({ error: err.message });
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
    if (nextStatus === 'suspended') {
      await pool.query('UPDATE refresh_token SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL', [current.id]);
    }
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
    res.status(err.status || 500).json({ error: err.message });
  }
}

module.exports = { listStaff, createStaff, updateStaff, setStaffStatus, sendSignInLink };
