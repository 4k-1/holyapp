// E1: access per area. Admins have everything; each staff sign-in is Off, View or Manage per area.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish, baptismBody } = require('./helpers');

const ALL_MANAGE = {
  registers: 'manage',
  certificates: 'manage',
  donations: 'manage',
  intentions: 'manage',
  schedule: 'manage',
  marriage: 'manage',
};

describe('Staff access per area', () => {
  let parish;

  before(async () => {
    parish = await createParish('Areas');
  });

  after(() => pool.end());

  async function setAccess(areaAccess) {
    const res = await api(parish.admin)
      .patch(`/staff/${parish.staff.id}`)
      .send({ name: 'Stef Staff', email: parish.staff.email, role: 'Parish Secretary', accessRole: 'staff', areaAccess });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    return res.body.staff;
  }

  it('gives existing staff Manage on every area, so nobody is locked out', async () => {
    const res = await api(parish.admin).get('/staff');
    const row = res.body.staff.find((s) => s.id === parish.staff.id);
    assert.deepEqual(row.areaAccess, ALL_MANAGE);
    assert.equal((await api(parish.staff).post('/records/baptism').send(baptismBody())).status, 201);
  });

  it('sends the area access with the signed-in user', async () => {
    const res = await api(parish.staff).get('/auth/me');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.user.area_access, ALL_MANAGE);
  });

  it('turns an area Off for one staff member', async () => {
    await setAccess({ ...ALL_MANAGE, donations: 'off' });
    assert.equal((await api(parish.staff).get('/donations')).status, 403);
    assert.equal((await api(parish.staff).get('/reports/donations')).status, 403);
    // Other areas still work, and the admin is never limited.
    assert.equal((await api(parish.staff).get('/records/baptism')).status, 200);
    assert.equal((await api(parish.admin).get('/donations')).status, 200);
  });

  it('lets View read but not change', async () => {
    await setAccess({ ...ALL_MANAGE, registers: 'view' });
    assert.equal((await api(parish.staff).get('/records/baptism')).status, 200);
    const res = await api(parish.staff).post('/records/baptism').send(baptismBody());
    assert.equal(res.status, 403);
    assert.equal(res.body.required_level, 'manage');
  });

  it('keeps the staff list of minister names open to every office sign-in', async () => {
    await setAccess({ ...ALL_MANAGE, schedule: 'off' });
    assert.equal((await api(parish.staff).get('/schedule/month?month=2026-11')).status, 403);
    assert.equal((await api(parish.staff).get('/schedule/staff')).status, 200);
  });

  it('keeps what they have when an edit leaves access out', async () => {
    await setAccess({ ...ALL_MANAGE, intentions: 'off' });
    const res = await api(parish.admin)
      .patch(`/staff/${parish.staff.id}`)
      .send({ name: 'Stef Staff', email: parish.staff.email, role: 'Parish Secretary', accessRole: 'staff' });
    assert.equal(res.status, 200);
    assert.equal(res.body.staff.areaAccess.intentions, 'off');
  });

  it('rejects an incomplete or unknown level instead of guessing', async () => {
    const res = await api(parish.admin)
      .patch(`/staff/${parish.staff.id}`)
      .send({
        name: 'Stef Staff',
        email: parish.staff.email,
        role: 'Parish Secretary',
        accessRole: 'staff',
        areaAccess: { registers: 'everything' },
      });
    assert.equal(res.status, 400);
  });

  it('creates a new sign-in with a preset', async () => {
    const cashier = {
      registers: 'off',
      certificates: 'view',
      donations: 'manage',
      intentions: 'manage',
      schedule: 'view',
      marriage: 'off',
    };
    const res = await api(parish.admin)
      .post('/staff')
      .send({ name: 'Cora Cashier', email: `cora.${Date.now()}@holyapp.test`, role: 'Parish Secretary', accessRole: 'staff', areaAccess: cashier });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.deepEqual(res.body.staff.areaAccess, cashier);
  });

  it('leaves areas a staff member cannot see off the dashboard', async () => {
    await setAccess(ALL_MANAGE);
    const today = new Date().toISOString().slice(0, 10);
    const gift = await api(parish.admin)
      .post('/donations')
      .send({ donorName: 'Dash Donor', donationType: 'Cash', amount: 500, donationDate: today });
    assert.equal(gift.status, 201, JSON.stringify(gift.body));

    const open = await api(parish.staff).get('/dashboard');
    assert.equal(open.status, 200);
    assert.ok(open.body.stats.donationsThisMonth > 0);
    assert.ok(open.body.activity.some((a) => a.text.startsWith('Donation recorded')));

    await setAccess({ ...ALL_MANAGE, donations: 'off', schedule: 'off', certificates: 'off' });
    const limited = await api(parish.staff).get('/dashboard');
    assert.equal(limited.status, 200);
    assert.equal(limited.body.access.donations, 'off');
    assert.equal(limited.body.stats.donationsThisMonth, 0);
    assert.equal(limited.body.stats.toReview, 0);
    assert.equal(limited.body.stats.unassigned, 0);
    assert.ok(limited.body.activity.every((a) => !/donation|certificate/i.test(a.text)));
    assert.ok(limited.body.week.length === 7 && limited.body.week.every((d) => d.items.length === 0));
    assert.ok(limited.body.attention.every((a) => !['review', 'ready', 'records', 'unassigned'].includes(a.id)));

    // The admin's dashboard is never limited.
    const admin = await api(parish.admin).get('/dashboard');
    assert.ok(admin.body.stats.donationsThisMonth > 0);
  });

  it('lets anyone who can view a record issue, check and reprint its certificate', async () => {
    await setAccess({ ...ALL_MANAGE, registers: 'view', certificates: 'off' });
    const made = await api(parish.admin).post('/records/baptism').send(baptismBody());
    assert.equal(made.status, 201, JSON.stringify(made.body));
    const recordId = made.body.record.id;

    const issued = await api(parish.staff).post(`/records/baptism/${recordId}/certificates`).send({ purpose: 'Personal records' });
    assert.equal(issued.status, 201, JSON.stringify(issued.body));
    const copy = issued.body.certificates[issued.body.certificates.length - 1];

    assert.equal((await api(parish.staff).get(`/certificates/${copy.id}`)).status, 200);
    const checked = await api(parish.staff).post(`/certificates/${copy.id}/confirm-print`);
    assert.equal(checked.status, 200, JSON.stringify(checked.body));
    const again = await api(parish.staff).post(`/certificates/${copy.id}/reprints`).send({ reason: 'paper_jam' });
    assert.equal(again.status, 201, JSON.stringify(again.body));

    // Certificate requests and revoking still need the Certificates area.
    assert.equal((await api(parish.staff).get('/requests')).status, 403);
    const revoke = await api(parish.staff).post(`/certificates/${copy.id}/revoke`).send({ reason: 'Wrong date.' });
    assert.equal(revoke.status, 403);
  });

  it('still keeps record certificates from staff with Registers off', async () => {
    await setAccess({ ...ALL_MANAGE, registers: 'off', certificates: 'off' });
    const made = await api(parish.admin).post('/records/baptism').send(baptismBody());
    const res = await api(parish.staff).post(`/records/baptism/${made.body.record.id}/certificates`).send({ purpose: 'Personal records' });
    assert.equal(res.status, 403);
    await setAccess(ALL_MANAGE);
  });

  it('does not let staff change anyone\'s access', async () => {
    const res = await api(parish.staff)
      .patch(`/staff/${parish.staff.id}`)
      .send({ name: 'Stef Staff', email: parish.staff.email, role: 'Parish Secretary', accessRole: 'staff', areaAccess: ALL_MANAGE });
    assert.equal(res.status, 403);
  });
});
