const pool = require('../config/db');
const { writeAudit } = require('../utils/audit');
const { annotateFromSacrament } = require('../utils/baptismAnnotation');
const {
  requiredText,
  optionalText,
  dateValue,
  dateOnly,
  timeValue,
  timeOnly,
  optionalUuid,
  sendRecordError,
  httpError,
} = require('../utils/recordFields');

const ROLE_TO_DB = {
  Groom: 'husband',
  Bride: 'wife',
  husband: 'husband',
  wife: 'wife',
};

const ROLE_FROM_DB = {
  husband: 'Groom',
  wife: 'Bride',
};

const CIVIL_FROM_DB = {
  single: 'Single',
  widowed: 'Widowed',
  divorced: 'Divorced',
  annulled: 'Annulled',
};

function roleToDb(value, label) {
  const key = String(value ?? '').trim();
  if (!ROLE_TO_DB[key]) {
    throw httpError(400, `${label} must be a groom or a bride.`);
  }
  return ROLE_TO_DB[key];
}

function civilStatusToDb(value) {
  if (value == null || String(value).trim() === '') return null;
  const key = String(value).trim().toLowerCase();
  if (!CIVIL_FROM_DB[key]) {
    throw httpError(400, 'Civil status is not valid.');
  }
  return key;
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

function partyLabel(role) {
  return role === 'husband' ? 'Groom' : 'Bride';
}

function toConsentPerson(row) {
  return {
    id: row.id,
    lastName: row.last_name || undefined,
    firstName: row.first_name || undefined,
    middleInitial: row.middle_initial || undefined,
    relation: row.relation || undefined,
    residence: row.residence || undefined,
  };
}

function toMarriageParty(row, consentPersons = []) {
  return {
    id: row.id,
    role: ROLE_FROM_DB[row.role],
    lastName: row.last_name,
    firstName: row.first_name,
    middleName: row.middle_name || undefined,
    dateOfBirth: dateOnly(row.date_of_birth),
    birthplace: row.birthplace || undefined,
    sex: row.sex || undefined,
    citizenship: row.citizenship || undefined,
    address: row.address || undefined,
    religion: row.religion || undefined,
    civilStatus: CIVIL_FROM_DB[row.civil_status] || undefined,
    baptismalRecordId: row.baptismal_record_id || undefined,
    fatherLastName: row.father_last_name || undefined,
    fatherFirstName: row.father_first_name || undefined,
    fatherMiddleInitial: row.father_middle_initial || undefined,
    fatherCitizenship: row.father_citizenship || undefined,
    motherLastName: row.mother_last_name || undefined,
    motherFirstName: row.mother_first_name || undefined,
    motherMiddleInitial: row.mother_middle_initial || undefined,
    motherCitizenship: row.mother_citizenship || undefined,
    consentPersons: consentPersons.map(toConsentPerson),
  };
}

function toMarriageRecord(row, partyRows = []) {
  return {
    id: row.id,
    parishId: row.parish_id,
    placeOfMarriage: row.place_of_marriage,
    marriageAddress: row.marriage_address || undefined,
    dateOfMarriage: dateOnly(row.date_of_marriage),
    timeOfMarriage: timeOnly(row.time_of_marriage) || undefined,
    minister: row.minister,
    witnessOne: row.witness_one,
    witnessTwo: row.witness_two,
    bookNumber: row.book_number,
    pageNumber: row.page_number,
    entryNumber: row.entry_number,
    remarks: row.remarks || undefined,
    encodedBy: row.encoded_by,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    parties: partyRows,
    status: 'Active',
    certificates: [],
  };
}

async function parseParty(parishId, party) {
  const body = party || {};
  const role = roleToDb(body.role, 'Party role');
  const label = partyLabel(role);
  const consents = Array.isArray(body.consentPersons) ? body.consentPersons : [];

  return {
    role,
    lastName: requiredText(body.lastName, `${label}'s last name`),
    firstName: requiredText(body.firstName, `${label}'s first name`),
    middleName: optionalText(body.middleName),
    dateOfBirth: dateValue(body.dateOfBirth, `${label}'s date of birth`),
    birthplace: optionalText(body.birthplace),
    sex: optionalText(body.sex),
    citizenship: optionalText(body.citizenship),
    address: optionalText(body.address),
    religion: optionalText(body.religion),
    civilStatus: civilStatusToDb(body.civilStatus),
    baptismalRecordId: await resolveBaptismalRecordId(parishId, body.baptismalRecordId),
    fatherLastName: optionalText(body.fatherLastName),
    fatherFirstName: optionalText(body.fatherFirstName),
    fatherMiddleInitial: optionalText(body.fatherMiddleInitial),
    fatherCitizenship: optionalText(body.fatherCitizenship),
    motherLastName: optionalText(body.motherLastName),
    motherFirstName: optionalText(body.motherFirstName),
    motherMiddleInitial: optionalText(body.motherMiddleInitial),
    motherCitizenship: optionalText(body.motherCitizenship),
    consentPersons: consents.filter((c) => optionalText(c?.firstName) || optionalText(c?.lastName)),
  };
}

async function createMarriage(req, res) {
  const body = req.body || {};
  const client = await pool.connect();

  try {
    const placeOfMarriage = requiredText(body.placeOfMarriage, 'Place of marriage');
    const dateOfMarriage = dateValue(body.dateOfMarriage, 'Date of marriage');
    const minister = requiredText(body.minister, 'Minister');
    const witnessOne = requiredText(body.witnessOne, 'First witness');
    const witnessTwo = requiredText(body.witnessTwo, 'Second witness');
    const bookNumber = requiredText(body.bookNumber, 'Book number');
    const pageNumber = requiredText(body.pageNumber, 'Page number');
    const entryNumber = requiredText(body.entryNumber, 'Entry number');
    const timeOfMarriage = timeValue(body.timeOfMarriage, 'Time of marriage');

    const incoming = Array.isArray(body.parties) ? body.parties : [];
    if (incoming.length !== 2) {
      throw httpError(400, 'A marriage record needs a groom and a bride.');
    }

    const parsedParties = [];
    const seenRoles = new Set();
    for (const party of incoming) {
      const parsed = await parseParty(req.parishId, party);
      if (seenRoles.has(parsed.role)) {
        throw httpError(400, 'A marriage record needs one groom and one bride.');
      }
      seenRoles.add(parsed.role);
      parsedParties.push(parsed);
    }
    if (!seenRoles.has('husband') || !seenRoles.has('wife')) {
      throw httpError(400, 'A marriage record needs a groom and a bride.');
    }

    await client.query('BEGIN');

    const insertedMarriage = await client.query(
      `INSERT INTO marriage (
         parish_id, place_of_marriage, marriage_address, date_of_marriage, time_of_marriage,
         minister, witness_one, witness_two,
         book_number, page_number, entry_number, remarks, encoded_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        req.parishId,
        placeOfMarriage,
        optionalText(body.marriageAddress),
        dateOfMarriage,
        timeOfMarriage,
        minister,
        witnessOne,
        witnessTwo,
        bookNumber,
        pageNumber,
        entryNumber,
        optionalText(body.remarks),
        req.user.id,
      ]
    );
    const marriageRow = insertedMarriage.rows[0];

    const partyRows = [];
    for (const party of parsedParties) {
      const insertedParty = await client.query(
        `INSERT INTO marriage_party (
           marriage_id, role, last_name, first_name, middle_name,
           date_of_birth, birthplace, sex, citizenship, address, religion, civil_status,
           baptismal_record_id,
           father_last_name, father_first_name, father_middle_initial, father_citizenship,
           mother_last_name, mother_first_name, mother_middle_initial, mother_citizenship
         )
         VALUES (
           $1, $2, $3, $4, $5,
           $6, $7, $8, $9, $10, $11, $12,
           $13,
           $14, $15, $16, $17,
           $18, $19, $20, $21
         )
         RETURNING *`,
        [
          marriageRow.id,
          party.role,
          party.lastName,
          party.firstName,
          party.middleName,
          party.dateOfBirth,
          party.birthplace,
          party.sex,
          party.citizenship,
          party.address,
          party.religion,
          party.civilStatus,
          party.baptismalRecordId,
          party.fatherLastName,
          party.fatherFirstName,
          party.fatherMiddleInitial,
          party.fatherCitizenship,
          party.motherLastName,
          party.motherFirstName,
          party.motherMiddleInitial,
          party.motherCitizenship,
        ]
      );
      const partyRow = insertedParty.rows[0];
      const consents = [];
      for (const consent of party.consentPersons) {
        const insertedConsent = await client.query(
          `INSERT INTO marriage_consent_person (
             marriage_party_id, last_name, first_name, middle_initial, relation, residence
           )
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            partyRow.id,
            optionalText(consent.lastName),
            optionalText(consent.firstName),
            optionalText(consent.middleInitial),
            optionalText(consent.relation),
            optionalText(consent.residence),
          ]
        );
        consents.push(insertedConsent.rows[0]);
      }
      partyRows.push(toMarriageParty(partyRow, consents));
    }

    for (const party of parsedParties) {
      const spouse = parsedParties.find((other) => other.role !== party.role);
      const spouseName = [spouse?.firstName, spouse?.lastName].filter(Boolean).join(' ');
      await annotateFromSacrament(client, {
        parishId: req.parishId,
        baptismId: party.baptismalRecordId,
        annotationType: 'marriage',
        referenceRecordId: marriageRow.id,
        actorId: req.user.id,
        notes: optionalText(body.annotationNote)
          || `Married${spouseName ? ` to ${spouseName}` : ''} at ${placeOfMarriage}.`,
        eventDate: dateOfMarriage,
        bookNumber,
        pageNumber,
        entryNumber,
      });
    }

    await client.query('COMMIT');

    const record = toMarriageRecord(marriageRow, partyRows);
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'marriage.created',
      entityType: 'marriage',
      entityId: record.id,
      metadata: { bookNumber, pageNumber, entryNumber },
    });

    res.status(201).json({ record });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // The transaction may not have started.
    }
    return sendRecordError(res, err);
  } finally {
    client.release();
  }
}

module.exports = { createMarriage, toMarriageRecord };
