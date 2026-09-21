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

module.exports = { findParishRecord };
