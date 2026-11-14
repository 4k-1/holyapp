const pool = require('../config/db');
const { ROLES } = require('../constants/roles');
const { hashPassword, comparePassword } = require('../utils/password');
const { sendMail, verificationEmail, passwordResetEmail, twoFactorEmail } = require('../utils/mailer');
const { writeAudit } = require('../utils/audit');
const { encrypt, decrypt } = require('../utils/fieldCrypto');
const { requestMeta } = require('../utils/sessionMeta');
const { FULL_ACCESS, normalizeAccess } = require('../constants/staffAccess');
const {
  signAccessToken,
  accessTokenExpiresInSeconds,
  hashRefreshToken,
  generateRefreshToken,
  generateOtpCode,
  generateResetToken,
  refreshTokenExpiryDate,
  minutesFromNow,
} = require('../utils/tokens');

const USER_COLUMNS = `
  id, parish_id, role, first_name, middle_name, last_name, email,
  password_hash, status, contact_number, email_verified_at, created_at,
  birthday, address, two_factor_enabled, staff_access
`;

function dateOnly(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function publicUser(user) {
  const firstName = user.first_name || '';
  const middleName = user.middle_name || '';
  const lastName = user.last_name || '';
  const fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');

  return {
    id: user.id,
    parish_id: user.parish_id,
    role: user.role,
    status: user.status,
    full_name: fullName,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    middle_name: user.middle_name || null,
    contact_number: decrypt(user.contact_number) || null,
    email_verified_at: user.email_verified_at
      ? new Date(user.email_verified_at).toISOString()
      : null,
    created_at: user.created_at ? new Date(user.created_at).toISOString() : null,
    birthday: dateOnly(user.birthday),
    address: decrypt(user.address) || null,
    // E1: which office areas this sign-in can open (null for parishioners and super admins).
    area_access: officeAreaAccess(user),
  };
}

function officeAreaAccess(user) {
  if (user.role === ROLES.PARISH_STAFF) return normalizeAccess(user.staff_access);
  if (user.role === ROLES.PARISH_ADMIN) return { ...FULL_ACCESS };
  return null;
}

async function persistRefreshToken(userId, tokenHash, meta = {}) {
  try {
    await pool.query(
      `INSERT INTO refresh_token (
         user_id, token_hash, expires_at, user_agent, device_label, ip, location, device_fingerprint, last_active_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        userId,
        tokenHash,
        refreshTokenExpiryDate(),
        meta.userAgent || null,
        meta.deviceLabel || null,
        meta.ip || null,
        meta.location || null,
        meta.fingerprint || null,
      ]
    );
  } catch (err) {
    if (err.code !== '42703') throw err;
    await pool.query(
      `INSERT INTO refresh_token (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, tokenHash, refreshTokenExpiryDate()]
    );
  }
}

async function issueSession(user, req) {
  const accessToken = signAccessToken(user);
  const refresh = generateRefreshToken();
  await persistRefreshToken(user.id, refresh.tokenHash, req ? requestMeta(req) : {});
  return {
    token: accessToken,
    refresh_token: refresh.token,
    token_type: 'Bearer',
    expires_in: accessTokenExpiresInSeconds(),
    user: publicUser(user),
  };
}

async function recordLoginActivity(user, req, status, portal) {
  if (!user?.id) return;
  const meta = requestMeta(req);
  try {
    await pool.query(
      `INSERT INTO login_activity (user_id, device_label, location, ip, status, portal)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [user.id, meta.deviceLabel, meta.location, meta.ip, status, portal || null]
    );
  } catch (err) {
    console.error('recordLoginActivity failed:', err.message);
  }
}

async function deviceIsTrusted(userId, fingerprint) {
  if (!fingerprint) return false;
  const result = await pool.query(
    `SELECT id FROM trusted_device WHERE user_id = $1 AND fingerprint_hash = $2`,
    [userId, fingerprint]
  );
  if (!result.rows[0]) return false;
  await pool.query(`UPDATE trusted_device SET last_used_at = NOW() WHERE id = $1`, [
    result.rows[0].id,
  ]);
  return true;
}

async function trustDevice(userId, meta) {
  if (!meta.fingerprint) return;
  await pool.query(
    `INSERT INTO trusted_device (user_id, fingerprint_hash, device_label)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, fingerprint_hash)
     DO UPDATE SET last_used_at = NOW(), device_label = EXCLUDED.device_label`,
    [userId, meta.fingerprint, meta.deviceLabel]
  );
}

async function startTwoFactorChallenge(user, req, portal) {
  const meta = requestMeta(req);
  const otp = generateOtpCode();
  await pool.query(
    `UPDATE login_challenge SET consumed_at = NOW()
     WHERE user_id = $1 AND consumed_at IS NULL`,
    [user.id]
  );
  const inserted = await pool.query(
    `INSERT INTO login_challenge (
       user_id, code_hash, device_fingerprint, user_agent, ip, location, portal, expires_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      user.id,
      otp.codeHash,
      meta.fingerprint,
      meta.userAgent,
      meta.ip,
      meta.location,
      portal,
      minutesFromNow(10),
    ]
  );
  const message = twoFactorEmail(otp.code);
  await sendMail({
    to: user.email,
    subject: 'Your HolyApp sign-in code',
    text: message.text,
    html: message.html,
  });
  return {
    two_factor_required: true,
    challenge_id: inserted.rows[0].id,
    email: user.email,
  };
}

async function selectUser(whereSql, params) {
  try {
    const result = await pool.query(`SELECT ${USER_COLUMNS} FROM app_user ${whereSql}`, params);
    return result.rows[0] || null;
  } catch (err) {
    if (err.code !== '42703') throw err;
    const result = await pool.query(
      `SELECT id, parish_id, role, first_name, middle_name, last_name, email,
              password_hash, status, contact_number, email_verified_at, created_at,
              birthday, address
       FROM app_user ${whereSql}`,
      params
    );
    const row = result.rows[0];
    return row ? { ...row, two_factor_enabled: false } : null;
  }
}

async function findUserByEmail(email) {
  return selectUser('WHERE lower(email) = lower($1)', [email]);
}

async function findUserById(id) {
  return selectUser('WHERE id = $1', [id]);
}

async function issueEmailVerification(user) {
  const otp = generateOtpCode();
  await pool.query(
    `UPDATE email_verification
     SET consumed_at = NOW()
     WHERE user_id = $1 AND consumed_at IS NULL`,
    [user.id]
  );
  await pool.query(
    `INSERT INTO email_verification (user_id, code_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, otp.codeHash, minutesFromNow(10)]
  );
  const message = verificationEmail(otp.code);
  await sendMail({
    to: user.email,
    subject: 'Your HolyApp verification code',
    text: message.text,
    html: message.html,
  });
  return otp.code;
}

function mailStatus(err) {
  if (err && (err.code === 'MAIL_NOT_CONFIGURED' || err.code === 'MAIL_SEND_FAILED')) {
    return 503;
  }
  return 500;
}

function pick(body, camel, snake) {
  return body[camel] ?? body[snake];
}

async function loginWithPortal(req, res, portal) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await findUserByEmail(String(email).trim());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (portal === 'parish' && user.role === ROLES.SUPER_ADMIN) {
      return res.status(403).json({
        error: 'This account uses the platform sign-in, not the parish portal.',
      });
    }
    if (portal === 'super_admin' && user.role !== ROLES.SUPER_ADMIN) {
      return res.status(403).json({
        error: 'This account belongs to a parish. Sign in through your parish portal.',
      });
    }

    if (user.status === 'suspended') {
      const message =
        portal === 'super_admin'
          ? 'This platform account has been suspended.'
          : 'This account has been suspended. Contact the parish office.';
      return res.status(403).json({ error: message });
    }
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    const passwordMatches = await comparePassword(password, user.password_hash);
    if (!passwordMatches) {
      await recordLoginActivity(user, req, 'failed', portal);
      await writeAudit({
        parishId: user.parish_id,
        actorId: user.id,
        action: 'auth.login_failed',
        entityType: 'app_user',
        entityId: user.id,
        metadata: { email: user.email },
      });
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.role === ROLES.PARISHIONER && !user.email_verified_at) {
      return res.status(403).json({ error: 'Please verify your email first.' });
    }

    const meta = requestMeta(req);
    if (user.two_factor_enabled) {
      const trusted = await deviceIsTrusted(user.id, meta.fingerprint);
      if (!trusted) {
        const challenge = await startTwoFactorChallenge(user, req, portal);
        return res.json(challenge);
      }
    }

    const session = await issueSession(user, req);
    await recordLoginActivity(user, req, 'success', portal);
    await writeAudit({
      parishId: user.parish_id,
      actorId: user.id,
      action: 'auth.login',
      entityType: 'app_user',
      entityId: user.id,
      metadata: { portal },
    });
    res.json(session);
  } catch (err) {
    res.status(mailStatus(err)).json({ error: err.message });
  }
}

async function login(req, res) {
  return loginWithPortal(req, res, 'parish');
}

async function loginSuperAdmin(req, res) {
  return loginWithPortal(req, res, 'super_admin');
}

async function register(req, res) {
  const firstName = pick(req.body, 'firstName', 'first_name');
  const lastName = pick(req.body, 'lastName', 'last_name');
  const middleName = pick(req.body, 'middleName', 'middle_name');
  const birthday = req.body.birthday;
  const address = req.body.address;
  const email = req.body.email ? String(req.body.email).trim() : '';
  const password = req.body.password;
  const parishId = pick(req.body, 'parishId', 'parish_id');

  if (!firstName || !lastName || !birthday || !address || !email || !password || !parishId) {
    return res.status(400).json({ error: 'All required registration fields must be provided' });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const parish = await pool.query('SELECT id FROM parish WHERE id = $1', [parishId]);
    if (parish.rows.length === 0) {
      return res.status(400).json({ error: 'Parish not found' });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      if (existing.role === ROLES.PARISHIONER && !existing.email_verified_at) {
        await issueEmailVerification(existing);
        return res.json({ ok: true, email: existing.email });
      }
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await hashPassword(password);
    const inserted = await pool.query(
      `INSERT INTO app_user (
         parish_id, role, email, password_hash, status,
         first_name, middle_name, last_name, birthday, address
       )
       VALUES ($1, $2, $3, $4, 'active', $5, $6, $7, $8, $9)
       RETURNING ${USER_COLUMNS}`,
      [
        parishId,
        ROLES.PARISHIONER,
        email,
        passwordHash,
        firstName,
        middleName || null,
        lastName,
        birthday,
        encrypt(address),
      ]
    );
    const user = inserted.rows[0];
    await issueEmailVerification(user);
    res.status(201).json({ ok: true, email: user.email });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    res.status(mailStatus(err)).json({ error: err.message });
  }
}

async function verifyEmail(req, res) {
  const email = req.body.email ? String(req.body.email).trim() : '';
  const code = req.body.code ? String(req.body.code).trim() : '';

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and verification code are required' });
  }

  try {
    const user = await findUserByEmail(email);
    if (!user || user.role !== ROLES.PARISHIONER) {
      return res.status(400).json({ error: 'No pending registration found. Please register again.' });
    }
    if (user.email_verified_at) {
      return res.json(await issueSession(user, req));
    }

    const codeHash = hashRefreshToken(code);
    const result = await pool.query(
      `SELECT id, expires_at, consumed_at
       FROM email_verification
       WHERE user_id = $1 AND code_hash = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.id, codeHash]
    );
    const row = result.rows[0];
    if (!row || row.consumed_at || new Date(row.expires_at) <= new Date()) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    await pool.query(
      'UPDATE email_verification SET consumed_at = NOW() WHERE id = $1',
      [row.id]
    );
    const updated = await pool.query(
      `UPDATE app_user
       SET email_verified_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING ${USER_COLUMNS}`,
      [user.id]
    );

    res.json(await issueSession(updated.rows[0], req));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function resendVerification(req, res) {
  const email = req.body.email ? String(req.body.email).trim() : '';
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const user = await findUserByEmail(email);
    if (!user || user.email_verified_at || user.role !== ROLES.PARISHIONER) {
      return res.json({ ok: true });
    }
    await issueEmailVerification(user);
    res.json({ ok: true });
  } catch (err) {
    res.status(mailStatus(err)).json({ error: err.message });
  }
}

async function refresh(req, res) {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    return res.status(400).json({ error: 'refresh_token is required' });
  }

  try {
    const tokenHash = hashRefreshToken(refresh_token);
    const result = await pool.query(
      `SELECT
         rt.id AS refresh_id,
         rt.expires_at,
         rt.revoked_at,
         u.id,
         u.parish_id,
         u.role,
         u.first_name,
         u.middle_name,
         u.last_name,
         u.email,
         u.password_hash,
         u.status,
         u.contact_number,
         u.email_verified_at,
         u.created_at,
         u.birthday,
         u.address,
         u.staff_access
       FROM refresh_token rt
       JOIN app_user u ON u.id = rt.user_id
       WHERE rt.token_hash = $1`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const row = result.rows[0];
    if (row.revoked_at) {
      return res.status(401).json({ error: 'Refresh token has been revoked' });
    }
    if (new Date(row.expires_at) <= new Date()) {
      return res.status(401).json({ error: 'Refresh token expired' });
    }
    if (row.status !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    const refresh = generateRefreshToken();
    const meta = requestMeta(req);
    try {
      await pool.query(
        `UPDATE refresh_token
         SET token_hash = $1,
             last_active_at = NOW(),
             user_agent = COALESCE($3, user_agent),
             device_label = COALESCE($4, device_label),
             ip = COALESCE($5, ip),
             location = COALESCE($6, location)
         WHERE id = $2`,
        [refresh.tokenHash, row.refresh_id, meta.userAgent, meta.deviceLabel, meta.ip, meta.location]
      );
    } catch (err) {
      if (err.code !== '42703') throw err;
      await pool.query('UPDATE refresh_token SET revoked_at = NOW() WHERE id = $1', [row.refresh_id]);
      await persistRefreshToken(row.id, refresh.tokenHash, meta);
    }

    res.json({
      token: signAccessToken(row),
      refresh_token: refresh.token,
      token_type: 'Bearer',
      expires_in: accessTokenExpiresInSeconds(),
      user: publicUser(row),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function logout(req, res) {
  const { refresh_token } = req.body || {};

  try {
    if (refresh_token) {
      const tokenHash = hashRefreshToken(refresh_token);
      await pool.query(
        `UPDATE refresh_token
         SET revoked_at = NOW()
         WHERE token_hash = $1 AND revoked_at IS NULL`,
        [tokenHash]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function forgotPassword(req, res) {
  const email = req.body.email ? String(req.body.email).trim() : '';
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const user = await findUserByEmail(email);
    const payload = { ok: true };

    if (user && user.status === 'active') {
      const reset = generateResetToken();
      await pool.query(
        `UPDATE password_reset
         SET consumed_at = NOW()
         WHERE user_id = $1 AND consumed_at IS NULL`,
        [user.id]
      );
      await pool.query(
        `INSERT INTO password_reset (user_id, token_hash, expires_at)
         VALUES ($1, $2, $3)`,
        [user.id, reset.tokenHash, minutesFromNow(30)]
      );

      const { frontendUrl } = require('../utils/frontendUrl');
      const resetUrl = `${frontendUrl()}/reset-password/${reset.token}`;
      const message = passwordResetEmail(resetUrl);
      await sendMail({
        to: user.email,
        subject: 'Reset your HolyApp password',
        text: message.text,
        html: message.html,
      });
    }

    res.json(payload);
  } catch (err) {
    res.status(mailStatus(err)).json({ error: err.message });
  }
}

async function resetPassword(req, res) {
  const token = req.body.token;
  const password = req.body.password || req.body.new_password;
  if (!token || !password) {
    return res.status(400).json({ error: 'token and password are required' });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  try {
    const tokenHash = hashRefreshToken(token);
    const result = await pool.query(
      `SELECT id, user_id, expires_at, consumed_at
       FROM password_reset
       WHERE token_hash = $1`,
      [tokenHash]
    );
    const row = result.rows[0];
    if (!row || row.consumed_at || new Date(row.expires_at) <= new Date()) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired.' });
    }

    const passwordHash = await hashPassword(password);
    await pool.query(
      `UPDATE app_user
       SET password_hash = $1, updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, row.user_id]
    );
    await pool.query(
      'UPDATE password_reset SET consumed_at = NOW() WHERE id = $1',
      [row.id]
    );
    await pool.query(
      `UPDATE refresh_token
       SET revoked_at = NOW()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [row.user_id]
    );

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function me(req, res) {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }
    res.json({ user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function optionalText(value) {
  if (value === undefined) return undefined;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
}

async function updateMe(req, res) {
  try {
    const current = await findUserById(req.user.id);
    if (!current) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (current.status !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    const firstName = optionalText(pick(req.body, 'firstName', 'first_name'));
    const lastName = optionalText(pick(req.body, 'lastName', 'last_name'));
    const middleName = optionalText(pick(req.body, 'middleName', 'middle_name'));
    const address = optionalText(pick(req.body, 'address', 'address'));
    const contactNumber = optionalText(pick(req.body, 'contactNumber', 'contact_number'));
    const birthdayRaw = pick(req.body, 'birthday', 'birthday');
    const emailRaw = pick(req.body, 'email', 'email');

    if (firstName !== undefined && !firstName) {
      return res.status(400).json({ error: 'First name is required' });
    }
    if (lastName !== undefined && !lastName) {
      return res.status(400).json({ error: 'Last name is required' });
    }

    let email = current.email;
    if (emailRaw !== undefined) {
      email = String(emailRaw).trim().toLowerCase();
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }
      if (email !== current.email.toLowerCase()) {
        const taken = await pool.query(
          `SELECT id FROM app_user WHERE lower(email) = $1 AND id <> $2`,
          [email, current.id]
        );
        if (taken.rows.length > 0) {
          return res.status(409).json({ error: 'An account with this email already exists.' });
        }
      }
    }

    let birthday = current.birthday;
    if (birthdayRaw !== undefined) {
      const text = String(birthdayRaw).trim();
      birthday = text === '' ? null : text.slice(0, 10);
    }

    const next = {
      first_name: firstName !== undefined ? firstName : current.first_name,
      last_name: lastName !== undefined ? lastName : current.last_name,
      middle_name: middleName !== undefined ? middleName : current.middle_name,
      address: address !== undefined ? encrypt(address) : current.address,
      contact_number: contactNumber !== undefined ? encrypt(contactNumber) : current.contact_number,
      birthday,
      email,
    };

    const updated = await pool.query(
      `UPDATE app_user
       SET first_name = $1,
           last_name = $2,
           middle_name = $3,
           birthday = $4,
           address = $5,
           contact_number = $6,
           email = $7,
           updated_at = NOW()
       WHERE id = $8
       RETURNING ${USER_COLUMNS}`,
      [
        next.first_name,
        next.last_name,
        next.middle_name,
        next.birthday,
        next.address,
        next.contact_number,
        next.email,
        current.id,
      ]
    );

    await writeAudit({
      parishId: current.parish_id,
      actorId: current.id,
      action: 'profile.updated',
      entityType: 'app_user',
      entityId: current.id,
      metadata: { role: current.role },
    });

    res.json({ user: publicUser(updated.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function verifyLoginTwoFactor(req, res) {
  const challengeId = req.body?.challenge_id || req.body?.challengeId;
  const code = req.body?.code ? String(req.body.code).trim() : '';
  if (!challengeId || !code) {
    return res.status(400).json({ error: 'Verification code is required.' });
  }

  try {
    const result = await pool.query(
      `SELECT c.*, u.id AS user_id
       FROM login_challenge c
       JOIN app_user u ON u.id = c.user_id
       WHERE c.id = $1`,
      [challengeId]
    );
    const challenge = result.rows[0];
    if (!challenge || challenge.consumed_at || new Date(challenge.expires_at) <= new Date()) {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    const user = await findUserById(challenge.user_id);
    if (!user || user.status !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    if (challenge.code_hash !== hashRefreshToken(code)) {
      await recordLoginActivity(user, req, 'failed', challenge.portal);
      return res.status(400).json({ error: 'Invalid verification code.' });
    }

    await pool.query(`UPDATE login_challenge SET consumed_at = NOW() WHERE id = $1`, [challenge.id]);
    const meta = requestMeta(req);
    await trustDevice(user.id, {
      fingerprint: meta.fingerprint || challenge.device_fingerprint,
      deviceLabel: meta.deviceLabel,
    });
    const session = await issueSession(user, req);
    await recordLoginActivity(user, req, 'success', challenge.portal);
    await writeAudit({
      parishId: user.parish_id,
      actorId: user.id,
      action: 'auth.login',
      entityType: 'app_user',
      entityId: user.id,
      metadata: { portal: challenge.portal, two_factor: true },
    });
    res.json(session);
  } catch (err) {
    res.status(mailStatus(err)).json({ error: err.message });
  }
}

async function resendLoginTwoFactor(req, res) {
  const challengeId = req.body?.challenge_id || req.body?.challengeId;
  if (!challengeId) {
    return res.status(400).json({ error: 'Challenge is required.' });
  }
  try {
    const result = await pool.query(
      `SELECT c.*, u.email, u.status
       FROM login_challenge c
       JOIN app_user u ON u.id = c.user_id
       WHERE c.id = $1`,
      [challengeId]
    );
    const row = result.rows[0];
    if (!row || row.consumed_at || row.status !== 'active') {
      return res.json({ ok: true });
    }
    const user = await findUserById(row.user_id);
    const challenge = await startTwoFactorChallenge(user, req, row.portal);
    res.json(challenge);
  } catch (err) {
    res.status(mailStatus(err)).json({ error: err.message });
  }
}

module.exports = {
  login,
  loginSuperAdmin,
  register,
  verifyEmail,
  resendVerification,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  me,
  updateMe,
  verifyLoginTwoFactor,
  resendLoginTwoFactor,
};
