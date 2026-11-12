// The super admin audit log: newest first, 100 at a time, with older entries reachable and filters over the whole log.

const crypto = require('crypto');
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish } = require('./helpers');
const { signAccessToken } = require('../src/utils/tokens');

describe('Audit log paging and filters', () => {
  let parish;
  let other;
  let superAdmin;

  before(async () => {
    parish = await createParish('Audit');
    other = await createParish('Audit Other');
    const tag = crypto.randomBytes(4).toString('hex');
    const result = await pool.query(
      `INSERT INTO app_user (parish_id, role, email, password_hash, status, first_name, last_name, email_verified_at)
       VALUES (NULL, 'super_admin', $1, 'x', 'active', 'Sue', 'Super', NOW())
       RETURNING id, parish_id, role, email`,
      [`super.${tag}@holyapp.test`]
    );
    superAdmin = { ...result.rows[0], token: signAccessToken(result.rows[0]) };

    // 130 everyday entries for this parish, one second apart, plus one failed sign-in and one removal.
    const values = [];
    const params = [];
    for (let i = 0; i < 130; i += 1) {
      params.push(parish.id, parish.admin.id, `2020-01-01T00:00:00Z`, i);
      const n = params.length;
      values.push(
        `($${n - 3}, $${n - 2}, 'baptism.updated', 'baptism', gen_random_uuid(), '{}', $${n - 1}::timestamp + make_interval(secs => $${n}))`
      );
    }
    await pool.query(
      `INSERT INTO audit_log (parish_id, actor_id, action, entity_type, entity_id, metadata, created_at)
       VALUES ${values.join(', ')}`,
      params
    );
    await pool.query(
      `INSERT INTO audit_log (parish_id, actor_id, action, entity_type, entity_id, metadata, created_at) VALUES
       ($1, $2, 'auth.login_failed', 'app_user', gen_random_uuid(), '{}', '2020-01-02'),
       ($1, $2, 'app_user.removed', 'app_user', gen_random_uuid(), '{}', '2020-01-03')`,
      [parish.id, parish.admin.id]
    );
    await pool.query(
      `INSERT INTO audit_log (parish_id, actor_id, action, entity_type, entity_id, metadata, created_at)
       VALUES ($1, $2, 'baptism.created', 'baptism', gen_random_uuid(), '{}', '2020-01-04')`,
      [other.id, other.admin.id]
    );
  });

  after(() => pool.end());

  async function page(query) {
    const res = await api(superAdmin).get('/audit').query(query);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    return res.body;
  }

  it('returns 100 at a time and reaches every older entry without repeats', async () => {
    const first = await page({ parishId: parish.id });
    assert.equal(first.entries.length, 100);
    assert.equal(first.hasMore, true);
    const second = await page({ parishId: parish.id, beforeId: first.entries.at(-1).id });
    assert.equal(second.entries.length, 32);
    assert.equal(second.hasMore, false);
    const ids = new Set([...first.entries, ...second.entries].map((e) => e.id));
    assert.equal(ids.size, 132);
    const times = [...first.entries, ...second.entries].map((e) => e.createdAt);
    assert.deepEqual(times, [...times].sort().reverse());
  });

  it('keeps each parish to its own entries', async () => {
    const { entries } = await page({ parishId: other.id });
    assert.ok(entries.length >= 1);
    assert.ok(entries.every((e) => e.parishId === other.id));
  });

  it('filters failed sign-ins, removals and everyday activity across the whole log', async () => {
    const red = await page({ parishId: parish.id, kind: 'red' });
    assert.deepEqual(red.entries.map((e) => e.action), ['auth.login_failed']);
    const yellow = await page({ parishId: parish.id, kind: 'yellow' });
    assert.deepEqual(yellow.entries.map((e) => e.action), ['app_user.removed']);
    const green = await page({ parishId: parish.id, kind: 'green' });
    assert.ok(green.entries.every((e) => e.action === 'baptism.updated'));
  });

  it('refuses a bad place, parish or kind', async () => {
    for (const query of [{ beforeId: 'nope' }, { parishId: 'nope' }, { kind: 'purple' }]) {
      const res = await api(superAdmin).get('/audit').query(query);
      assert.equal(res.status, 400);
    }
  });

  it('is for the super admin only', async () => {
    const res = await api(parish.admin).get('/audit');
    assert.equal(res.status, 403);
  });
});
