// Who can do what: signed-out visitors, parishioners, staff and admins.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish, createBaptism, baptismBody } = require('./helpers');

describe('Who can do what', () => {
  let parish;
  let record;

  before(async () => {
    parish = await createParish('Access');
    record = await createBaptism(parish.staff);
  });

  after(() => pool.end());

  it('turns away a request with no sign-in', async () => {
    const res = await api(null).get('/records/baptism');
    assert.equal(res.status, 401);
  });

  it('turns away a forged or expired token', async () => {
    const res = await api({ token: 'not-a-real-token' }).get('/records/baptism');
    assert.equal(res.status, 401);
  });

  it('keeps parishioners out of the register', async () => {
    const res = await api(parish.parishioner).get('/records/baptism');
    assert.equal(res.status, 403);
  });

  it('keeps parishioners from adding register entries', async () => {
    const res = await api(parish.parishioner).post('/records/baptism').send(baptismBody());
    assert.equal(res.status, 403);
  });

  it('lets staff add a register entry and see it in the list', async () => {
    const res = await api(parish.staff).get('/records/baptism');
    assert.equal(res.status, 200);
    assert.ok(res.body.records.some((r) => r.id === record.id));
  });

  it('stops staff from editing a register entry', async () => {
    const res = await api(parish.staff)
      .patch(`/records/baptism/${record.id}`)
      .send(baptismBody({ firstName: 'Changed' }));
    assert.equal(res.status, 403);
    const row = await pool.query('SELECT first_name FROM baptism WHERE id = $1', [record.id]);
    assert.equal(row.rows[0].first_name, 'Juan');
  });

  it('stops staff from archiving a register entry', async () => {
    const res = await api(parish.staff).post(`/records/baptism/${record.id}/archive`);
    assert.equal(res.status, 403);
  });

  it('lets the admin edit a register entry', async () => {
    const res = await api(parish.admin)
      .patch(`/records/baptism/${record.id}`)
      .send(baptismBody({ firstName: 'Juanito' }));
    assert.equal(res.status, 200);
    const row = await pool.query('SELECT first_name FROM baptism WHERE id = $1', [record.id]);
    assert.equal(row.rows[0].first_name, 'Juanito');
  });

  it('stops staff from adding staff accounts', async () => {
    const res = await api(parish.staff).post('/staff').send({
      fullName: 'New Person',
      email: 'new.person@holyapp.test',
      accessRole: 'staff',
    });
    assert.equal(res.status, 403);
  });

  it('stops staff from changing certificate settings', async () => {
    const res = await api(parish.staff).put('/parish/settings/certificates').send({});
    assert.equal(res.status, 403);
  });

  it('refuses a register entry with missing required fields', async () => {
    const res = await api(parish.staff).post('/records/baptism').send(baptismBody({ minister: '' }));
    assert.equal(res.status, 400);
  });
});
