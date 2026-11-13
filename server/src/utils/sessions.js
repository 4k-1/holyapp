const pool = require('../config/db');

async function revokeUserSessions(userId, { exceptId } = {}) {
  if (exceptId) {
    await pool.query(
      `UPDATE refresh_token
       SET revoked_at = NOW()
       WHERE user_id = $1 AND revoked_at IS NULL AND id <> $2`,
      [userId, exceptId]
    );
    return;
  }
  await pool.query(
    `UPDATE refresh_token
     SET revoked_at = NOW()
     WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
}

module.exports = { revokeUserSessions };
