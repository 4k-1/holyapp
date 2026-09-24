const pool = require('../config/db');
const { writeAudit } = require('../utils/audit');
const { annotateFromSacrament } = require('../utils/baptismAnnotation');
const {
  requiredText,
  optionalText,
  dateValue,
  dateOnly,
  optionalUuid,
  sendRecordError,
  httpError,
  recordStatus,
} = require('../utils/recordFields');
const { findParishRecord, archivedListClause } = require('../utils/recordQuery');
const { listRecordCertificates } = require('./certificateController');

function toConfirmationRecord(row) {
  return {
    id: row.id,
    parishId: row.parish_id,
    firstName: row.first_name,
    middleName: row.middle_name,
    lastName: row.last_name,
    sex: row.sex || undefined,
    dateOfBirth: dateOnly(row.date_of_birth) || undefined,
    address: row.address || undefined,
    fatherLastName: row.father_last_name || undefined,
    fatherFirstName: row.father_first_name || undefined,
    motherLastName: row.mother_last_name || undefined,
    motherFirstName: row.mother_first_name || undefined,
    dateOfConfirmation: dateOnly(row.date_of_confirmation),
    placeOfConfirmation: row.place_of_confirmation,
    minister: row.minister,
    baptismalRecordId: row.baptismal_record_id || undefined,
    baptismDate: dateOnly(row.baptism_date) || undefined,
    baptismPlace: row.baptism_place || undefined,
    isPriorMarriage: Boolean(row.is_prior_marriage),
    isAdult: Boolean(row.is_adult),
    bookNumber: row.book_number,
    pageNumber: row.page_number,
    entryNumber: row.entry_number,
    remarks: row.remarks || undefined,
    encodedBy: row.encoded_by,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    status: recordStatus(row.archived_at),
    certificates: [],
  };
}

async function resolveBaptismalRecordId(parishId, value) {
  const baptismalRecordId = optionalUuid(value);
  if (!baptismalRecordId) return null;

  const found = await pool.query(
    'SELECT id FROM baptism WHERE id = $1 AND parish_id = $2',
    [baptismalRecordId, parishId]
  );
  if (!found.rowCount) {
    throw httpError(400, 'That baptismal record was not found in this parish.');
  }
  return baptismalRecordId;
}

async function parseConfirmationBody(parishId, body) {
  return {
    firstName: requiredText(body.firstName, 'First name'),
    middleName: requiredText(body.middleName, 'Middle name'),
    lastName: requiredText(body.lastName, 'Last name'),
    sex: optionalText(body.sex),
    dateOfBirth: dateValue(body.dateOfBirth, 'Date of birth', { required: false }),
    address: optionalText(body.address),
    fatherLastName: optionalText(body.fatherLastName),
    fatherFirstName: optionalText(body.fatherFirstName),
    motherLastName: optionalText(body.motherLastName),
    motherFirstName: optionalText(body.motherFirstName),
    dateOfConfirmation: dateValue(body.dateOfConfirmation, 'Date of confirmation'),
    placeOfConfirmation: requiredText(body.placeOfConfirmation, 'Place of confirmation'),
    minister: requiredText(body.minister, 'Minister'),
    baptismalRecordId: await resolveBaptismalRecordId(parishId, body.baptismalRecordId),
    baptismDate: dateValue(body.baptismDate, 'Baptismal date', { required: false }),
    baptismPlace: optionalText(body.baptismPlace),
    isPriorMarriage: Boolean(body.isPriorMarriage),
    isAdult: Boolean(body.isAdult),
    bookNumber: requiredText(body.bookNumber, 'Book number'),
    pageNumber: requiredText(body.pageNumber, 'Page number'),
    entryNumber: requiredText(body.entryNumber, 'Entry number'),
    remarks: optionalText(body.remarks),
  };
}

async function createConfirmation(req, res) {
  const body = req.body || {};

  try {
    const fields = await parseConfirmationBody(req.parishId, body);

    const inserted = await pool.query(
      `INSERT INTO confirmation (
         parish_id, first_name, middle_name, last_name, sex,
         date_of_birth, address,
         father_last_name, father_first_name, mother_last_name, mother_first_name,
         date_of_confirmation, place_of_confirmation, minister,
         baptismal_record_id, baptism_date, baptism_place,
         is_prior_marriage, is_adult,
         book_number, page_number, entry_number, remarks, encoded_by
       )
       VALUES (
         $1, $2, $3, $4, $5,
         $6, $7,
         $8, $9, $10, $11,
         $12, $13, $14,
         $15, $16, $17,
         $18, $19,
         $20, $21, $22, $23, $24
       )
       RETURNING *`,
      [
        req.parishId,
        fields.firstName,
        fields.middleName,
        fields.lastName,
        fields.sex,
        fields.dateOfBirth,
        fields.address,
        fields.fatherLastName,
        fields.fatherFirstName,
        fields.motherLastName,
        fields.motherFirstName,
        fields.dateOfConfirmation,
        fields.placeOfConfirmation,
        fields.minister,
        fields.baptismalRecordId,
        fields.baptismDate,
        fields.baptismPlace,
        fields.isPriorMarriage,
        fields.isAdult,
        fields.bookNumber,
        fields.pageNumber,
        fields.entryNumber,
        fields.remarks,
        req.user.id,
      ]
    );

    const record = toConfirmationRecord(inserted.rows[0]);
    await annotateFromSacrament(pool, {
      parishId: req.parishId,
      baptismId: fields.baptismalRecordId,
      annotationType: 'confirmation',
      referenceRecordId: record.id,
      actorId: req.user.id,
      notes: optionalText(body.annotationNote) || `Confirmed at ${fields.placeOfConfirmation}.`,
      eventDate: fields.dateOfConfirmation,
      bookNumber: fields.bookNumber,
      pageNumber: fields.pageNumber,
      entryNumber: fields.entryNumber,
    });
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'confirmation.created',
      entityType: 'confirmation',
      entityId: record.id,
      metadata: { bookNumber: fields.bookNumber, pageNumber: fields.pageNumber, entryNumber: fields.entryNumber },
    });

    res.status(201).json({ record });
  } catch (err) {
    return sendRecordError(res, err);
  }
}

async function listConfirmations(req, res) {
  try {
    const result = await pool.query(
      `SELECT * FROM confirmation
       WHERE parish_id = $1 ${archivedListClause(req)}
       ORDER BY date_of_confirmation DESC, created_at DESC`,
      [req.parishId]
    );
    res.json({ records: result.rows.map(toConfirmationRecord) });
  } catch (err) {
    return sendRecordError(res, err);
  }
}

async function getConfirmation(req, res) {
  try {
    const row = await findParishRecord(pool, 'confirmation', req.parishId, req.params.id);
    if (!row) {
      return res.status(404).json({ error: 'Record not found.' });
    }
    const record = toConfirmationRecord(row);
    record.certificates = await listRecordCertificates(req.parishId, 'confirmation', row.id);
    res.json({ record });
  } catch (err) {
    return sendRecordError(res, err);
  }
}

async function updateConfirmation(req, res) {
  try {
    const current = await findParishRecord(pool, 'confirmation', req.parishId, req.params.id);
    if (!current) {
      return res.status(404).json({ error: 'Record not found.' });
    }
    const fields = await parseConfirmationBody(req.parishId, req.body || {});
    const updated = await pool.query(
      `UPDATE confirmation
       SET first_name = $1,
           middle_name = $2,
           last_name = $3,
           sex = $4,
           date_of_birth = $5,
           address = $6,
           father_last_name = $7,
           father_first_name = $8,
           mother_last_name = $9,
           mother_first_name = $10,
           date_of_confirmation = $11,
           place_of_confirmation = $12,
           minister = $13,
           baptismal_record_id = $14,
           baptism_date = $15,
           baptism_place = $16,
           is_prior_marriage = $17,
           is_adult = $18,
           book_number = $19,
           page_number = $20,
           entry_number = $21,
           remarks = $22,
           updated_at = NOW()
       WHERE id = $23 AND parish_id = $24
       RETURNING *`,
      [
        fields.firstName,
        fields.middleName,
        fields.lastName,
        fields.sex,
        fields.dateOfBirth,
        fields.address,
        fields.fatherLastName,
        fields.fatherFirstName,
        fields.motherLastName,
        fields.motherFirstName,
        fields.dateOfConfirmation,
        fields.placeOfConfirmation,
        fields.minister,
        fields.baptismalRecordId,
        fields.baptismDate,
        fields.baptismPlace,
        fields.isPriorMarriage,
        fields.isAdult,
        fields.bookNumber,
        fields.pageNumber,
        fields.entryNumber,
        fields.remarks,
        current.id,
        req.parishId,
      ]
    );
    const record = toConfirmationRecord(updated.rows[0]);
    record.certificates = await listRecordCertificates(req.parishId, 'confirmation', record.id);
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'confirmation.updated',
      entityType: 'confirmation',
      entityId: record.id,
      metadata: { bookNumber: fields.bookNumber, pageNumber: fields.pageNumber, entryNumber: fields.entryNumber },
    });
    res.json({ record });
  } catch (err) {
    return sendRecordError(res, err);
  }
}

module.exports = {
  createConfirmation,
  listConfirmations,
  getConfirmation,
  updateConfirmation,
  toConfirmationRecord,
};
