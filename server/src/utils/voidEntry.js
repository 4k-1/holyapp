// Void or correct, never overwrite. Shared by every table that has the void columns
// (voided_at, voided_by, void_reason, replaces_id); see migration 029.
//
// Both functions take a client that is already inside a transaction, and write the activity log
// entry in that same transaction: a void can never be saved without its log line.

const MIN_REASON_LENGTH = 5;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Only tables listed here can be voided, so a table name never comes from a request.
const VOIDABLE_TABLES = new Set(['donation']);

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function voidReason(value) {
  const reason = typeof value === 'string' ? value.trim() : '';
  if (reason.length < MIN_REASON_LENGTH) {
    throw httpError(400, 'Say why this entry is being voided (at least a few words).');
  }
  if (reason.length > 500) throw httpError(400, 'Keep the reason under 500 characters.');
  return reason;
}

function checkTable(table) {
  if (!VOIDABLE_TABLES.has(table)) throw new Error(`${table} can't be voided.`);
}

/** Writes an activity log line inside the caller's transaction. Unlike writeAudit, a failure here fails the save. */
async function auditInTransaction(db, { parishId, actorId, action, entityType, entityId, metadata = {} }) {
  await db.query(
    `INSERT INTO audit_log (parish_id, actor_id, action, entity_type, entity_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [parishId || null, actorId, action, entityType, entityId, JSON.stringify(metadata)]
  );
}

/**
 * Marks one entry void. Returns the voided row.
 * 404 when the entry isn't in this parish; 409 when it's already void.
 */
async function voidEntry(db, { table, id, parishId, actorId, reason, metadata = {} }) {
  checkTable(table);
  const cleanReason = voidReason(reason);
  if (!UUID.test(String(id))) throw httpError(404, 'Entry not found.');
  const current = await db.query(`SELECT * FROM ${table} WHERE id = $1 AND parish_id = $2 FOR UPDATE`, [
    id,
    parishId,
  ]);
  const row = current.rows[0];
  if (!row) throw httpError(404, 'Entry not found.');
  if (row.voided_at) throw httpError(409, 'This entry has already been voided.');

  const updated = await db.query(
    `UPDATE ${table}
     SET voided_at = NOW(), voided_by = $3, void_reason = $4
     WHERE id = $1 AND parish_id = $2
     RETURNING *`,
    [id, parishId, actorId, cleanReason]
  );
  await auditInTransaction(db, {
    parishId,
    actorId,
    action: `${table}.voided`,
    entityType: table,
    entityId: id,
    metadata: { reason: cleanReason, ...metadata },
  });
  return updated.rows[0];
}

/**
 * Voids an entry and saves its replacement, linked back to it.
 * `insertReplacement(db, original)` saves the new row with replaces_id = original.id and returns it.
 */
async function correctEntry(db, { table, id, parishId, actorId, reason, insertReplacement }) {
  const original = await voidEntry(db, {
    table,
    id,
    parishId,
    actorId,
    reason,
    metadata: { corrected: true },
  });
  const replacement = await insertReplacement(db, original);
  await auditInTransaction(db, {
    parishId,
    actorId,
    action: `${table}.corrected`,
    entityType: table,
    entityId: replacement.id,
    metadata: { replaces: original.id, reason: original.void_reason },
  });
  return { original, replacement };
}

module.exports = { voidEntry, correctEntry, auditInTransaction, voidReason, VOIDABLE_TABLES };
