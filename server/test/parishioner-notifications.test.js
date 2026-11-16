// Parishioners see their own notifications in the portal: certificate request updates (alongside the status emails),
// and the ones already saved for Mass intentions and marriage applications.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish, createBaptism } = require('./helpers');
const statusEmail = require('../src/utils/statusEmail');

after(() => pool.end());

describe('Parishioner notifications', () => {
  let parish;
  let record;

  before(async () => {
    parish = await createParish('Bell');
    record = await createBaptism(parish.staff);
  });

  const notes = async (user) => {
    await statusEmail.settled();
    return (await api(user).get('/notifications')).body.notifications;
  };

  async function newRequest() {
    const res = await api(parish.parishioner)
      .post('/requests')
      .send({
        sacramentType: 'baptism',
        deliveryMethod: 'pickup',
        purpose: 'School enrollment',
        relationship: 'Parent',
        sacramentDate: '2024-03-10',
        fields: { firstName: 'Juan', lastName: 'Dela Cruz', birthdate: '2024-01-15', birthplace: 'Cebu City' },
      });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    return res.body.id;
  }

  it('gets a notification for each step of a certificate request, linked to the request', async () => {
    const id = await newRequest();
    assert.equal((await api(parish.staff).post(`/requests/${id}/link`).send({ recordId: record.id })).status, 200);
    assert.equal((await api(parish.staff).post(`/requests/${id}/payment`)).status, 200);
    assert.equal((await api(parish.staff).post(`/requests/${id}/ready`)).status, 200);

    const mine = await notes(parish.parishioner);
    assert.deepEqual(
      mine.map((n) => n.title),
      [
        'Your baptism certificate is ready for pickup',
        'We received your payment for your baptism certificate',
        'We found the record for your baptism certificate',
      ]
    );
    for (const n of mine) {
      assert.equal(n.href, `requests/${id}`);
      assert.equal(n.read, false);
    }
    assert.match(mine[0].body, /Bring a valid ID/);

    const count = await api(parish.parishioner).get('/notifications/unread-count');
    assert.equal(count.body.count, 3);
  });

  it('includes the reason when a request is rejected', async () => {
    const id = await newRequest();
    const res = await api(parish.staff).post(`/requests/${id}/reject`).send({ reason: 'No record under this name.' });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const [latest] = await notes(parish.parishioner);
    assert.equal(latest.title, 'Your baptism certificate request was not approved');
    assert.match(latest.body, /^Reason: No record under this name\. /);
  });

  it('marks one or all as read, only their own', async () => {
    const [first] = await notes(parish.parishioner);
    const officeNote = (await notes(parish.admin))[0];

    assert.equal((await api(parish.parishioner).patch(`/notifications/${first.id}/read`)).status, 200);
    assert.equal((await api(parish.parishioner).patch(`/notifications/${officeNote.id}/read`)).status, 404);

    assert.equal((await api(parish.parishioner).patch('/notifications/read-all')).status, 200);
    const count = await api(parish.parishioner).get('/notifications/unread-count');
    assert.equal(count.body.count, 0);
    assert.ok((await notes(parish.admin)).some((n) => !n.read), "the office's notifications are untouched");
  });
});
