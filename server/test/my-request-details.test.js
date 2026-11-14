// A parishioner can open one of their own requests and see everything they sent with it.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish } = require('./helpers');

describe('My request details', () => {
  let parish;
  let other;
  let requestId;

  before(async () => {
    parish = await createParish('Details');
    other = await createParish('Details Other');
    const res = await api(parish.parishioner)
      .post('/requests')
      .send({
        sacramentType: 'baptism',
        deliveryMethod: 'digital',
        purpose: 'School enrollment',
        relationship: 'Parent',
        sacramentDate: '2019-04-07',
        fields: {
          firstName: 'Lia',
          lastName: 'Ramos',
          birthdate: '2019-01-02',
          birthplace: 'Cebu City',
          mothersName: 'Rosa Ramos',
          godmothersName: 'Tess Cruz',
        },
      });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    requestId = res.body.id;
  });

  after(() => pool.end());

  it('returns the request with what the parishioner typed', async () => {
    const res = await api(parish.parishioner).get(`/requests/mine/${requestId}`);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.request.id, requestId);
    assert.equal(res.body.request.purpose, 'School enrollment');
    assert.equal(res.body.submitted.relationship, 'Parent');
    assert.equal(res.body.submitted.sacramentDate, '2019-04-07');
    assert.deepEqual(res.body.submitted.fields, {
      firstName: 'Lia',
      lastName: 'Ramos',
      birthdate: '2019-01-02',
      birthplace: 'Cebu City',
      mothersName: 'Rosa Ramos',
      godmothersName: 'Tess Cruz',
    });
  });

  it("isn't shown to anyone else", async () => {
    assert.equal((await api(other.parishioner).get(`/requests/mine/${requestId}`)).status, 404);
    assert.equal((await api(parish.staff).get(`/requests/mine/${requestId}`)).status, 403);
    assert.equal((await api(parish.parishioner).get('/requests/mine/not-an-id')).status, 404);
  });
});
