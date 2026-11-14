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
// The super admin audit page keeps the same lists, in client/src/lib/auditCopy.ts.
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
// Which part of the app an action belongs to, by the word before the dot ("donation.voided" → donations).
// The parish Activity page filters on these; the area names match staff access (E1) plus "accounts".
const AREA_ENTITIES = {
  registers: ['baptism', 'confirmation', 'marriage', 'death', 'annotation', 'ledger_book', 'ledger_page', 'ledger_scan'],
  certificates: ['certificate', 'certificate_request'],
  donations: ['donation'],
  intentions: ['mass_intention'],
  schedule: ['schedule'],
  marriage: ['marriage_application', 'marriage_requirement'],
  accounts: ['app_user', 'auth', 'profile', 'personnel', 'parish', 'rbac'],
};

async function fetchAuditEntries(limit = 300, { beforeId, parishId, kind, actorId, area } = {}) {
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
  if (actorId) {
    params.push(actorId);
    where.push(`a.actor_id = $${params.length}`);
  }
  if (area) {
    params.push(AREA_ENTITIES[area]);
    where.push(`split_part(a.action, '.', 1) = ANY($${params.length})`);
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

/** Reads and checks the filters shared by both logs. Returns { error } when one is not valid. */
function readFilters(query) {
  const filters = {
    beforeId: queryText(query.beforeId),
    parishId: queryText(query.parishId),
    kind: queryText(query.kind),
    actorId: queryText(query.actorId),
    area: queryText(query.area),
  };
  if (filters.beforeId && !UUID.test(filters.beforeId)) return { error: 'That is not a valid place in the log.' };
  if (filters.parishId && !UUID.test(filters.parishId)) return { error: 'That parish was not found.' };
  if (filters.kind && !KINDS.has(filters.kind)) return { error: 'Unknown kind of activity.' };
  if (filters.actorId && !UUID.test(filters.actorId)) return { error: 'That person was not found.' };
  if (filters.area && !AREA_ENTITIES[filters.area]) return { error: 'Unknown area.' };
  for (const key of Object.keys(filters)) if (!filters[key]) filters[key] = undefined;
  return { filters };
}

async function sendPage(res, filters) {
  try {
    // One extra row tells us whether there is anything older to load.
    const rows = await fetchAuditEntries(PAGE_SIZE + 1, filters);
    res.json({ entries: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/** The super admin's log: every parish, or one picked with ?parishId=. */
async function listAuditLog(req, res) {
  const { filters, error } = readFilters(req.query);
  if (error) return res.status(400).json({ error });
  return sendPage(res, filters);
}

/** A parish admin's Activity page: always their own parish, whatever ?parishId= says. */
async function listParishActivity(req, res) {
  const { filters, error } = readFilters(req.query);
  if (error) return res.status(400).json({ error });
  return sendPage(res, { ...filters, parishId: req.parishId });
}

module.exports = { listAuditLog, listParishActivity, fetchAuditEntries };
