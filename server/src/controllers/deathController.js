const pool = require('../config/db');
const { writeAudit } = require('../utils/audit');
const {
  requiredText,
  optionalText,
  dateValue,
  dateOnly,
  optionalInt,
  sendRecordError,
  httpError,
} = require('../utils/recordFields');

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
    status: 'Active',
    certificates: [],
  };
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

module.exports = { createDeath, toDeathRecord };
