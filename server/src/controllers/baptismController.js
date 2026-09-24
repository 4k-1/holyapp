const pool = require('../config/db');
const { writeAudit } = require('../utils/audit');
const {
  requiredText,
  optionalText,
  dateValue,
  dateOnly,
  sendRecordError,
  httpError,
  recordStatus,
} = require('../utils/recordFields');
const { findParishRecord, archivedListClause } = require('../utils/recordQuery');
const { listRecordCertificates } = require('./certificateController');
const { listBaptismAnnotations } = require('../utils/baptismAnnotation');

const LEGITIMACY = {
  legitimate: 'Legitimate',
  illegitimate: 'Illegitimate',
  natural: 'Natural',
};

function legitimacyToDb(value) {
  if (value == null || String(value).trim() === '') return null;
  const key = String(value).trim().toLowerCase();
  if (!LEGITIMACY[key]) {
    throw httpError(400, 'Legitimacy status is not valid.');
  }
  return key;
}

function toBaptismalRecord(row) {
  return {
    id: row.id,
    parishId: row.parish_id,
    firstName: row.first_name,
    middleName: row.middle_name,
    lastName: row.last_name,
    sex: row.sex || undefined,
    dateOfBirth: dateOnly(row.date_of_birth),
    placeOfBirth: row.place_of_birth || undefined,
    dateOfBaptism: dateOnly(row.date_of_baptism),
    placeOfBaptism: row.place_of_baptism,
    legitimacyStatus: LEGITIMACY[row.status] || undefined,
    address: row.address || undefined,
    minister: row.minister,
    fatherLastName: row.father_last_name,
    fatherFirstName: row.father_first_name,
    motherLastName: row.mother_last_name,
    motherFirstName: row.mother_first_name,
    paternalGrandfather: row.paternal_grandfather || '',
    paternalGrandmother: row.paternal_grandmother || '',
    maternalGrandfather: row.maternal_grandfather || '',
    maternalGrandmother: row.maternal_grandmother || '',
    withMarriageCertificate: Boolean(row.with_marriage_certificate),
    withBirthCertificate: Boolean(row.with_birth_certificate),
    bookNumber: row.book_number,
    pageNumber: row.page_number,
    entryNumber: row.entry_number,
    remarks: row.remarks || undefined,
    encodedBy: row.encoded_by,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    status: recordStatus(row.archived_at),
    certificates: [],
    annotations: [],
  };
}

function parseBaptismBody(body) {
  return {
    firstName: requiredText(body.firstName, 'First name'),
    middleName: requiredText(body.middleName, 'Middle name'),
    lastName: requiredText(body.lastName, 'Last name'),
    sex: optionalText(body.sex),
    dateOfBirth: dateValue(body.dateOfBirth, 'Date of birth'),
    placeOfBirth: optionalText(body.placeOfBirth),
    dateOfBaptism: dateValue(body.dateOfBaptism, 'Date of baptism'),
    placeOfBaptism: requiredText(body.placeOfBaptism, 'Place of baptism'),
    legitimacyStatus: legitimacyToDb(body.legitimacyStatus),
    address: optionalText(body.address),
    minister: requiredText(body.minister, 'Minister'),
    fatherLastName: requiredText(body.fatherLastName, "Father's last name"),
    fatherFirstName: requiredText(body.fatherFirstName, "Father's first name"),
    motherLastName: requiredText(body.motherLastName, "Mother's last name"),
    motherFirstName: requiredText(body.motherFirstName, "Mother's first name"),
    paternalGrandfather: requiredText(body.paternalGrandfather, 'Paternal grandfather'),
    paternalGrandmother: requiredText(body.paternalGrandmother, 'Paternal grandmother'),
    maternalGrandfather: requiredText(body.maternalGrandfather, 'Maternal grandfather'),
    maternalGrandmother: requiredText(body.maternalGrandmother, 'Maternal grandmother'),
    withMarriageCertificate: Boolean(body.withMarriageCertificate),
    withBirthCertificate: Boolean(body.withBirthCertificate),
    bookNumber: requiredText(body.bookNumber, 'Book number'),
    pageNumber: requiredText(body.pageNumber, 'Page number'),
    entryNumber: requiredText(body.entryNumber, 'Entry number'),
    remarks: optionalText(body.remarks),
  };
}

async function createBaptism(req, res) {
  try {
    const fields = parseBaptismBody(req.body || {});

    const inserted = await pool.query(
      `INSERT INTO baptism (
         parish_id, first_name, middle_name, last_name, sex,
         date_of_birth, place_of_birth, date_of_baptism, place_of_baptism,
         status, address, minister,
         father_last_name, father_first_name, mother_last_name, mother_first_name,
         paternal_grandfather, paternal_grandmother, maternal_grandfather, maternal_grandmother,
         with_marriage_certificate, with_birth_certificate,
         book_number, page_number, entry_number, remarks, encoded_by
       )
       VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8, $9,
         $10, $11, $12,
         $13, $14, $15, $16,
         $17, $18, $19, $20,
         $21, $22,
         $23, $24, $25, $26, $27
       )
       RETURNING *`,
      [
        req.parishId,
        fields.firstName,
        fields.middleName,
        fields.lastName,
        fields.sex,
        fields.dateOfBirth,
        fields.placeOfBirth,
        fields.dateOfBaptism,
        fields.placeOfBaptism,
        fields.legitimacyStatus,
        fields.address,
        fields.minister,
        fields.fatherLastName,
        fields.fatherFirstName,
        fields.motherLastName,
        fields.motherFirstName,
        fields.paternalGrandfather,
        fields.paternalGrandmother,
        fields.maternalGrandfather,
        fields.maternalGrandmother,
        fields.withMarriageCertificate,
        fields.withBirthCertificate,
        fields.bookNumber,
        fields.pageNumber,
        fields.entryNumber,
        fields.remarks,
        req.user.id,
      ]
    );

    const record = toBaptismalRecord(inserted.rows[0]);
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'baptism.created',
      entityType: 'baptism',
      entityId: record.id,
      metadata: { bookNumber: fields.bookNumber, pageNumber: fields.pageNumber, entryNumber: fields.entryNumber },
    });

    res.status(201).json({ record });
  } catch (err) {
    return sendRecordError(res, err);
  }
}

async function listBaptisms(req, res) {
  try {
    const result = await pool.query(
      `SELECT * FROM baptism
       WHERE parish_id = $1 ${archivedListClause(req)}
       ORDER BY date_of_baptism DESC, created_at DESC`,
      [req.parishId]
    );
    res.json({ records: result.rows.map(toBaptismalRecord) });
  } catch (err) {
    return sendRecordError(res, err);
  }
}

async function getBaptism(req, res) {
  try {
    const row = await findParishRecord(pool, 'baptism', req.parishId, req.params.id);
    if (!row) {
      return res.status(404).json({ error: 'Record not found.' });
    }
    const record = toBaptismalRecord(row);
    try {
      record.annotations = await listBaptismAnnotations(pool, row.id);
    } catch (annotationErr) {
      console.error('listBaptismAnnotations failed', annotationErr);
      record.annotations = [];
    }
    try {
      record.certificates = await listRecordCertificates(req.parishId, 'baptism', row.id);
    } catch (certErr) {
      console.error('listRecordCertificates failed', certErr);
      record.certificates = [];
    }
    res.json({ record });
  } catch (err) {
    return sendRecordError(res, err);
  }
}

async function updateBaptism(req, res) {
  try {
    const current = await findParishRecord(pool, 'baptism', req.parishId, req.params.id);
    if (!current) {
      return res.status(404).json({ error: 'Record not found.' });
    }
    const fields = parseBaptismBody(req.body || {});
    const updated = await pool.query(
      `UPDATE baptism
       SET first_name = $1,
           middle_name = $2,
           last_name = $3,
           sex = $4,
           date_of_birth = $5,
           place_of_birth = $6,
           date_of_baptism = $7,
           place_of_baptism = $8,
           status = $9,
           address = $10,
           minister = $11,
           father_last_name = $12,
           father_first_name = $13,
           mother_last_name = $14,
           mother_first_name = $15,
           paternal_grandfather = $16,
           paternal_grandmother = $17,
           maternal_grandfather = $18,
           maternal_grandmother = $19,
           with_marriage_certificate = $20,
           with_birth_certificate = $21,
           book_number = $22,
           page_number = $23,
           entry_number = $24,
           remarks = $25,
           updated_at = NOW()
       WHERE id = $26 AND parish_id = $27
       RETURNING *`,
      [
        fields.firstName,
        fields.middleName,
        fields.lastName,
        fields.sex,
        fields.dateOfBirth,
        fields.placeOfBirth,
        fields.dateOfBaptism,
        fields.placeOfBaptism,
        fields.legitimacyStatus,
        fields.address,
        fields.minister,
        fields.fatherLastName,
        fields.fatherFirstName,
        fields.motherLastName,
        fields.motherFirstName,
        fields.paternalGrandfather,
        fields.paternalGrandmother,
        fields.maternalGrandfather,
        fields.maternalGrandmother,
        fields.withMarriageCertificate,
        fields.withBirthCertificate,
        fields.bookNumber,
        fields.pageNumber,
        fields.entryNumber,
        fields.remarks,
        current.id,
        req.parishId,
      ]
    );
    const record = toBaptismalRecord(updated.rows[0]);
    record.annotations = await listBaptismAnnotations(pool, record.id);
    record.certificates = await listRecordCertificates(req.parishId, 'baptism', record.id);
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'baptism.updated',
      entityType: 'baptism',
      entityId: record.id,
      metadata: { bookNumber: fields.bookNumber, pageNumber: fields.pageNumber, entryNumber: fields.entryNumber },
    });
    res.json({ record });
  } catch (err) {
    return sendRecordError(res, err);
  }
}

module.exports = { createBaptism, listBaptisms, getBaptism, updateBaptism, toBaptismalRecord };
