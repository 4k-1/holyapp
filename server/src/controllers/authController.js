const pool = require('../config/db');
const { ROLES } = require('../constants/roles');
const { hashPassword, comparePassword } = require('../utils/password');
const { sendMail, verificationEmail, passwordResetEmail } = require('../utils/mailer');
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
  birthday, address
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
    contact_number: user.contact_number || null,
    email_verified_at: user.email_verified_at
      ? new Date(user.email_verified_at).toISOString()
      : null,
    created_at: user.created_at ? new Date(user.created_at).toISOString() : null,
    birthday: dateOnly(user.birthday),
    address: user.address || null,
  };
}

async function persistRefreshToken(userId, tokenHash) {
  await pool.query(
    `INSERT INTO refresh_token (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, refreshTokenExpiryDate()]
  );
}

async function issueSession(user) {
  const accessToken = signAccessToken(user);
  const refresh = generateRefreshToken();
  await persistRefreshToken(user.id, refresh.tokenHash);
  return {
    token: accessToken,
    refresh_token: refresh.token,
    token_type: 'Bearer',
    expires_in: accessTokenExpiresInSeconds(),
    user: publicUser(user),
  };
}

async function findUserByEmail(email) {
  const result = await pool.query(
    `SELECT ${USER_COLUMNS} FROM app_user WHERE lower(email) = lower($1)`,
    [email]
  );
  return result.rows[0] || null;
}

async function findUserById(id) {
  const result = await pool.query(
    `SELECT ${USER_COLUMNS} FROM app_user WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
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
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (user.role === ROLES.PARISHIONER && !user.email_verified_at) {
      return res.status(403).json({ error: 'Please verify your email first.' });
    }

    res.json(await issueSession(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
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
        address,
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
      return res.json(await issueSession(user));
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

    res.json(await issueSession(updated.rows[0]));
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
         u.address
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

    await pool.query(
      'UPDATE refresh_token SET revoked_at = NOW() WHERE id = $1',
      [row.refresh_id]
    );

    res.json(await issueSession(row));
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
};
