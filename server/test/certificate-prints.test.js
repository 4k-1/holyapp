// "Did it print correctly?": confirming printouts and voiding spoiled copies.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish, createBaptism } = require('./helpers');

after(() => pool.end());

async function issue(user, record) {
  const res = await api(user).post(`/records/baptism/${record.id}/certificates`).send({ purpose: 'School enrollment' });
  assert.equal(res.status, 201);
  return res.body.certificates.find((c) => c.status === 'Valid');
}

async function unconfirmedIds(user) {
  const res = await api(user).get('/certificates/unconfirmed');
  assert.equal(res.status, 200);
  return res.body.certificates.map((c) => c.id);
}

describe('Confirming a printout', () => {
  let parish;

  before(async () => {
    parish = await createParish('Prints');
  });

  it('leaves a new walk-in copy unconfirmed until someone confirms it', async () => {
    const copy = await issue(parish.staff, await createBaptism(parish.staff));
    assert.equal(copy.printConfirmed, false);
    assert.ok((await unconfirmedIds(parish.staff)).includes(copy.id));

    const res = await api(parish.staff).post(`/certificates/${copy.id}/confirm-print`);
    assert.equal(res.status, 200);
    assert.ok(!(await unconfirmedIds(parish.staff)).includes(copy.id));
    const row = await pool.query('SELECT print_confirmed_by FROM certificate WHERE id = $1', [copy.id]);
    assert.equal(row.rows[0].print_confirmed_by, parish.staff.id);
  });

  it('asks again after a reprint', async () => {
    const copy = await issue(parish.staff, await createBaptism(parish.staff, { firstName: 'Again' }));
    await api(parish.staff).post(`/certificates/${copy.id}/confirm-print`);
    const reprint = await api(parish.staff).post(`/certificates/${copy.id}/reprints`).send({ reason: 'paper_jam' });
    assert.equal(reprint.status, 201);
    assert.ok((await unconfirmedIds(parish.staff)).includes(copy.id));
  });

  it("doesn't list or reach another parish's copies, and parishioners can't confirm", async () => {
    const other = await createParish('Prints other');
    const theirs = await issue(other.staff, await createBaptism(other.staff));
    assert.ok(!(await unconfirmedIds(parish.staff)).includes(theirs.id));
    assert.equal((await api(parish.staff).post(`/certificates/${theirs.id}/confirm-print`)).status, 404);
    assert.equal((await api(parish.staff).post(`/certificates/${theirs.id}/spoil`).send({ reason: 'Ink smeared' })).status, 404);
    assert.equal((await api(other.parishioner).post(`/certificates/${theirs.id}/confirm-print`)).status, 403);
    assert.equal((await api(other.parishioner).get('/certificates/unconfirmed')).status, 403);
  });
});

describe('Spoiled copies', () => {
  let parish;
  let copy;
  let recordId;

  before(async () => {
    parish = await createParish('Spoiled');
    const record = await createBaptism(parish.staff);
    recordId = record.id;
    copy = await issue(parish.staff, record);
  });

  it('needs a reason', async () => {
    const res = await api(parish.staff).post(`/certificates/${copy.id}/spoil`).send({ reason: 'bad' });
    assert.equal(res.status, 400);
  });

  it('voids the copy, keeps its number, logs it and shows it as void when scanned', async () => {
    const res = await api(parish.staff).post(`/certificates/${copy.id}/spoil`).send({ reason: 'Ink smeared across the name' });
    assert.equal(res.status, 200);

    const row = (await pool.query('SELECT status, void_kind, certificate_code, hash FROM certificate WHERE id = $1', [copy.id])).rows[0];
    assert.equal(row.status, 'invalid');
    assert.equal(row.void_kind, 'spoiled');
    assert.equal(row.certificate_code, copy.code, 'the number stays on the spoiled copy');

    const audit = await pool.query(
      "SELECT count(*)::int AS n FROM audit_log WHERE entity_id = $1 AND action = 'certificate.spoiled'",
      [copy.id]
    );
    assert.equal(audit.rows[0].n, 1);

    const scanned = await api(null).get(`/certificates/verify/${row.hash}`);
    assert.equal(scanned.status, 200);
    assert.equal(scanned.body.status, 'invalid');
    assert.equal(scanned.body.voidKind, 'spoiled');

    const record = await api(parish.staff).get(`/records/baptism/${recordId}`);
    const listed = record.body.record.certificates.find((c) => c.id === copy.id);
    assert.equal(listed.status, 'Spoiled');
  });

  it("can't be confirmed, reprinted or spoiled again", async () => {
    assert.equal((await api(parish.staff).post(`/certificates/${copy.id}/confirm-print`)).status, 400);
    assert.equal((await api(parish.staff).post(`/certificates/${copy.id}/reprints`).send({ reason: 'paper_jam' })).status, 400);
    assert.equal((await api(parish.staff).post(`/certificates/${copy.id}/spoil`).send({ reason: 'Again please' })).status, 400);
  });

  it('gives the next copy the next number, leaving no gap', async () => {
    const next = await issue(parish.staff, { id: recordId });
    assert.equal(Number(next.code.slice(-6)), Number(copy.code.slice(-6)) + 1);
  });

  it("refuses to spoil a digital copy, which is never printed", async () => {
    const digital = await issue(parish.staff, await createBaptism(parish.staff, { firstName: 'Wallet' }));
    // Made as a walk-in, then turned into an online request delivered to the wallet.
    await pool.query(
      "UPDATE certificate_request SET request_type = 'online', delivery_method = 'digital' WHERE certificate_id = $1",
      [digital.id]
    );
    const res = await api(parish.staff).post(`/certificates/${digital.id}/spoil`).send({ reason: 'Ink smeared' });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /digital certificate/);
    const row = await pool.query('SELECT status FROM certificate WHERE id = $1', [digital.id]);
    assert.equal(row.rows[0].status, 'valid');
  });

  it('counts spoiled copies in the report', async () => {
    const res = await api(parish.admin).get('/reports/certificates');
    assert.equal(res.body.rows.reduce((n, r) => n + r.spoiled, 0), 1);
  });
});
