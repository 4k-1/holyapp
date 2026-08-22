const pool = require('../config/db');
const { comparePassword } = require('../utils/password');
const {
  signAccessToken,
  accessTokenExpiresInSeconds,
  hashRefreshToken,
  generateRefreshToken,
  refreshTokenExpiryDate,
} = require('../utils/tokens');

function publicUser(user) {
  return {
    id: user.id,
    first_name: user.first_name,
    middle_name: user.middle_name,
    last_name: user.last_name,
    email: user.email,
    role: user.role,
    parish_id: user.parish_id,
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

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const result = await pool.query(
      'SELECT id, parish_id, role, first_name, middle_name, last_name, email, password_hash, status FROM app_user WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    const passwordMatches = await comparePassword(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json(await issueSession(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
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
         u.status
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
  const { refresh_token } = req.body;
  if (!refresh_token) {
    return res.status(400).json({ error: 'refresh_token is required' });
  }

  try {
    const tokenHash = hashRefreshToken(refresh_token);
    await pool.query(
      `UPDATE refresh_token
       SET revoked_at = NOW()
       WHERE token_hash = $1 AND revoked_at IS NULL`,
      [tokenHash]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { login, refresh, logout };
