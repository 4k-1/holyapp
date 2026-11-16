// A new certificate request notifies the parish office: admins, and staff allowed to see Certificates.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish } = require('./helpers');

after(() => pool.end());

describe('New certificate request notifications', () => {
  let parish;
  let other;

  before(async () => {
    parish = await createParish('Request Notify');
    other = await createParish('Other Notify');
  });

  const notes = async (user) => (await api(user).get('/notifications')).body.notifications || [];

  it('tells the admin and staff who can see certificates, naming the parishioner, not the person on the certificate', async () => {
    const res = await api(parish.parishioner)
      .post('/requests')
      .send({
        sacramentType: 'baptism',
        deliveryMethod: 'pickup',
        purpose: 'School enrollment',
        relationship: 'Self',
        sacramentDate: '1990-03-01',
        fields: { firstName: 'Secreto', lastName: 'Persona', birthdate: '1990-02-02', birthplace: 'Cebu City' },
      });
    assert.equal(res.status, 201, JSON.stringify(res.body));

    for (const user of [parish.admin, parish.staff]) {
      const [note] = await notes(user);
      assert.ok(note, `${user.role} got a notification`);
      assert.equal(note.kind, 'request');
      assert.equal(note.title, 'New certificate request');
      assert.equal(note.body, 'Paz Parishioner asked for a baptismal certificate (pickup at the office).');
      assert.equal(note.href, 'requests');
      assert.doesNotMatch(note.body, /Secreto|Persona/);
    }
    assert.equal((await notes(parish.parishioner)).length, 0, 'not the parishioner');
    assert.equal((await notes(other.admin)).length, 0, 'not another parish');
  });

  it('skips staff whose Certificates access is off', async () => {
    const access = { registers: 'manage', certificates: 'off', donations: 'manage', intentions: 'manage', schedule: 'manage', marriage: 'manage' };
    await pool.query('UPDATE app_user SET staff_access = $1 WHERE id = $2', [JSON.stringify(access), parish.staff.id]);
    const before = (await notes(parish.staff)).length;

    const res = await api(parish.parishioner)
      .post('/requests')
      .send({
        sacramentType: 'confirmation',
        deliveryMethod: 'digital',
        purpose: 'School enrollment',
        relationship: 'Self',
        sacramentDate: '2002-05-05',
        fields: { firstName: 'Paz', lastName: 'Parishioner', birthdate: '1990-02-02', birthplace: 'Cebu City' },
      });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal((await notes(parish.staff)).length, before);
    const [latest] = await notes(parish.admin);
    assert.equal(latest.body, 'Paz Parishioner asked for a confirmation certificate (digital copy).');
  });
});
