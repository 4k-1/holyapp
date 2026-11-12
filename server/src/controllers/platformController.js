const pool = require('../config/db');
const { ROLES } = require('../constants/roles');
const { hashPassword } = require('../utils/password');
const { writeAudit } = require('../utils/audit');
const { fetchAuditEntries } = require('./auditController');

const OFFICE = new Set([ROLES.PARISH_ADMIN, ROLES.PARISH_STAFF]);
const ACCOUNT_ROLES = new Set([ROLES.PARISH_ADMIN, ROLES.PARISH_STAFF, ROLES.PARISHIONER]);

function slugify(name) {
  return (
    String(name)
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'parish'
  );
}

function dateOnly(value) {
  if (!value) return undefined;
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function splitName(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return { firstName: 'User', lastName: 'Account' };
  if (parts.length === 1) return { firstName: parts[0], lastName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let pass = '';
  for (let i = 0; i < 10; i += 1) pass += chars[Math.floor(Math.random() * chars.length)];
  return pass;
}

function toParish(row) {
  return {
    id: row.id,
    slug: row.slug || slugify(row.name),
    name: row.name,
    address: row.address || '',
    contact: row.contact || '',
    email: row.email || '',
    sealUrl: row.seal_url || undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : '',
  };
}

function toUser(row) {
  const firstName = row.first_name || undefined;
  const middleName = row.middle_name || undefined;
  const lastName = row.last_name || undefined;
  const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ') || row.email;
  return {
    id: row.id,
    parishId: row.parish_id,
    role: row.role,
    status: row.status === 'active' ? 'active' : 'suspended',
    fullName,
    email: row.email,
    firstName,
    middleName,
    lastName,
    contactNumber: row.contact_number || undefined,
    emailVerifiedAt: row.email_verified_at ? new Date(row.email_verified_at).toISOString() : undefined,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    birthday: dateOnly(row.birthday),
    address: row.address || undefined,
    canEditRecords: row.role === ROLES.PARISH_ADMIN,
  };
}

async function countOrZero(sql, params) {
  try {
    const result = await pool.query(sql, params);
    return Number(result.rows[0]?.n || 0);
  } catch {
    return 0;
  }
}

async function loadParish(parishId) {
  const parishResult = await pool.query(
    `SELECT id, slug, name, address, contact, email, seal_url, created_at, updated_at
     FROM parish WHERE id = $1`,
    [parishId]
  );
  const parishRow = parishResult.rows[0];
  if (!parishRow) return null;

  const users = await pool.query(
    `SELECT id, parish_id, role, first_name, middle_name, last_name, email, status,
            contact_number, email_verified_at, created_at, birthday, address
     FROM app_user
     WHERE parish_id = $1
       AND role IN ('parish_admin', 'parish_staff', 'parishioner')
     ORDER BY created_at ASC`,
    [parishId]
  );

  const [baptism, confirmation, marriage, death, certificates, requests] = await Promise.all([
    countOrZero('SELECT COUNT(*)::int AS n FROM baptism WHERE parish_id = $1', [parishId]),
    countOrZero('SELECT COUNT(*)::int AS n FROM confirmation WHERE parish_id = $1', [parishId]),
    countOrZero('SELECT COUNT(*)::int AS n FROM marriage WHERE parish_id = $1', [parishId]),
    countOrZero('SELECT COUNT(*)::int AS n FROM death WHERE parish_id = $1', [parishId]),
    countOrZero('SELECT COUNT(*)::int AS n FROM certificate WHERE parish_id = $1', [parishId]),
    countOrZero('SELECT COUNT(*)::int AS n FROM certificate_request WHERE parish_id = $1', [parishId]),
  ]);

  const mapped = users.rows.map(toUser);
  return {
    parish: toParish(parishRow),
    admins: mapped.filter((user) => user.role === ROLES.PARISH_ADMIN),
    staff: mapped.filter((user) => user.role === ROLES.PARISH_STAFF),
    parishioners: mapped.filter((user) => user.role === ROLES.PARISHIONER),
    records: {
      baptism,
      confirmation,
      marriage,
      death,
      total: baptism + confirmation + marriage + death,
    },
    certificateCount: certificates,
    requestCount: requests,
  };
}

async function listOverviews() {
  const result = await pool.query(`SELECT id FROM parish ORDER BY name`);
  const parishes = [];
  for (const row of result.rows) {
    const overview = await loadParish(row.id);
    if (overview) parishes.push(overview);
  }
  return parishes;
}

async function uniqueSlug(name) {
  const base = slugify(name);
  let slug = base;
  let n = 2;
  while (true) {
    const exists = await pool.query('SELECT 1 FROM parish WHERE slug = $1', [slug]);
    if (exists.rows.length === 0) return slug;
    slug = `${base}-${n}`;
    n += 1;
  }
}

const SACRAMENT_COLORS = {
  baptism: '#16798c',
  confirmation: '#f2b632',
  marriage: '#6b8d95',
  death: '#c0392f',
};

function sacramentShares(counts) {
  return ['baptism', 'confirmation', 'marriage', 'death'].map((key) => ({
    key,
    label: key.charAt(0).toUpperCase() + key.slice(1),
    count: counts[key] || 0,
    color: SACRAMENT_COLORS[key],
  }));
}

async function listParishes(_req, res) {
  try {
    res.json({ parishes: await listOverviews() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function dashboard(_req, res) {
  try {
    const parishes = await listOverviews();
    const admins = [];
    let parishionerCount = 0;
    for (const row of parishes) {
      parishionerCount += row.parishioners.length;
      for (const user of row.admins) {
        admins.push({
          user,
          parish: row.parish,
          canEditRecords: user.canEditRecords !== false,
        });
      }
    }

    const requestMap = { baptism: 0, confirmation: 0, marriage: 0, death: 0 };
    try {
      const requests = await pool.query(
        `SELECT record_type AS key, COUNT(*)::int AS n
         FROM certificate_request
         GROUP BY record_type`
      );
      for (const row of requests.rows) {
        if (row.key in requestMap) requestMap[row.key] = row.n;
      }
    } catch {
      // certificate_request may not exist on older databases
    }

    const recordsBySacrament = sacramentShares({
      baptism: parishes.reduce((sum, row) => sum + row.records.baptism, 0),
      confirmation: parishes.reduce((sum, row) => sum + row.records.confirmation, 0),
      marriage: parishes.reduce((sum, row) => sum + row.records.marriage, 0),
      death: parishes.reduce((sum, row) => sum + row.records.death, 0),
    });

    const activeAdminCount = admins.filter((account) => account.user.status === 'active').length;
    const parishesWithAdmin = parishes.filter((row) => row.admins.length > 0).length;
    const audit = await fetchAuditEntries(12).catch(() => []);

    res.json({
      snapshot: {
        parishCount: parishes.length,
        activeAdminCount,
        parishesWithAdmin,
        pendingSetupCount: parishes.length - parishesWithAdmin,
        parishionerCount,
        recordTotal: parishes.reduce((sum, row) => sum + row.records.total, 0),
        certificateTotal: parishes.reduce((sum, row) => sum + row.certificateCount, 0),
        recordsBySacrament,
        requestsBySacrament: sacramentShares(requestMap),
        parishes,
        admins,
        audit,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createParish(req, res) {
  const name = String(req.body.name || '').trim();
  const address = String(req.body.address || '').trim();
  const contact = String(req.body.contact || '').trim() || '—';
  const email = String(req.body.email || '').trim() || null;
  const adminName = String(req.body.adminName || '').trim();
  const adminEmail = String(req.body.adminEmail || '').trim().toLowerCase();
  const adminPassword = String(req.body.adminPassword || '').trim() || generateTempPassword();

  if (!name || !address) {
    return res.status(400).json({ error: 'Parish name and location are required.' });
  }
  if (adminName && !adminEmail) {
    return res.status(400).json({ error: 'Add an email for the admin account, or leave the admin name blank.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const slug = await uniqueSlug(name);
    const inserted = await client.query(
      `INSERT INTO parish (name, address, contact, email, slug)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [name, address, contact, email, slug]
    );
    const parishId = inserted.rows[0].id;

    let credentials;
    if (adminName && adminEmail) {
      const taken = await client.query('SELECT id FROM app_user WHERE lower(email) = $1', [adminEmail]);
      if (taken.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }
      const { firstName, lastName } = splitName(adminName);
      const passwordHash = await hashPassword(adminPassword);
      await client.query(
        `INSERT INTO app_user (
           parish_id, role, first_name, last_name, email, password_hash, status, email_verified_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW())`,
        [parishId, ROLES.PARISH_ADMIN, firstName, lastName, adminEmail, passwordHash]
      );
      credentials = { email: adminEmail, password: adminPassword };
    }

    await client.query('COMMIT');
    await writeAudit({
      parishId,
      actorId: req.user.id,
      action: 'parish.created',
      entityType: 'parish',
      entityId: parishId,
      metadata: { name },
    });
    if (credentials) {
      await writeAudit({
        parishId,
        actorId: req.user.id,
        action: 'app_user.created',
        entityType: 'app_user',
        entityId: parishId,
        metadata: { role: ROLES.PARISH_ADMIN, email: adminEmail },
      });
    }

    const overview = await loadParish(parishId);
    res.status(201).json({
      parish: overview.parish,
      overview,
      credentials,
    });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore
    }
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
}

async function updateParish(req, res) {
  try {
    const current = await pool.query(
      'SELECT id, name, address, contact, email FROM parish WHERE id = $1',
      [req.params.parishId]
    );
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Parish not found.' });
    }

    const row = current.rows[0];
    const name = req.body.name != null ? String(req.body.name).trim() : row.name;
    const address = req.body.address != null ? String(req.body.address).trim() : row.address;
    const contact = req.body.contact != null ? String(req.body.contact).trim() : row.contact;
    const email = req.body.email != null ? String(req.body.email).trim() || null : row.email;

    if (!name || !address) {
      return res.status(400).json({ error: 'Parish name and location are required.' });
    }

    const updated = await pool.query(
      `UPDATE parish
       SET name = $1, address = $2, contact = $3, email = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING id, slug, name, address, contact, email, seal_url, created_at, updated_at`,
      [name, address, contact || '—', email, row.id]
    );

    await writeAudit({
      parishId: row.id,
      actorId: req.user.id,
      action: 'parish.updated',
      entityType: 'parish',
      entityId: row.id,
      metadata: { name },
    });

    res.json({ parish: toParish(updated.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getParish(req, res) {
  try {
    const overview = await loadParish(req.params.parishId);
    if (!overview) return res.status(404).json({ error: 'Parish not found.' });
    res.json({ parish: overview });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function createAccount(req, res) {
  const parishId = String(req.body.parishId || '').trim();
  const role = String(req.body.role || '').trim();
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '').trim() || generateTempPassword();

  if (!parishId || !name || !email) {
    return res.status(400).json({ error: 'Parish, name, and email are required.' });
  }
  if (!ACCOUNT_ROLES.has(role)) {
    return res.status(400).json({ error: 'Role must be parish admin, staff, or parishioner.' });
  }

  try {
    const parish = await pool.query('SELECT id FROM parish WHERE id = $1', [parishId]);
    if (parish.rows.length === 0) {
      return res.status(404).json({ error: 'Parish not found.' });
    }

    const taken = await pool.query('SELECT id FROM app_user WHERE lower(email) = $1', [email]);
    if (taken.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const { firstName, lastName } = splitName(name);
    const passwordHash = await hashPassword(password);
    const inserted = await pool.query(
      `INSERT INTO app_user (
         parish_id, role, first_name, last_name, email, password_hash, status, email_verified_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW())
       RETURNING id, parish_id, role, first_name, middle_name, last_name, email, status,
                 contact_number, email_verified_at, created_at, birthday, address`,
      [parishId, role, firstName, lastName, email, passwordHash]
    );
    const user = toUser(inserted.rows[0]);
    await writeAudit({
      parishId,
      actorId: req.user.id,
      action: 'app_user.created',
      entityType: 'app_user',
      entityId: user.id,
      metadata: { role, email },
    });
    res.status(201).json({
      user,
      credentials: { email, password },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function loadAccount(id) {
  const result = await pool.query(
    `SELECT id, parish_id, role, first_name, middle_name, last_name, email, status,
            contact_number, email_verified_at, created_at, birthday, address
     FROM app_user WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function updateAccount(req, res) {
  try {
    const current = await loadAccount(req.params.id);
    if (!current) return res.status(404).json({ error: 'Account not found.' });
    if (current.role === ROLES.SUPER_ADMIN) {
      return res.status(403).json({ error: 'Cannot edit a platform admin from here.' });
    }

    const name = req.body.name != null ? String(req.body.name).trim() : '';
    const names = name ? splitName(name) : {
      firstName: current.first_name,
      lastName: current.last_name,
    };
    const email = req.body.email != null ? String(req.body.email).trim().toLowerCase() : current.email;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    if (email !== current.email) {
      const taken = await pool.query(
        'SELECT id FROM app_user WHERE lower(email) = $1 AND id <> $2',
        [email, current.id]
      );
      if (taken.rows.length > 0) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }
    }

    let role = current.role;
    if (req.body.role && OFFICE.has(current.role)) {
      if (!OFFICE.has(req.body.role)) {
        return res.status(400).json({ error: 'Office accounts can only be parish admin or parish staff.' });
      }
      role = req.body.role;
    }

    const contactNumber =
      req.body.contactNumber !== undefined ? String(req.body.contactNumber || '').trim() || null : current.contact_number;
    const address =
      req.body.address !== undefined ? String(req.body.address || '').trim() || null : current.address;
    const birthday =
      req.body.birthday !== undefined
        ? String(req.body.birthday || '').trim().slice(0, 10) || null
        : dateOnly(current.birthday) || null;

    const updated = await pool.query(
      `UPDATE app_user
       SET first_name = $1,
           last_name = $2,
           email = $3,
           role = $4,
           contact_number = $5,
           address = $6,
           birthday = $7,
           updated_at = NOW()
       WHERE id = $8
       RETURNING id, parish_id, role, first_name, middle_name, last_name, email, status,
                 contact_number, email_verified_at, created_at, birthday, address`,
      [names.firstName, names.lastName, email, role, contactNumber, address, birthday, current.id]
    );

    await writeAudit({
      parishId: current.parish_id,
      actorId: req.user.id,
      action: 'app_user.updated',
      entityType: 'app_user',
      entityId: current.id,
      metadata: { email, role },
    });

    res.json({ user: toUser(updated.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function setStatus(req, res) {
  try {
    const current = await loadAccount(req.params.id);
    if (!current) return res.status(404).json({ error: 'Account not found.' });
    if (current.role === ROLES.SUPER_ADMIN) {
      return res.status(403).json({ error: 'Cannot change a platform admin from here.' });
    }
    if (current.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot change your own account status here.' });
    }

    const nextStatus = req.body.status === 'suspended' ? 'suspended' : 'active';
    const updated = await pool.query(
      `UPDATE app_user SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, parish_id, role, first_name, middle_name, last_name, email, status,
                 contact_number, email_verified_at, created_at, birthday, address`,
      [nextStatus, current.id]
    );

    await writeAudit({
      parishId: current.parish_id,
      actorId: req.user.id,
      action: nextStatus === 'suspended' ? 'app_user.suspended' : 'app_user.reactivated',
      entityType: 'app_user',
      entityId: current.id,
      metadata: { status: nextStatus },
    });

    res.json({ user: toUser(updated.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function resetPassword(req, res) {
  try {
    const current = await loadAccount(req.params.id);
    if (!current) return res.status(404).json({ error: 'Account not found.' });
    if (current.role === ROLES.SUPER_ADMIN) {
      return res.status(403).json({ error: 'Cannot reset a platform admin from here.' });
    }

    const password = String(req.body.password || '').trim() || generateTempPassword();
    const passwordHash = await hashPassword(password);
    await pool.query(
      `UPDATE app_user SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [passwordHash, current.id]
    );
    await writeAudit({
      parishId: current.parish_id,
      actorId: req.user.id,
      action: 'app_user.password_reset',
      entityType: 'app_user',
      entityId: current.id,
      metadata: { email: current.email },
    });
    res.json({
      user: toUser(current),
      credentials: { email: current.email, password },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function removeAccount(req, res) {
  try {
    const current = await loadAccount(req.params.id);
    if (!current) return res.status(404).json({ error: 'Account not found.' });
    if (current.role === ROLES.SUPER_ADMIN) {
      return res.status(403).json({ error: 'Cannot remove a platform admin.' });
    }
    if (current.id === req.user.id) {
      return res.status(400).json({ error: 'You cannot remove your own account.' });
    }

    await pool.query('DELETE FROM app_user WHERE id = $1', [current.id]);
    await writeAudit({
      parishId: current.parish_id,
      actorId: req.user.id,
      action: 'app_user.removed',
      entityType: 'app_user',
      entityId: current.id,
      metadata: { email: current.email, role: current.role },
    });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({
        error: 'This account is linked to records and cannot be deleted. Suspend it instead.',
      });
    }
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  dashboard,
  listParishes,
  getParish,
  createParish,
  updateParish,
  createAccount,
  updateAccount,
  setStatus,
  resetPassword,
  removeAccount,
};
