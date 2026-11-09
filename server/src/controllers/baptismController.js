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
const { parseGodparents, saveGodparents, listGodparents } = require('../utils/baptismGodparents');

// Runs fn with one connection inside a transaction, so a baptism and its godparents are
// saved together or not at all.
async function inTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

const LEGITIMACY = {
  legitimate: 'Legitimate',
  illegitimate: 'Illegitimate',
  natural: 'Natural',
};

function legitimacyToDb(value) {
  if (value == null || String(value).trim() === '') return null;
  const key = String(value).trim().toLowerCase();
  if (key === 'natural' || !LEGITIMACY[key]) {
    throw httpError(400, 'Legitimacy status is not valid.');
  }
  return key;
}

function toBaptismalRecord(row) {
  return {
    id: row.id,
    parishId: row.parish_id,
    firstName: row.first_name,
    middleName: row.middle_name || '',
    lastName: row.last_name,
    sex: row.sex || undefined,
    dateOfBirth: dateOnly(row.date_of_birth),
    placeOfBirth: row.place_of_birth || undefined,
    dateOfBaptism: dateOnly(row.date_of_baptism),
    placeOfBaptism: row.place_of_baptism,
    legitimacyStatus: LEGITIMACY[row.status] || undefined,
    address: row.address || undefined,
    minister: row.minister,
    fatherLastName: row.father_last_name || '',
    fatherFirstName: row.father_first_name || '',
    motherLastName: row.mother_last_name || '',
    motherFirstName: row.mother_first_name || '',
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
    godparents: [],
    ledgerPageId: row.ledger_page_id || undefined,
    ledgerRow: row.ledger_row ?? undefined,
  };
}

// Where a record came from on a scanned register page: { pageId, row } or null. The page
// must belong to this parish, and each row of a page becomes one record at most.
async function parseLedgerSource(db, parishId, body) {
  if (!body.ledgerPageId) return null;
  const row = Number(body.ledgerRow);
  if (!Number.isInteger(row) || row < 1) throw httpError(400, 'Say which row of the register page this record is.');
  const page = await db.query('SELECT id FROM ledger_page WHERE id::text = $1 AND parish_id = $2', [
    String(body.ledgerPageId),
    parishId,
  ]);
  if (!page.rows.length) throw httpError(400, 'That register page was not found.');
  const taken = await db.query(
    'SELECT id FROM baptism WHERE ledger_page_id = $1 AND ledger_row = $2 AND archived_at IS NULL',
    [page.rows[0].id, row],
  );
  if (taken.rows.length) throw httpError(409, `Row ${row} of this page is already a record.`);
  return { pageId: page.rows[0].id, row };
}

// What a baptism entry must hold follows can. 877 of the Code of Canon Law: the person,
// minister, place and date of baptism, and date of birth. Parents are entered only as the
// canon allows (an unmarried mother's child may have no father recorded; a foundling no
// parents), grandparents aren't asked for, and old registers often give only a middle initial.
function parent(body, who) {
  const first = optionalText(body[`${who.toLowerCase()}FirstName`]);
  const last = optionalText(body[`${who.toLowerCase()}LastName`]);
  if (first && !last) throw httpError(400, `${who}'s last name is required when a first name is given.`);
  return { first, last };
}

function parseBaptismBody(body) {
  const father = parent(body, 'Father');
  const mother = parent(body, 'Mother');
  const remarks = optionalText(body.remarks);
  if (!father.last && !mother.last && !remarks) {
    throw httpError(
      400,
      'Both parents are blank. Add a remark saying why (for a foundling: when, where and by whom the child was found).',
    );
  }
  return {
    firstName: requiredText(body.firstName, 'First name'),
    middleName: optionalText(body.middleName),
    lastName: requiredText(body.lastName, 'Last name'),
    sex: optionalText(body.sex),
    dateOfBirth: dateValue(body.dateOfBirth, 'Date of birth'),
    placeOfBirth: optionalText(body.placeOfBirth),
    dateOfBaptism: dateValue(body.dateOfBaptism, 'Date of baptism'),
    placeOfBaptism: requiredText(body.placeOfBaptism, 'Place of baptism'),
    legitimacyStatus: legitimacyToDb(body.legitimacyStatus),
    address: optionalText(body.address),
    minister: requiredText(body.minister, 'Minister'),
    fatherLastName: father.last,
    fatherFirstName: father.first,
    motherLastName: mother.last,
    motherFirstName: mother.first,
    paternalGrandfather: optionalText(body.paternalGrandfather),
    paternalGrandmother: optionalText(body.paternalGrandmother),
    maternalGrandfather: optionalText(body.maternalGrandfather),
    maternalGrandmother: optionalText(body.maternalGrandmother),
    withMarriageCertificate: Boolean(body.withMarriageCertificate),
    withBirthCertificate: Boolean(body.withBirthCertificate),
    bookNumber: requiredText(body.bookNumber, 'Book number'),
    pageNumber: requiredText(body.pageNumber, 'Page number'),
    entryNumber: requiredText(body.entryNumber, 'Entry number'),
    remarks,
  };
}

async function createBaptism(req, res) {
  try {
    const fields = parseBaptismBody(req.body || {});
    const godparents = parseGodparents((req.body || {}).godparents) || [];

    const record = await inTransaction(async (db) => {
      const source = await parseLedgerSource(db, req.parishId, req.body || {});
      const inserted = await db.query(
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
        ],
      );
      if (source) {
        await db.query('UPDATE baptism SET ledger_page_id = $2, ledger_row = $3 WHERE id = $1', [
          inserted.rows[0].id,
          source.pageId,
          source.row,
        ]);
        inserted.rows[0].ledger_page_id = source.pageId;
        inserted.rows[0].ledger_row = source.row;
      }
      const created = toBaptismalRecord(inserted.rows[0]);
      await saveGodparents(db, created.id, godparents);
      created.godparents = await listGodparents(db, created.id);
      return created;
    });

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
      [req.parishId],
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
    if (row.encoded_by) {
      const encoder = await pool.query(
        `SELECT NULLIF(trim(concat_ws(' ', first_name, last_name)), '') AS name FROM app_user WHERE id = $1`,
        [row.encoded_by],
      );
      record.encodedByName = encoder.rows[0]?.name || undefined;
    }
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
    record.godparents = await listGodparents(pool, row.id);
    if (row.ledger_page_id) {
      const source = await pool.query(
        `SELECT p.id, p.page_number, b.id AS book_id, b.title
         FROM ledger_page p JOIN ledger_book b ON b.id = p.book_id WHERE p.id = $1`,
        [row.ledger_page_id],
      );
      const s = source.rows[0];
      if (s) {
        record.ledgerSource = {
          pageId: s.id,
          bookId: s.book_id,
          bookTitle: s.title,
          pageNumber: s.page_number,
          row: row.ledger_row,
        };
      }
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
    const godparents = parseGodparents((req.body || {}).godparents);
    const updated = await inTransaction(async (db) => {
      const result = await db.query(
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
        ],
      );
      // Godparents are left as they are when the request doesn't send them.
      if (godparents) await saveGodparents(db, current.id, godparents);
      return result;
    });
    const record = toBaptismalRecord(updated.rows[0]);
    record.godparents = await listGodparents(pool, record.id);
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
