// One parish must never see or change another parish's data.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish, createBaptism, baptismBody } = require('./helpers');

describe('Parish separation', () => {
  let parishA;
  let parishB;
  let recordA;
  let donationA;

  before(async () => {
    parishA = await createParish('Alpha');
    parishB = await createParish('Beta');
    recordA = await createBaptism(parishA.staff);
    const res = await api(parishA.staff).post('/donations').send({
      donorName: 'Alpha Donor',
      donationType: 'Cash',
      amount: 500,
      donationDate: '2026-11-01',
    });
    assert.equal(res.status, 201);
    donationA = res.body.id;
  });

  after(() => pool.end());

  it("doesn't list another parish's register entries", async () => {
    const res = await api(parishB.admin).get('/records/baptism');
    assert.equal(res.status, 200);
    assert.ok(!res.body.records.some((r) => r.id === recordA.id));
  });

  it("doesn't open another parish's register entry", async () => {
    const res = await api(parishB.admin).get(`/records/baptism/${recordA.id}`);
    assert.equal(res.status, 404);
  });

  it("doesn't let an admin edit another parish's register entry", async () => {
    const res = await api(parishB.admin)
      .patch(`/records/baptism/${recordA.id}`)
      .send(baptismBody({ firstName: 'Hijacked' }));
    assert.equal(res.status, 404);
    const row = await pool.query('SELECT first_name FROM baptism WHERE id = $1', [recordA.id]);
    assert.equal(row.rows[0].first_name, 'Juan');
  });

  it("doesn't let an admin archive another parish's register entry", async () => {
    const res = await api(parishB.admin).post(`/records/baptism/${recordA.id}/archive`);
    assert.equal(res.status, 404);
    const row = await pool.query('SELECT archived_at FROM baptism WHERE id = $1', [recordA.id]);
    assert.equal(row.rows[0].archived_at, null);
  });

  it("doesn't issue a certificate from another parish's register entry", async () => {
    const res = await api(parishB.staff).post(`/records/baptism/${recordA.id}/certificates`).send({ purpose: 'School enrollment' });
    assert.equal(res.status, 404);
    const certs = await pool.query('SELECT count(*)::int AS n FROM certificate_request WHERE record_id = $1', [
      recordA.id,
    ]);
    assert.equal(certs.rows[0].n, 0);
  });

  it("doesn't list another parish's donations", async () => {
    const res = await api(parishB.admin).get('/donations');
    assert.equal(res.status, 200);
    assert.ok(!res.body.donations.some((d) => d.id === donationA));
  });

  it("refuses a request that names another parish", async () => {
    const res = await api(parishB.admin).get('/records/baptism').set('x-parish-id', parishA.id);
    assert.equal(res.status, 403);
  });
});
