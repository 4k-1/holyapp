// A middle name for each parent on baptism and confirmation records, kept in full and printed on the certificate.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish, createBaptism } = require('./helpers');
const { decryptJson } = require('../src/utils/fieldCrypto');

after(() => pool.end());

describe('Parent middle names', () => {
  let parish;

  before(async () => {
    parish = await createParish('Parent Middle');
  });

  /** The names printed on the newest copy issued from a record. */
  async function printedNames(recordType, recordId) {
    const res = await api(parish.staff).post(`/records/${recordType}/${recordId}/certificates`).send({ purpose: 'Personal records' });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const result = await pool.query(
      `SELECT snapshot FROM certificate WHERE record_id = $1 ORDER BY issued_at DESC, version DESC LIMIT 1`,
      [recordId]
    );
    // Snapshots are stored sealed for encryption at rest; read them the way the app does.
    const printed = decryptJson(result.rows[0].snapshot).printed;
    return { father: printed.fatherName, mother: printed.motherName };
  }

  it('saves, reads back and prints both parents\' middle names on a baptism', async () => {
    const record = await createBaptism(parish.admin, { fatherMiddleName: 'Santos', motherMiddleName: 'Cruz' });
    assert.equal(record.fatherMiddleName, 'Santos');
    assert.equal(record.motherMiddleName, 'Cruz');

    const read = await api(parish.admin).get(`/records/baptism/${record.id}`);
    assert.equal(read.body.record.fatherMiddleName, 'Santos');

    assert.deepEqual(await printedNames('baptism', record.id), {
      father: 'Pedro Santos Dela Cruz',
      mother: 'Maria Cruz Reyes',
    });
  });

  it('changes or clears them on edit, and leaves older records without them', async () => {
    const record = await createBaptism(parish.admin);
    assert.equal(record.fatherMiddleName, '');

    const { godparents, ...rest } = record;
    const res = await api(parish.admin)
      .patch(`/records/baptism/${record.id}`)
      .send({ ...rest, godparents: godparents || [], fatherMiddleName: 'Lim', motherMiddleName: '' });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.record.fatherMiddleName, 'Lim');
    assert.equal(res.body.record.motherMiddleName, '');
  });

  it('needs the last name when only a middle name is given', async () => {
    const res = await api(parish.admin)
      .post('/records/baptism')
      .send({
        firstName: 'Ana',
        lastName: 'Lopez',
        dateOfBirth: '2024-01-01',
        dateOfBaptism: '2024-02-01',
        placeOfBaptism: 'Main church',
        minister: 'Rev. Fr. Test',
        motherLastName: 'Lopez',
        fatherMiddleName: 'Garcia',
        bookNumber: '9',
        pageNumber: '9',
        entryNumber: '9',
      });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /Father's last name is required/);
  });

  it('saves and prints them on a confirmation', async () => {
    const res = await api(parish.admin).post('/records/confirmation').send({
      firstName: 'Lito',
      middleName: 'Ramos',
      lastName: 'Bautista',
      fatherFirstName: 'Jose',
      fatherMiddleName: 'Garcia',
      fatherLastName: 'Bautista',
      motherFirstName: 'Elena',
      motherMiddleName: 'Ramos',
      motherLastName: 'Villa',
      dateOfConfirmation: '2024-05-01',
      placeOfConfirmation: 'Main church',
      minister: 'Most Rev. Test Bishop',
      bookNumber: '4',
      pageNumber: '5',
      entryNumber: '6',
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.record.fatherMiddleName, 'Garcia');
    assert.equal(res.body.record.motherMiddleName, 'Ramos');

    assert.deepEqual(await printedNames('confirmation', res.body.record.id), {
      father: 'Jose Garcia Bautista',
      mother: 'Elena Ramos Villa',
    });
  });
});
