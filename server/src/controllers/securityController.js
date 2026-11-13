const pool = require('../config/db');
const { writeAudit } = require('../utils/audit');
const { hashRefreshToken } = require('../utils/tokens');
const { revokeUserSessions } = require('../utils/sessions');
const { currentRefreshToken, formatLastActive, formatActivityTime } = require('../utils/sessionMeta');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

async function currentSessionId(req) {
  const token = currentRefreshToken(req);
  if (!token) return null;
  const result = await pool.query(
    `SELECT id FROM refresh_token
     WHERE user_id = $1 AND token_hash = $2 AND revoked_at IS NULL`,
    [req.user.id, hashRefreshToken(token)]
  );
  return result.rows[0]?.id || null;
}

function toSession(row, currentId) {
  return {
    id: row.id,
    device: row.device_label || 'Unknown device',
    location: row.location || 'Unknown location',
    lastActive: formatLastActive(row.last_active_at || row.created_at),
    current: currentId != null && String(row.id) === String(currentId),
  };
}

async function getSecurityOverview(req, res) {
  try {
    const currentId = await currentSessionId(req);
    if (currentId) {
      await pool.query(
        `UPDATE refresh_token SET last_active_at = NOW() WHERE id = $1 AND revoked_at IS NULL`,
        [currentId]
      );
    }

    const user = await pool.query(
      `SELECT two_factor_enabled FROM app_user WHERE id = $1`,
      [req.user.id]
    );
    if (!user.rows[0]) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const sessions = await pool.query(
      `SELECT id, device_label, location, last_active_at, created_at
       FROM refresh_token
       WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
       ORDER BY last_active_at DESC NULLS LAST, created_at DESC`,
      [req.user.id]
    );

    const activity = await pool.query(
      `SELECT id, created_at, device_label, location, status
       FROM login_activity
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [req.user.id]
    );

    res.json({
      twoFactorEnabled: user.rows[0].two_factor_enabled === true,
      sessions: sessions.rows.map((row) => toSession(row, currentId)),
      activity: activity.rows.map((row) => ({
        id: row.id,
        timestamp: formatActivityTime(row.created_at),
        device: row.device_label || 'Unknown device',
        location: row.location || 'Unknown location',
        status: row.status === 'success' ? 'success' : 'failed',
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function setTwoFactor(req, res) {
  const enabled = req.body?.enabled === true;
  try {
    await pool.query(
      `UPDATE app_user SET two_factor_enabled = $1, updated_at = NOW() WHERE id = $2`,
      [enabled, req.user.id]
    );
    if (!enabled) {
      await pool.query(`DELETE FROM trusted_device WHERE user_id = $1`, [req.user.id]);
    }
    await writeAudit({
      parishId: req.user.parish_id,
      actorId: req.user.id,
      action: enabled ? 'auth.two_factor_enabled' : 'auth.two_factor_disabled',
      entityType: 'app_user',
      entityId: req.user.id,
      metadata: {},
    });
    res.json({ twoFactorEnabled: enabled });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function endSession(req, res) {
  try {
    const currentId = await currentSessionId(req);
    const target = await pool.query(
      `SELECT id FROM refresh_token
       WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`,
      [req.params.id, req.user.id]
    );
    if (!target.rows[0]) {
      return res.status(404).json({ error: 'That session is no longer active.' });
    }
    if (currentId && String(target.rows[0].id) === String(currentId)) {
      return res.status(400).json({ error: "You can't sign out this device here. Use Sign out instead." });
    }
    await pool.query(
      `UPDATE refresh_token SET revoked_at = NOW() WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

async function endOtherSessions(req, res) {
  try {
    const currentId = await currentSessionId(req);
    if (!currentId) {
      throw httpError(400, 'This device is missing a session token. Sign in again.');
    }
    await revokeUserSessions(req.user.id, { exceptId: currentId });
    const sessions = await pool.query(
      `SELECT id, device_label, location, last_active_at, created_at
       FROM refresh_token
       WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
       ORDER BY last_active_at DESC`,
      [req.user.id]
    );
    res.json({
      sessions: sessions.rows.map((row) => toSession(row, currentId)),
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
}

module.exports = {
  getSecurityOverview,
  setTwoFactor,
  endSession,
  endOtherSessions,
};
