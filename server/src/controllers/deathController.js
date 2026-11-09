const pool = require('../config/db');
const { writeAudit } = require('../utils/audit');
const {
  requiredText,
  optionalText,
  dateValue,
  dateOnly,
  optionalInt,
  optionalUuid,
  sendRecordError,
  httpError,
  recordStatus,
} = require('../utils/recordFields');
const { annotateFromSacrament } = require('../utils/baptismAnnotation');
const { findParishRecord, archivedListClause } = require('../utils/recordQuery');
const { scheduleEventFor, linkScheduleEvent } = require('../utils/scheduleRecordLink');
const { listRecordCertificates } = require('./certificateController');

const SACRAMENTS = new Set(['last_rites', 'burial_mass', 'confession', 'communion']);

function toKin(row) {
  return {
    id: row.id,
    relationToDeceased: row.relation_to_deceased,
    lastName: row.last_name || undefined,
    firstName: row.first_name || undefined,
  };
}

function toSacrament(row) {
  return {
    id: row.id,
    sacramentName: row.sacrament_name,
  };
}

function toDeathRecord(row, kin = [], sacramentsReceived = []) {
  return {
    // The schedule event it was recorded from (C11), if any.
    scheduleEventId: row.schedule_event_id || null,
    id: row.id,
    parishId: row.parish_id,
    firstName: row.first_name,
    middleName: row.middle_name || undefined,
    lastName: row.last_name,
    residence: row.residence || undefined,
    age: row.age == null ? undefined : row.age,
    ageMonths: row.age_months == null ? undefined : row.age_months,
    ageDays: row.age_days == null ? undefined : row.age_days,
    deceasedStatus: row.status || undefined,
    dateOfDeath: dateOnly(row.date_of_death),
    dateOfBurial: dateOnly(row.date_of_burial),
    placeOfBurial: row.place_of_burial,
    nicheNumber: row.niche_number || undefined,
    nicheType: row.niche_type || undefined,
    minister: row.minister,
    causeOfDeath: row.cause_of_death || undefined,
    bookNumber: row.book_number,
    pageNumber: row.page_number,
    entryNumber: row.entry_number,
    remarks: row.remarks || undefined,
    encodedBy: row.encoded_by,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    kin,
    sacramentsReceived,
    status: recordStatus(row.archived_at),
    certificates: [],
  };
}

async function loadDeathNested(db, deathIds) {
  if (deathIds.length === 0) {
    return { kinByDeath: new Map(), sacramentsByDeath: new Map() };
  }

  const kin = await db.query(
    `SELECT * FROM death_kin WHERE death_id = ANY($1::uuid[]) ORDER BY id`,
    [deathIds]
  );
  const sacraments = await db.query(
    `SELECT * FROM death_sacrament_received WHERE death_id = ANY($1::uuid[]) ORDER BY id`,
    [deathIds]
  );

  const kinByDeath = new Map();
  for (const row of kin.rows) {
    const list = kinByDeath.get(row.death_id) || [];
    list.push(toKin(row));
    kinByDeath.set(row.death_id, list);
  }

  const sacramentsByDeath = new Map();
  for (const row of sacraments.rows) {
    const list = sacramentsByDeath.get(row.death_id) || [];
    list.push(toSacrament(row));
    sacramentsByDeath.set(row.death_id, list);
  }

  return { kinByDeath, sacramentsByDeath };
}

function parseKin(list) {
  if (list == null) return [];
  if (!Array.isArray(list)) {
    throw httpError(400, 'Next of kin must be a list.');
  }
  return list
    .filter((k) => k && String(k.relationToDeceased ?? '').trim())
    .map((k) => ({
      relationToDeceased: requiredText(k.relationToDeceased, 'Kin relation'),
      firstName: optionalText(k.firstName),
      lastName: optionalText(k.lastName),
    }));
}

function parseSacraments(list) {
  if (list == null) return [];
  if (!Array.isArray(list)) {
    throw httpError(400, 'Sacraments received must be a list.');
  }
  const names = [];
  const seen = new Set();
  for (const item of list) {
    const name = String(item?.sacramentName ?? item ?? '').trim();
    if (!name) continue;
    if (!SACRAMENTS.has(name)) {
      throw httpError(400, 'A listed sacrament is not valid.');
    }
    if (seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }
  return names;
}

async function createDeath(req, res) {
  const body = req.body || {};
  const client = await pool.connect();

  try {
    const firstName = requiredText(body.firstName, 'First name');
    const lastName = requiredText(body.lastName, 'Last name');
    const dateOfDeath = dateValue(body.dateOfDeath, 'Date of death');
    const dateOfBurial = dateValue(body.dateOfBurial, 'Date of burial');
    const placeOfBurial = requiredText(body.placeOfBurial, 'Place of burial');
    const minister = requiredText(body.minister, 'Minister');
    const bookNumber = requiredText(body.bookNumber, 'Book number');
    const pageNumber = requiredText(body.pageNumber, 'Page number');
    const entryNumber = requiredText(body.entryNumber, 'Entry number');
    const kin = parseKin(body.kin);
    const sacraments = parseSacraments(body.sacramentsReceived);

    await client.query('BEGIN');

    const inserted = await client.query(
      `INSERT INTO death (
         parish_id, first_name, middle_name, last_name, residence,
         age, age_months, age_days, status,
         date_of_death, date_of_burial, place_of_burial, niche_number, niche_type,
         minister, cause_of_death,
         book_number, page_number, entry_number, remarks, encoded_by
       )
       VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8, $9,
         $10, $11, $12, $13, $14,
         $15, $16,
         $17, $18, $19, $20, $21
       )
       RETURNING *`,
      [
        req.parishId,
        firstName,
        optionalText(body.middleName),
        lastName,
        optionalText(body.residence),
        optionalInt(body.age, 'Age in years'),
        optionalInt(body.ageMonths, 'Age in months', { max: 11 }),
        optionalInt(body.ageDays, 'Age in days', { max: 30 }),
        optionalText(body.deceasedStatus),
        dateOfDeath,
        dateOfBurial,
        placeOfBurial,
        optionalText(body.nicheNumber),
        optionalText(body.nicheType),
        minister,
        optionalText(body.causeOfDeath),
        bookNumber,
        pageNumber,
        entryNumber,
        optionalText(body.remarks),
        req.user.id,
      ]
    );
    const deathRow = inserted.rows[0];
    const eventId = await scheduleEventFor(client, { parishId: req.parishId, table: 'death', body });
    await linkScheduleEvent(client, { table: 'death', recordId: deathRow.id, eventId });
    deathRow.schedule_event_id = eventId;

    const kinRows = [];
    for (const person of kin) {
      const insertedKin = await client.query(
        `INSERT INTO death_kin (death_id, relation_to_deceased, last_name, first_name)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [deathRow.id, person.relationToDeceased, person.lastName, person.firstName]
      );
      kinRows.push(toKin(insertedKin.rows[0]));
    }

    const sacramentRows = [];
    for (const sacramentName of sacraments) {
      const insertedSacrament = await client.query(
        `INSERT INTO death_sacrament_received (death_id, sacrament_name)
         VALUES ($1, $2)
         RETURNING *`,
        [deathRow.id, sacramentName]
      );
      sacramentRows.push(toSacrament(insertedSacrament.rows[0]));
    }

    await annotateFromSacrament(client, {
      parishId: req.parishId,
      baptismId: optionalUuid(body.baptismalRecordId),
      annotationType: 'death',
      referenceRecordId: deathRow.id,
      actorId: req.user.id,
      notes: optionalText(body.annotationNote) || `Deceased. Buried at ${placeOfBurial}.`,
      eventDate: dateOfDeath,
      bookNumber,
      pageNumber,
      entryNumber,
    });

    await client.query('COMMIT');

    const record = toDeathRecord(deathRow, kinRows, sacramentRows);
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'death.created',
      entityType: 'death',
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

async function listDeaths(req, res) {
  try {
    const result = await pool.query(
      `SELECT * FROM death
       WHERE parish_id = $1 ${archivedListClause(req)}
       ORDER BY date_of_death DESC, created_at DESC`,
      [req.parishId]
    );
    const { kinByDeath, sacramentsByDeath } = await loadDeathNested(
      pool,
      result.rows.map((row) => row.id)
    );
    res.json({
      records: result.rows.map((row) =>
        toDeathRecord(row, kinByDeath.get(row.id) || [], sacramentsByDeath.get(row.id) || [])
      ),
    });
  } catch (err) {
    return sendRecordError(res, err);
  }
}

async function getDeath(req, res) {
  try {
    const row = await findParishRecord(pool, 'death', req.parishId, req.params.id);
    if (!row) {
      return res.status(404).json({ error: 'Record not found.' });
    }
    const { kinByDeath, sacramentsByDeath } = await loadDeathNested(pool, [row.id]);
    const record = toDeathRecord(
      row,
      kinByDeath.get(row.id) || [],
      sacramentsByDeath.get(row.id) || []
    );
    record.certificates = await listRecordCertificates(req.parishId, 'death', row.id);
    res.json({ record });
  } catch (err) {
    return sendRecordError(res, err);
  }
}

async function updateDeath(req, res) {
  const body = req.body || {};
  const client = await pool.connect();
  try {
    const current = await findParishRecord(pool, 'death', req.parishId, req.params.id);
    if (!current) {
      return res.status(404).json({ error: 'Record not found.' });
    }
    const firstName = requiredText(body.firstName, 'First name');
    const lastName = requiredText(body.lastName, 'Last name');
    const dateOfDeath = dateValue(body.dateOfDeath, 'Date of death');
    const dateOfBurial = dateValue(body.dateOfBurial, 'Date of burial');
    const placeOfBurial = requiredText(body.placeOfBurial, 'Place of burial');
    const minister = requiredText(body.minister, 'Minister');
    const bookNumber = requiredText(body.bookNumber, 'Book number');
    const pageNumber = requiredText(body.pageNumber, 'Page number');
    const entryNumber = requiredText(body.entryNumber, 'Entry number');
    const kin = parseKin(body.kin);
    const sacraments = parseSacraments(body.sacramentsReceived);

    await client.query('BEGIN');
    const updated = await client.query(
      `UPDATE death
       SET first_name = $1,
           middle_name = $2,
           last_name = $3,
           residence = $4,
           age = $5,
           age_months = $6,
           age_days = $7,
           status = $8,
           date_of_death = $9,
           date_of_burial = $10,
           place_of_burial = $11,
           niche_number = $12,
           niche_type = $13,
           minister = $14,
           cause_of_death = $15,
           book_number = $16,
           page_number = $17,
           entry_number = $18,
           remarks = $19,
           updated_at = NOW()
       WHERE id = $20 AND parish_id = $21
       RETURNING *`,
      [
        firstName,
        optionalText(body.middleName),
        lastName,
        optionalText(body.residence),
        optionalInt(body.age, 'Age in years'),
        optionalInt(body.ageMonths, 'Age in months', { max: 11 }),
        optionalInt(body.ageDays, 'Age in days', { max: 30 }),
        optionalText(body.deceasedStatus),
        dateOfDeath,
        dateOfBurial,
        placeOfBurial,
        optionalText(body.nicheNumber),
        optionalText(body.nicheType),
        minister,
        optionalText(body.causeOfDeath),
        bookNumber,
        pageNumber,
        entryNumber,
        optionalText(body.remarks),
        current.id,
        req.parishId,
      ]
    );
    await client.query('DELETE FROM death_kin WHERE death_id = $1', [current.id]);
    await client.query('DELETE FROM death_sacrament_received WHERE death_id = $1', [current.id]);

    const kinRows = [];
    for (const person of kin) {
      const insertedKin = await client.query(
        `INSERT INTO death_kin (death_id, relation_to_deceased, last_name, first_name)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [current.id, person.relationToDeceased, person.lastName, person.firstName]
      );
      kinRows.push(toKin(insertedKin.rows[0]));
    }
    const sacramentRows = [];
    for (const sacramentName of sacraments) {
      const insertedSacrament = await client.query(
        `INSERT INTO death_sacrament_received (death_id, sacrament_name)
         VALUES ($1, $2)
         RETURNING *`,
        [current.id, sacramentName]
      );
      sacramentRows.push(toSacrament(insertedSacrament.rows[0]));
    }
    await client.query('COMMIT');

    const record = toDeathRecord(updated.rows[0], kinRows, sacramentRows);
    record.certificates = await listRecordCertificates(req.parishId, 'death', record.id);
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'death.updated',
      entityType: 'death',
      entityId: record.id,
      metadata: { bookNumber, pageNumber, entryNumber },
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

module.exports = { createDeath, listDeaths, getDeath, updateDeath, toDeathRecord };
