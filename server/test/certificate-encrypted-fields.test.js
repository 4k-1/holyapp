// Fields a record stores encrypted (place of birth, place of baptism, remarks…) print as plain
// words on the certificate, never as "enc:v1:…". The other tests run with encryption off, so this
// one turns it on for itself.

process.env.DATA_ENCRYPTION_KEY = process.env.DATA_ENCRYPTION_KEY || 'a'.repeat(64);

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish, createBaptism } = require('./helpers');
const { decryptJson, PREFIX } = require('../src/utils/fieldCrypto');

after(() => pool.end());

describe('Encrypted record fields on a certificate', () => {
  let parish;

  before(async () => {
    parish = await createParish('Encrypted Fields');
  });

  it('prints the place of birth decrypted on a baptism certificate', async () => {
    const record = await createBaptism(parish.admin, { placeOfBirth: "Cebu Doctors' University Hospital" });

    // Stored encrypted…
    const stored = await pool.query('SELECT place_of_birth FROM baptism WHERE id = $1', [record.id]);
    assert.ok(stored.rows[0].place_of_birth.startsWith(PREFIX));

    const res = await api(parish.staff).post(`/records/baptism/${record.id}/certificates`).send({ purpose: 'Personal records' });
    assert.equal(res.status, 201, JSON.stringify(res.body));

    // …but copied into the certificate as plain words.
    const cert = await pool.query(
      'SELECT snapshot FROM certificate WHERE record_id = $1 ORDER BY version DESC LIMIT 1',
      [record.id]
    );
    const printed = decryptJson(cert.rows[0].snapshot).printed;
    assert.equal(printed.placeOfBirth, "Cebu Doctors' University Hospital");
    assert.ok(!JSON.stringify(printed).includes(PREFIX), 'nothing on the printed record is still encrypted');
  });
});
