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
  recordStatus,
} = require('../utils/recordFields');
const { findParishRecord, archivedListClause } = require('../utils/recordQuery');
const { scheduleEventFor, linkScheduleEvent } = require('../utils/scheduleRecordLink');
const { listRecordCertificates } = require('./certificateController');

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
    // The schedule event it was recorded from (C11), if any.
    scheduleEventId: row.schedule_event_id || null,
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
    status: recordStatus(row.archived_at),
    certificates: [],
  };
}

async function loadMarriageParties(db, marriageIds) {
  if (marriageIds.length === 0) return new Map();

  const parties = await db.query(
    `SELECT * FROM marriage_party
     WHERE marriage_id = ANY($1::uuid[])
     ORDER BY role`,
    [marriageIds]
  );
  const partyIds = parties.rows.map((row) => row.id);
  const consents =
    partyIds.length === 0
      ? { rows: [] }
      : await db.query(
          `SELECT * FROM marriage_consent_person
           WHERE marriage_party_id = ANY($1::uuid[])
           ORDER BY id`,
          [partyIds]
        );

  const consentsByParty = new Map();
  for (const row of consents.rows) {
    const list = consentsByParty.get(row.marriage_party_id) || [];
    list.push(row);
    consentsByParty.set(row.marriage_party_id, list);
  }

  const partiesByMarriage = new Map();
  for (const row of parties.rows) {
    const list = partiesByMarriage.get(row.marriage_id) || [];
    list.push(toMarriageParty(row, consentsByParty.get(row.id) || []));
    partiesByMarriage.set(row.marriage_id, list);
  }
  return partiesByMarriage;
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

async function parseMarriagePayload(parishId, body) {
  const incoming = Array.isArray(body.parties) ? body.parties : [];
  if (incoming.length !== 2) {
    throw httpError(400, 'A marriage record needs a groom and a bride.');
  }

  const parsedParties = [];
  const seenRoles = new Set();
  for (const party of incoming) {
    const parsed = await parseParty(parishId, party);
    if (seenRoles.has(parsed.role)) {
      throw httpError(400, 'A marriage record needs one groom and one bride.');
    }
    seenRoles.add(parsed.role);
    parsedParties.push(parsed);
  }
  if (!seenRoles.has('husband') || !seenRoles.has('wife')) {
    throw httpError(400, 'A marriage record needs a groom and a bride.');
  }

  return {
    placeOfMarriage: requiredText(body.placeOfMarriage, 'Place of marriage'),
    marriageAddress: optionalText(body.marriageAddress),
    dateOfMarriage: dateValue(body.dateOfMarriage, 'Date of marriage'),
    timeOfMarriage: timeValue(body.timeOfMarriage, 'Time of marriage'),
    minister: requiredText(body.minister, 'Minister'),
    witnessOne: requiredText(body.witnessOne, 'First witness'),
    witnessTwo: requiredText(body.witnessTwo, 'Second witness'),
    bookNumber: requiredText(body.bookNumber, 'Book number'),
    pageNumber: requiredText(body.pageNumber, 'Page number'),
    entryNumber: requiredText(body.entryNumber, 'Entry number'),
    remarks: optionalText(body.remarks),
    parsedParties,
  };
}

async function insertMarriageParties(client, marriageId, parsedParties) {
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
        marriageId,
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
  return partyRows;
}

async function createMarriage(req, res) {
  const body = req.body || {};
  const client = await pool.connect();

  try {
    const fields = await parseMarriagePayload(req.parishId, body);
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
        fields.placeOfMarriage,
        fields.marriageAddress,
        fields.dateOfMarriage,
        fields.timeOfMarriage,
        fields.minister,
        fields.witnessOne,
        fields.witnessTwo,
        fields.bookNumber,
        fields.pageNumber,
        fields.entryNumber,
        fields.remarks,
        req.user.id,
      ]
    );
    const marriageRow = insertedMarriage.rows[0];
    const eventId = await scheduleEventFor(client, { parishId: req.parishId, table: 'marriage', body });
    await linkScheduleEvent(client, { table: 'marriage', recordId: marriageRow.id, eventId });
    marriageRow.schedule_event_id = eventId;
    const partyRows = await insertMarriageParties(client, marriageRow.id, fields.parsedParties);

    for (const party of fields.parsedParties) {
      const spouse = fields.parsedParties.find((other) => other.role !== party.role);
      const spouseName = [spouse?.firstName, spouse?.lastName].filter(Boolean).join(' ');
      await annotateFromSacrament(client, {
        parishId: req.parishId,
        baptismId: party.baptismalRecordId,
        annotationType: 'marriage',
        referenceRecordId: marriageRow.id,
        actorId: req.user.id,
        notes: optionalText(body.annotationNote)
          || `Married${spouseName ? ` to ${spouseName}` : ''} at ${fields.placeOfMarriage}.`,
        eventDate: fields.dateOfMarriage,
        bookNumber: fields.bookNumber,
        pageNumber: fields.pageNumber,
        entryNumber: fields.entryNumber,
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
      metadata: {
        bookNumber: fields.bookNumber,
        pageNumber: fields.pageNumber,
        entryNumber: fields.entryNumber,
      },
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

async function listMarriages(req, res) {
  try {
    const result = await pool.query(
      `SELECT * FROM marriage
       WHERE parish_id = $1 ${archivedListClause(req)}
       ORDER BY date_of_marriage DESC, created_at DESC`,
      [req.parishId]
    );
    const partiesByMarriage = await loadMarriageParties(
      pool,
      result.rows.map((row) => row.id)
    );
    res.json({
      records: result.rows.map((row) => toMarriageRecord(row, partiesByMarriage.get(row.id) || [])),
    });
  } catch (err) {
    return sendRecordError(res, err);
  }
}

async function getMarriage(req, res) {
  try {
    const row = await findParishRecord(pool, 'marriage', req.parishId, req.params.id);
    if (!row) {
      return res.status(404).json({ error: 'Record not found.' });
    }
    const partiesByMarriage = await loadMarriageParties(pool, [row.id]);
    const record = toMarriageRecord(row, partiesByMarriage.get(row.id) || []);
    record.certificates = await listRecordCertificates(req.parishId, 'marriage', row.id);
    res.json({ record });
  } catch (err) {
    return sendRecordError(res, err);
  }
}

async function updateMarriage(req, res) {
  const client = await pool.connect();
  try {
    const current = await findParishRecord(pool, 'marriage', req.parishId, req.params.id);
    if (!current) {
      return res.status(404).json({ error: 'Record not found.' });
    }
    const fields = await parseMarriagePayload(req.parishId, req.body || {});
    await client.query('BEGIN');
    const updated = await client.query(
      `UPDATE marriage
       SET place_of_marriage = $1,
           marriage_address = $2,
           date_of_marriage = $3,
           time_of_marriage = $4,
           minister = $5,
           witness_one = $6,
           witness_two = $7,
           book_number = $8,
           page_number = $9,
           entry_number = $10,
           remarks = $11,
           updated_at = NOW()
       WHERE id = $12 AND parish_id = $13
       RETURNING *`,
      [
        fields.placeOfMarriage,
        fields.marriageAddress,
        fields.dateOfMarriage,
        fields.timeOfMarriage,
        fields.minister,
        fields.witnessOne,
        fields.witnessTwo,
        fields.bookNumber,
        fields.pageNumber,
        fields.entryNumber,
        fields.remarks,
        current.id,
        req.parishId,
      ]
    );
    await client.query(
      `DELETE FROM marriage_consent_person
       WHERE marriage_party_id IN (SELECT id FROM marriage_party WHERE marriage_id = $1)`,
      [current.id]
    );
    await client.query('DELETE FROM marriage_party WHERE marriage_id = $1', [current.id]);
    const partyRows = await insertMarriageParties(client, current.id, fields.parsedParties);
    await client.query('COMMIT');
    const record = toMarriageRecord(updated.rows[0], partyRows);
    record.certificates = await listRecordCertificates(req.parishId, 'marriage', record.id);
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'marriage.updated',
      entityType: 'marriage',
      entityId: record.id,
      metadata: {
        bookNumber: fields.bookNumber,
        pageNumber: fields.pageNumber,
        entryNumber: fields.entryNumber,
      },
    });
    res.json({ record });
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

module.exports = { createMarriage, listMarriages, getMarriage, updateMarriage, toMarriageRecord };
