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
} = require('../utils/recordFields');

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
    status: 'Active',
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

async function createConfirmation(req, res) {
  const body = req.body || {};

  try {
    const firstName = requiredText(body.firstName, 'First name');
    const middleName = requiredText(body.middleName, 'Middle name');
    const lastName = requiredText(body.lastName, 'Last name');
    const dateOfConfirmation = dateValue(body.dateOfConfirmation, 'Date of confirmation');
    const placeOfConfirmation = requiredText(body.placeOfConfirmation, 'Place of confirmation');
    const minister = requiredText(body.minister, 'Minister');
    const bookNumber = requiredText(body.bookNumber, 'Book number');
    const pageNumber = requiredText(body.pageNumber, 'Page number');
    const entryNumber = requiredText(body.entryNumber, 'Entry number');
    const baptismalRecordId = await resolveBaptismalRecordId(req.parishId, body.baptismalRecordId);

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
        firstName,
        middleName,
        lastName,
        optionalText(body.sex),
        dateValue(body.dateOfBirth, 'Date of birth', { required: false }),
        optionalText(body.address),
        optionalText(body.fatherLastName),
        optionalText(body.fatherFirstName),
        optionalText(body.motherLastName),
        optionalText(body.motherFirstName),
        dateOfConfirmation,
        placeOfConfirmation,
        minister,
        baptismalRecordId,
        dateValue(body.baptismDate, 'Baptismal date', { required: false }),
        optionalText(body.baptismPlace),
        Boolean(body.isPriorMarriage),
        Boolean(body.isAdult),
        bookNumber,
        pageNumber,
        entryNumber,
        optionalText(body.remarks),
        req.user.id,
      ]
    );

    const record = toConfirmationRecord(inserted.rows[0]);
    await annotateFromSacrament(pool, {
      parishId: req.parishId,
      baptismId: baptismalRecordId,
      annotationType: 'confirmation',
      referenceRecordId: record.id,
      actorId: req.user.id,
      notes: optionalText(body.annotationNote) || `Confirmed at ${placeOfConfirmation}.`,
      eventDate: dateOfConfirmation,
      bookNumber,
      pageNumber,
      entryNumber,
    });
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'confirmation.created',
      entityType: 'confirmation',
      entityId: record.id,
      metadata: { bookNumber, pageNumber, entryNumber },
    });

    res.status(201).json({ record });
  } catch (err) {
    return sendRecordError(res, err);
  }
}

module.exports = { createConfirmation, toConfirmationRecord };
