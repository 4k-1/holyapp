// B2: the purpose on every certificate copy, and how long a marriage copy is accepted.

const fs = require('fs');
const path = require('path');
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish, createBaptism } = require('./helpers');
const { normalizePurpose, addMonths, manilaToday, PURPOSES_BY_SACRAMENT } = require('../src/constants/purposes');
const { encryptJson, decryptJson } = require('../src/utils/fieldCrypto');

/** The lists in client/src/lib/purposes.ts, by certificate. */
function clientLists() {
  const source = fs.readFileSync(path.join(__dirname, '../../client/src/lib/purposes.ts'), 'utf8');
  const lists = {};
  for (const [, sacrament, body] of source.matchAll(/^\s+(baptism|confirmation|marriage|death): \[([^\]]*)\]/gm)) {
    lists[sacrament] = [...body.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  }
  return lists;
}

after(() => pool.end());

describe('Certificate purposes', () => {
  let parish;
  let record;

  before(async () => {
    parish = await createParish('Purposes');
    record = await createBaptism(parish.staff);
  });

  async function issue(purpose) {
    return api(parish.staff).post(`/records/baptism/${record.id}/certificates`).send({ purpose });
  }

  async function newest() {
    const result = await pool.query(
      `SELECT c.hash, c.snapshot, r.purpose FROM certificate c
       JOIN certificate_request r ON r.certificate_id = c.id
       WHERE c.record_id = $1 ORDER BY c.issued_at DESC, c.version DESC LIMIT 1`,
      [record.id]
    );
    const row = result.rows[0];
    // Snapshots are stored sealed for encryption at rest; read them the way the app does.
    return { ...row, snapshot: decryptJson(row.snapshot) };
  }

  it('tidies purposes and keeps typed ones', () => {
    assert.equal(normalizePurpose(' school   ENROLLMENT '), 'School enrollment');
    assert.equal(normalizePurpose('Marriage preparation'), 'Marriage');
    assert.equal(normalizePurpose('Walk-in issuance'), null);
    assert.equal(normalizePurpose('Scholarship grant'), 'Scholarship grant');
    assert.equal(normalizePurpose('  '), null);
    assert.equal(normalizePurpose('Travel / passport'), 'Passport or government ID');
    const server = Object.fromEntries(Object.entries(PURPOSES_BY_SACRAMENT).map(([k, v]) => [k, [...v]]));
    assert.deepEqual(server, clientLists(), 'the app and the server list the same purposes for each certificate');
  });

  it('counts months to the same day, or the last day of a short month', () => {
    assert.equal(addMonths('2026-11-09', 6), '2027-05-09');
    assert.equal(addMonths('2026-08-31', 6), '2027-02-28');
    assert.equal(addMonths('2027-08-31', 6), '2028-02-29');
  });

  it('needs a purpose for a walk-in copy', async () => {
    const res = await issue('');
    assert.equal(res.status, 400);
    assert.match(res.body.error, /what the certificate is for/);
  });

  it('saves the purpose with the copy; only marriage copies have an end date', async () => {
    assert.equal((await issue('school enrollment')).status, 201);
    const school = await newest();
    assert.equal(school.purpose, 'School enrollment');
    assert.equal(school.snapshot.purpose, 'School enrollment');
    assert.equal(school.snapshot.validUntil, null);

    assert.equal((await issue('Marriage')).status, 201);
    const marriage = await newest();
    assert.equal(marriage.snapshot.purpose, 'Marriage');
    assert.equal(marriage.snapshot.validUntil, addMonths(manilaToday(), 6));

    const scanned = await api(null).get(`/certificates/verify/${marriage.hash}`);
    assert.equal(scanned.status, 200);
    assert.equal(scanned.body.purpose, 'Marriage');
    assert.equal(scanned.body.validUntil, marriage.snapshot.validUntil);
    assert.equal(scanned.body.expiredForMarriage, false);
  });

  it('marks a marriage copy expired after its date, while it stays valid', async () => {
    const copy = await newest();
    const expired = encryptJson({ ...copy.snapshot, validUntil: '2020-01-31' });
    await pool.query(`UPDATE certificate SET snapshot = $1::jsonb WHERE hash = $2`, [JSON.stringify(expired), copy.hash]);
    const scanned = await api(null).get(`/certificates/verify/${copy.hash}`);
    assert.equal(scanned.body.status, 'valid');
    assert.equal(scanned.body.expiredForMarriage, true);
  });

  it('keeps a typed purpose as written', async () => {
    assert.equal((await issue('Scholarship grant')).status, 201);
    assert.equal((await newest()).purpose, 'Scholarship grant');
  });
});
