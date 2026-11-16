// Staff accounts: the job title shown for each sign-in.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish } = require('./helpers');

describe('Staff job titles', () => {
  let parish;

  before(async () => {
    parish = await createParish('Staff');
  });

  after(() => pool.end());

  async function listed(user) {
    const res = await api(parish.admin).get('/staff');
    assert.equal(res.status, 200);
    return res.body.staff.find((s) => s.id === user.id);
  }

  it('shows "Staff", not "Priest", for a staff sign-in with no title', async () => {
    const row = await listed(parish.staff);
    assert.equal(row.role, 'Staff');
    assert.equal(row.accessRole, 'staff');
  });

  it('shows "Admin Staff" for an admin sign-in with no title', async () => {
    const row = await listed(parish.admin);
    assert.equal(row.role, 'Admin Staff');
  });

  it('shows the title once one is chosen', async () => {
    const res = await api(parish.admin)
      .patch(`/staff/${parish.staff.id}`)
      .send({ name: 'Stef Staff', email: parish.staff.email, role: 'Sacristan', accessRole: 'staff' });
    assert.equal(res.status, 200);
    assert.equal(res.body.staff.role, 'Sacristan');
    assert.equal((await listed(parish.staff)).role, 'Sacristan');
  });

  it('keeps a typed title that is not on the list, on the account and the Personnel list', async () => {
    const res = await api(parish.admin)
      .patch(`/staff/${parish.staff.id}`)
      .send({ name: 'Stef Staff', email: parish.staff.email, role: ' Choir  Director', accessRole: 'staff' });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal((await listed(parish.staff)).role, 'Choir Director');
    const person = await pool.query('SELECT role_title FROM parish_personnel WHERE user_id = $1', [parish.staff.id]);
    assert.equal(person.rows[0].role_title, 'Choir Director');

    const tooLong = await api(parish.admin)
      .patch(`/staff/${parish.staff.id}`)
      .send({ name: 'Stef Staff', email: parish.staff.email, role: 'x'.repeat(61), accessRole: 'staff' });
    assert.equal(tooLong.status, 400);
  });
});
