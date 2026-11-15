// Mistakes the parish office must not be able to make: a baptism dated before the birth,
// and rejecting a parishioner's request without telling them why.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish, baptismBody } = require('./helpers');

describe('UAT mistake checks', () => {
  let parish;
  let requestId;

  before(async () => {
    parish = await createParish('UAT Checks');
    const res = await api(parish.parishioner)
      .post('/requests')
      .send({
        sacramentType: 'baptism',
        deliveryMethod: 'digital',
        purpose: 'School enrollment',
        relationship: 'Self',
        sacramentDate: '1979-07-01',
        fields: { firstName: 'Pedro', lastName: 'Yap', birthdate: '1979-06-11', birthplace: 'Cebu City' },
      });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    requestId = res.body.id;
  });

  after(() => pool.end());

  it('refuses a baptism dated before the birth', async () => {
    const res = await api(parish.admin)
      .post('/records/baptism')
      .send(baptismBody({ dateOfBirth: '2025-05-10', dateOfBaptism: '2025-05-01' }));
    assert.equal(res.status, 400);
    assert.match(res.body.error, /before the date of birth/);
  });

  it('allows a baptism on the day of birth', async () => {
    const res = await api(parish.admin)
      .post('/records/baptism')
      .send(baptismBody({ dateOfBirth: '2025-05-10', dateOfBaptism: '2025-05-10', entryNumber: '9' }));
    assert.equal(res.status, 201, JSON.stringify(res.body));
  });

  it('will not reject a request without a reason', async () => {
    const blank = await api(parish.admin).post(`/requests/${requestId}/reject`).send({ reason: '   ' });
    assert.equal(blank.status, 400);
    const none = await api(parish.admin).post(`/requests/${requestId}/reject`).send({});
    assert.equal(none.status, 400);

    const ok = await api(parish.admin)
      .post(`/requests/${requestId}/reject`)
      .send({ reason: 'No baptism record under this name and birth date.' });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.equal(ok.body.rejectionReason, 'No baptism record under this name and birth date.');
  });

  it('lets a parishioner sign up without an address', async () => {
    const email = `no.address.${Date.now()}@holyapp.test`;
    const res = await api()
      .post('/auth/register')
      .send({ firstName: 'Lorna', lastName: 'Abellana', birthday: '1990-02-02', email, password: 'a-long-password', parishId: parish.id });
    // Tests send no email, so the code step answers 503; the account itself is made first.
    assert.notEqual(res.status, 400, JSON.stringify(res.body));
    const saved = await pool.query('SELECT address FROM app_user WHERE email = $1', [email]);
    assert.equal(saved.rowCount, 1, 'the account was created');
    assert.equal(saved.rows[0].address, null);

    const missingName = await api()
      .post('/auth/register')
      .send({ lastName: 'Abellana', birthday: '1990-02-02', email: `x.${email}`, password: 'a-long-password', parishId: parish.id });
    assert.equal(missingName.status, 400, 'the other fields are still required');
  });
});
