const pool = require('../config/db');

function parseMetadata(value) {
  if (!value) return {};
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function mapAuditRow(row) {
  return {
    id: row.id,
    parishId: row.parish_id,
    actorId: row.actor_id,
    actorName: row.actor_name || 'Someone',
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: parseMetadata(row.metadata),
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    parishName: row.parish_name || null,
  };
}

async function fetchAuditEntries(limit = 300) {
  const result = await pool.query(
    `SELECT
       a.id,
       a.parish_id,
       a.actor_id,
       a.action,
       a.entity_type,
       a.entity_id,
       a.metadata,
       a.created_at,
       NULLIF(trim(concat_ws(' ', u.first_name, u.middle_name, u.last_name)), '') AS actor_name,
       p.name AS parish_name
     FROM audit_log a
     LEFT JOIN app_user u ON u.id = a.actor_id
     LEFT JOIN parish p ON p.id = a.parish_id
     ORDER BY a.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows.map(mapAuditRow);
}

async function listAuditLog(_req, res) {
  try {
    const entries = await fetchAuditEntries(300);
    res.json({ entries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { listAuditLog, fetchAuditEntries };
