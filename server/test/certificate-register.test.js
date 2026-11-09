// A7: the register of issued certificates, one row per copy.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish, createBaptism } = require('./helpers');

after(() => pool.end());

async function issue(user, record) {
  const res = await api(user).post(`/records/baptism/${record.id}/certificates`).send({ purpose: 'School enrollment' });
  assert.equal(res.status, 201);
  return res.body.certificates.find((c) => c.status === 'Valid');
}

async function register(user, query = '') {
  const res = await api(user).get(`/reports/certificates/copies${query}`);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body;
}

describe('Certificate register', () => {
  let parish;
  let first;
  let second;
  let spoiled;
  let revoked;

  before(async () => {
    parish = await createParish('Register');
    const record = await createBaptism(parish.staff, { firstName: 'Registro' });
    first = await issue(parish.staff, record);
    await api(parish.staff).post(`/certificates/${first.id}/reprints`).send({ reason: 'paper_jam' });
    second = await issue(parish.admin, record);

    spoiled = await issue(parish.staff, await createBaptism(parish.staff, { firstName: 'Spoilt' }));
    await api(parish.staff).post(`/certificates/${spoiled.id}/spoil`).send({ reason: 'Ink smeared on the name' });

    revoked = await issue(parish.staff, await createBaptism(parish.staff, { firstName: 'Revoked' }));
    await api(parish.admin).post(`/certificates/${revoked.id}/revoke`).send({ reason: 'Issued from the wrong entry' });
  });

  it('lists every copy, newest first, with its number, receipt and issuer', async () => {
    const { copies, truncated } = await register(parish.staff);
    assert.equal(truncated, false);
    assert.equal(copies.length, 4);
    assert.equal(copies[copies.length - 1].id, first.id);
    const row = copies.find((c) => c.id === second.id);
    assert.equal(row.code, second.code);
    assert.equal(row.sacramentType, 'baptism');
    assert.equal(row.issuedBy, 'Ada Admin');
    assert.equal(row.channel, 'walkin');
    assert.equal(row.purpose, 'School enrollment');
    assert.match(row.receiptNumber, /^HA-/);
    assert.match(row.recordPath, /^records\/baptismal\//);
  });

  it('shows each status and how many times it was printed', async () => {
    const { copies } = await register(parish.staff);
    const byId = Object.fromEntries(copies.map((c) => [c.id, c]));
    assert.equal(byId[first.id].status, 'replaced');
    assert.equal(byId[first.id].timesPrinted, 2);
    assert.equal(byId[second.id].status, 'valid');
    assert.equal(byId[second.id].timesPrinted, 1);
    assert.equal(byId[spoiled.id].status, 'spoiled');
    assert.equal(byId[spoiled.id].voidReason, 'Ink smeared on the name');
    assert.equal(byId[revoked.id].status, 'revoked');
  });

  it('filters by the day a copy was issued', async () => {
    assert.equal((await register(parish.staff, '?from=2020-01-01&to=2020-12-31')).copies.length, 0);
    assert.equal((await register(parish.staff, '?from=2020-01-01')).copies.length, 4);
  });

  it("keeps parishes apart and keeps parishioners out", async () => {
    const other = await createParish('Register other');
    assert.equal((await register(other.staff)).copies.length, 0);
    assert.equal((await api(parish.parishioner).get('/reports/certificates/copies')).status, 403);
  });
});
