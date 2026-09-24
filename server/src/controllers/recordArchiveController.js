const pool = require('../config/db');
const { writeAudit } = require('../utils/audit');
const { sendRecordError } = require('../utils/recordFields');
const { findParishRecord } = require('../utils/recordQuery');

const TABLES = {
  baptism: 'baptism',
  confirmation: 'confirmation',
  marriage: 'marriage',
  death: 'death',
};

function setRecordArchived(recordType, archived) {
  const table = TABLES[recordType];
  if (!table) {
    throw new Error(`Unknown record type: ${recordType}`);
  }

  return async function handle(req, res) {
    try {
      const current = await findParishRecord(pool, recordType, req.parishId, req.params.id);
      if (!current) {
        return res.status(404).json({ error: 'Record not found.' });
      }

      const isArchived = Boolean(current.archived_at);
      if (archived !== isArchived) {
        await pool.query(
          `UPDATE ${table}
           SET archived_at = ${archived ? 'NOW()' : 'NULL'}, updated_at = NOW()
           WHERE id = $1 AND parish_id = $2`,
          [current.id, req.parishId]
        );
        await writeAudit({
          parishId: req.parishId,
          actorId: req.user.id,
          action: archived ? `${recordType}.archived` : `${recordType}.restored`,
          entityType: recordType,
          entityId: current.id,
          metadata: {
            bookNumber: current.book_number,
            pageNumber: current.page_number,
            entryNumber: current.entry_number,
          },
        });
      }

      res.json({ ok: true, status: archived ? 'Archived' : 'Active' });
    } catch (err) {
      return sendRecordError(res, err);
    }
  };
}

function archiveRecord(recordType) {
  return setRecordArchived(recordType, true);
}

function unarchiveRecord(recordType) {
  return setRecordArchived(recordType, false);
}

module.exports = { archiveRecord, unarchiveRecord };
