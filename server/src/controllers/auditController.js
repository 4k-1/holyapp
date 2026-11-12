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

// How an entry is flagged: "red" for failed sign-ins, "yellow" for anything taken away, "green" for the rest.
// The super admin audit page keeps the same lists, in client/src/features/super-admin/auditCopy.ts.
const RED_WORDS = ['failed'];
const YELLOW_WORDS = ['suspended', 'removed', 'revoked', 'voided', 'archived', 'rejected', 'spoiled'];
const KINDS = new Set(['green', 'yellow', 'red']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function anyWord(words, params) {
  return words
    .map((word) => {
      params.push(`%${word}%`);
      return `a.action LIKE $${params.length}`;
    })
    .join(' OR ');
}

/**
 * Newest entries first. `beforeId` is the last entry already shown, so the next call returns the entries older than
 * it (compared on its stored time, to the microsecond). `parishId` and `kind` narrow the whole log, not only what has
 * been loaded.
 */
async function fetchAuditEntries(limit = 300, { beforeId, parishId, kind } = {}) {
  const params = [];
  const where = [];
  if (beforeId) {
    params.push(beforeId);
    where.push(
      `(a.created_at, a.id) < (SELECT b.created_at, b.id FROM audit_log b WHERE b.id = $${params.length}::uuid)`
    );
  }
  if (parishId) {
    params.push(parishId);
    where.push(`a.parish_id = $${params.length}`);
  }
  if (kind === 'red') {
    where.push(`(${anyWord(RED_WORDS, params)})`);
  } else if (kind === 'yellow') {
    const red = anyWord(RED_WORDS, params);
    where.push(`NOT (${red}) AND (${anyWord(YELLOW_WORDS, params)})`);
  } else if (kind === 'green') {
    where.push(`NOT (${anyWord([...RED_WORDS, ...YELLOW_WORDS], params)})`);
  }
  params.push(limit);

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
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY a.created_at DESC, a.id DESC
     LIMIT $${params.length}`,
    params
  );
  return result.rows.map(mapAuditRow);
}

const PAGE_SIZE = 100;

function queryText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

async function listAuditLog(req, res) {
  const beforeId = queryText(req.query.beforeId);
  const parishId = queryText(req.query.parishId);
  const kind = queryText(req.query.kind);

  if (beforeId && !UUID.test(beforeId)) {
    return res.status(400).json({ error: 'That is not a valid place in the log.' });
  }
  if (parishId && !UUID.test(parishId)) {
    return res.status(400).json({ error: 'That parish was not found.' });
  }
  if (kind && !KINDS.has(kind)) {
    return res.status(400).json({ error: 'Unknown kind of activity.' });
  }

  try {
    // One extra row tells us whether there is anything older to load.
    const rows = await fetchAuditEntries(PAGE_SIZE + 1, {
      beforeId: beforeId || undefined,
      parishId: parishId || undefined,
      kind: kind || undefined,
    });
    res.json({ entries: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { listAuditLog, fetchAuditEntries };
