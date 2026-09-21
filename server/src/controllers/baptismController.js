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
const { findParishRecord } = require('../utils/recordQuery');

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

async function createBaptism(req, res) {
  const body = req.body || {};

  try {
    const firstName = requiredText(body.firstName, 'First name');
    const middleName = requiredText(body.middleName, 'Middle name');
    const lastName = requiredText(body.lastName, 'Last name');
    const dateOfBirth = dateValue(body.dateOfBirth, 'Date of birth');
    const dateOfBaptism = dateValue(body.dateOfBaptism, 'Date of baptism');
    const placeOfBaptism = requiredText(body.placeOfBaptism, 'Place of baptism');
    const minister = requiredText(body.minister, 'Minister');
    const fatherLastName = requiredText(body.fatherLastName, "Father's last name");
    const fatherFirstName = requiredText(body.fatherFirstName, "Father's first name");
    const motherLastName = requiredText(body.motherLastName, "Mother's last name");
    const motherFirstName = requiredText(body.motherFirstName, "Mother's first name");
    const paternalGrandfather = requiredText(body.paternalGrandfather, 'Paternal grandfather');
    const paternalGrandmother = requiredText(body.paternalGrandmother, 'Paternal grandmother');
    const maternalGrandfather = requiredText(body.maternalGrandfather, 'Maternal grandfather');
    const maternalGrandmother = requiredText(body.maternalGrandmother, 'Maternal grandmother');
    const bookNumber = requiredText(body.bookNumber, 'Book number');
    const pageNumber = requiredText(body.pageNumber, 'Page number');
    const entryNumber = requiredText(body.entryNumber, 'Entry number');

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
        firstName,
        middleName,
        lastName,
        optionalText(body.sex),
        dateOfBirth,
        optionalText(body.placeOfBirth),
        dateOfBaptism,
        placeOfBaptism,
        legitimacyToDb(body.legitimacyStatus),
        optionalText(body.address),
        minister,
        fatherLastName,
        fatherFirstName,
        motherLastName,
        motherFirstName,
        paternalGrandfather,
        paternalGrandmother,
        maternalGrandfather,
        maternalGrandmother,
        Boolean(body.withMarriageCertificate),
        Boolean(body.withBirthCertificate),
        bookNumber,
        pageNumber,
        entryNumber,
        optionalText(body.remarks),
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
      metadata: { bookNumber, pageNumber, entryNumber },
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
       WHERE parish_id = $1
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
    res.json({ record: toBaptismalRecord(row) });
  } catch (err) {
    return sendRecordError(res, err);
  }
}

module.exports = { createBaptism, listBaptisms, getBaptism, toBaptismalRecord };
