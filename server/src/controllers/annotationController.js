const pool = require('../config/db');
const { writeAudit } = require('../utils/audit');
const { findParishRecord } = require('../utils/recordQuery');
const {
  requiredText,
  optionalText,
  dateValue,
  optionalUuid,
  sendRecordError,
  httpError,
} = require('../utils/recordFields');
const { toBaptismalRecord } = require('./baptismController');
const { listRecordCertificates } = require('./certificateController');
const {
  listBaptismAnnotations,
  insertManualAnnotation,
} = require('../utils/baptismAnnotation');

const CATEGORY_TO_TYPE = {
  Confirmation: 'confirmation',
  Marriage: 'marriage',
  Death: 'death',
  Other: 'other',
};

const RECORD_TABLES = {
  confirmation: 'confirmation',
  marriage: 'marriage',
  death: 'death',
};

async function baptismWithAnnotations(parishId, baptismId) {
  const row = await findParishRecord(pool, 'baptism', parishId, baptismId);
  if (!row) return null;
  const record = toBaptismalRecord(row);
  record.annotations = await listBaptismAnnotations(pool, row.id);
  record.certificates = await listRecordCertificates(parishId, 'baptism', row.id);
  return record;
}

async function registerInParish(parishId, recordType, recordId) {
  const table = RECORD_TABLES[recordType];
  if (!table || !recordId) return null;
  const found = await pool.query(
    `SELECT id, book_number, page_number, entry_number
     FROM ${table}
     WHERE id = $1 AND parish_id = $2`,
    [recordId, parishId]
  );
  return found.rows[0] || null;
}

async function createBaptismAnnotation(req, res) {
  const body = req.body || {};

  try {
    const baptism = await findParishRecord(pool, 'baptism', req.parishId, req.params.id);
    if (!baptism) {
      return res.status(404).json({ error: 'Record not found.' });
    }

    const category = requiredText(body.category, 'Sacrament');
    const annotationType = CATEGORY_TO_TYPE[category];
    if (!annotationType) {
      throw httpError(400, 'Annotation type is not valid.');
    }
    const eventDate = dateValue(body.date, 'Date of sacrament');
    const notes = requiredText(body.note, 'Annotation note');
    const linked = body.linked && typeof body.linked === 'object' ? body.linked : null;

    let referenceRecordType = annotationType === 'other' ? null : annotationType;
    let referenceRecordId = null;
    let bookNumber = null;
    let pageNumber = null;
    let entryNumber = null;
    let source = 'manual';

    if (linked) {
      const linkedType = CATEGORY_TO_TYPE[linked.category] || referenceRecordType;
      if (linkedType && linkedType !== 'other') referenceRecordType = linkedType;
      const requestedId = optionalUuid(linked.recordId);
      if (requestedId) {
        const register = await registerInParish(req.parishId, referenceRecordType, requestedId);
        if (!register) {
          throw httpError(400, 'That register entry is not in this parish. Enter its book, page, and line instead.');
        }
        referenceRecordId = register.id;
        bookNumber = register.book_number;
        pageNumber = register.page_number;
        entryNumber = register.entry_number;
      } else {
        bookNumber = requiredText(linked.book, 'Book');
        pageNumber = requiredText(linked.page, 'Page');
        entryNumber = optionalText(linked.line);
        source = 'manual';
      }
    }

    await insertManualAnnotation(pool, {
      parishId: req.parishId,
      baptismId: baptism.id,
      annotationType,
      referenceRecordType,
      referenceRecordId,
      actorId: req.user.id,
      notes,
      eventDate,
      bookNumber,
      pageNumber,
      entryNumber,
      source,
    });

    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: source === 'manual' ? 'annotation.recorded' : 'annotation.linked',
      entityType: 'baptism',
      entityId: baptism.id,
      metadata: { annotationType, source },
    });

    const record = await baptismWithAnnotations(req.parishId, baptism.id);
    res.status(201).json({ record });
  } catch (err) {
    return sendRecordError(res, err);
  }
}

module.exports = { createBaptismAnnotation, baptismWithAnnotations, listBaptismAnnotations };
