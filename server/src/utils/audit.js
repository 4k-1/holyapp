const pool = require('../config/db');

async function writeAudit({ parishId, actorId, action, entityType, entityId, metadata = {} }) {
  try {
    await pool.query(
      `INSERT INTO audit_log (parish_id, actor_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [parishId || null, actorId, action, entityType, entityId, JSON.stringify(metadata)]
    );
  } catch (err) {
    console.error('writeAudit failed:', err.message);
  }
}

module.exports = { writeAudit };
