const pool = require('../config/db');

/**
 * Parish defaults (settings row, regular Mass schedule) record who created them. When a signed-out guest is the
 * first to need them, they are created on behalf of the parish's own office account.
 */
async function parishSetupActor(parishId) {
  const result = await pool.query(
    `SELECT id FROM app_user
     WHERE parish_id = $1 AND role IN ('parish_admin', 'parish_staff')
     ORDER BY (role = 'parish_admin') DESC, created_at
     LIMIT 1`,
    [parishId]
  );
  const id = result.rows[0]?.id;
  if (!id) {
    const err = new Error('This parish is not accepting online requests yet.');
    err.status = 503;
    throw err;
  }
  return id;
}

module.exports = { parishSetupActor };
