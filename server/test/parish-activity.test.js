// A parish admin's Activity page: only their own parish, filterable by person, area and kind. Staff can't see it.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish } = require('./helpers');

describe('Parish activity log', () => {
  let parish;
  let other;

  before(async () => {
    parish = await createParish('Activity');
    other = await createParish('Activity Other');
    await pool.query(
      `INSERT INTO audit_log (parish_id, actor_id, action, entity_type, entity_id, metadata, created_at) VALUES
       ($1, $2, 'baptism.created', 'baptism', gen_random_uuid(), '{}', '2020-01-01'),
       ($1, $3, 'donation.voided', 'donation', gen_random_uuid(), '{"reason":"Typed twice"}', '2020-01-02'),
       ($1, $2, 'app_user.updated', 'app_user', gen_random_uuid(), '{}', '2020-01-03'),
       ($1, $3, 'auth.login_failed', 'app_user', gen_random_uuid(), '{}', '2020-01-04'),
       ($4, $5, 'baptism.created', 'baptism', gen_random_uuid(), '{}', '2020-01-05')`,
      [parish.id, parish.admin.id, parish.staff.id, other.id, other.admin.id]
    );
  });

  after(() => pool.end());

  async function page(query = {}) {
    const res = await api(parish.admin).get('/audit/parish').query(query);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    return res.body.entries;
  }

  it("shows only the admin's own parish, even when asked for another", async () => {
    const entries = await page({ parishId: other.id });
    assert.ok(entries.length >= 4);
    assert.ok(entries.every((e) => e.parishId === parish.id));
  });

  it('is for admins only', async () => {
    assert.equal((await api(parish.staff).get('/audit/parish')).status, 403);
    assert.equal((await api(parish.parishioner).get('/audit/parish')).status, 403);
    assert.equal((await api(null).get('/audit/parish')).status, 401);
  });

  it('filters by person', async () => {
    const entries = await page({ actorId: parish.staff.id });
    assert.deepEqual(entries.map((e) => e.action).sort(), ['auth.login_failed', 'donation.voided']);
  });

  it('filters by area', async () => {
    assert.deepEqual((await page({ area: 'donations' })).map((e) => e.action), ['donation.voided']);
    assert.deepEqual((await page({ area: 'registers' })).map((e) => e.action), ['baptism.created']);
    const accounts = (await page({ area: 'accounts' })).map((e) => e.action);
    assert.ok(accounts.includes('app_user.updated') && accounts.includes('auth.login_failed'));
  });

  it('filters by kind, and combines filters', async () => {
    assert.deepEqual((await page({ kind: 'red' })).map((e) => e.action), ['auth.login_failed']);
    assert.deepEqual((await page({ kind: 'yellow', actorId: parish.staff.id })).map((e) => e.action), ['donation.voided']);
  });

  it('turns away filters that make no sense', async () => {
    for (const query of [{ area: 'kitchen' }, { actorId: 'nobody' }, { kind: 'blue' }]) {
      assert.equal((await api(parish.admin).get('/audit/parish').query(query)).status, 400);
    }
  });
});
