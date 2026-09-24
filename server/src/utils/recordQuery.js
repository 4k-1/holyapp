const { optionalUuid } = require('./recordFields');

const TABLES = {
  baptism: 'baptism',
  confirmation: 'confirmation',
  marriage: 'marriage',
  death: 'death',
};

async function findParishRecord(db, table, parishId, id) {
  const name = TABLES[table];
  if (!name) {
    throw new Error(`Unknown record table: ${table}`);
  }
  const uuid = optionalUuid(id);
  if (!uuid) return null;
  const result = await db.query(`SELECT * FROM ${name} WHERE id = $1 AND parish_id = $2`, [
    uuid,
    parishId,
  ]);
  return result.rows[0] || null;
}

function archivedListClause(req) {
  const archived = req.query.archived === '1' || req.query.archived === 'true';
  return archived ? 'AND archived_at IS NOT NULL' : 'AND archived_at IS NULL';
}

module.exports = { findParishRecord, archivedListClause };
