// Super admin reports: counts for a period, the period before it, and each parish's activity.

const crypto = require('crypto');
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish, createBaptism } = require('./helpers');
const { signAccessToken } = require('../src/utils/tokens');
const { rangeBounds } = require('../src/controllers/platformReportsController');

const DAY_MS = 86_400_000;
/** A day in Manila, `n` days from today, as YYYY-MM-DD. */
function day(n = 0) {
  return new Date(Date.now() + 8 * 3600 * 1000 + n * DAY_MS).toISOString().slice(0, 10);
}

function tag() {
  return crypto.randomBytes(4).toString('hex');
}

describe('Platform reports', () => {
  let parish;
  let quiet;
  let superAdmin;

  before(async () => {
    parish = await createParish('Reports');
    quiet = await createParish('Reports Quiet');
    const result = await pool.query(
      `INSERT INTO app_user (parish_id, role, email, password_hash, status, first_name, last_name, email_verified_at)
       VALUES (NULL, 'super_admin', $1, 'x', 'active', 'Sue', 'Super', NOW())
       RETURNING id, parish_id, role, email`,
      [`super.${tag()}@holyapp.test`]
    );
    superAdmin = { ...result.rows[0], token: signAccessToken(result.rows[0]) };

    // Four baptisms: one now, one now but archived, one 45 days ago, one two years ago.
    const now = await createBaptism(parish.admin, { firstName: 'Now' });
    const archived = await createBaptism(parish.admin, { firstName: 'Archived' });
    const earlier = await createBaptism(parish.admin, { firstName: 'Earlier' });
    const twoYears = await createBaptism(parish.admin, { firstName: 'Two' });
    await pool.query(`UPDATE baptism SET archived_at = NOW() WHERE id = $1`, [archived.id]);
    await pool.query(`UPDATE baptism SET created_at = NOW() - interval '45 days' WHERE id = $1`, [earlier.id]);
    await pool.query(`UPDATE baptism SET created_at = NOW() - interval '2 years' WHERE id = $1`, [twoYears.id]);

    // Two certificates issued now, one of them spoiled.
    for (const voidKind of [null, 'spoiled']) {
      await pool.query(
        `INSERT INTO certificate (record_type, record_id, parish_id, version, hash, pdf_url, qr_code, issued_by, void_kind)
         VALUES ('baptism', $1, $2, 1, $3, 'x', 'x', $4, $5)`,
        [now.id, parish.id, `hash-${tag()}`, parish.admin.id, voidKind]
      );
    }

    // One request still waiting.
    await pool.query(
      `INSERT INTO certificate_request (parish_id, request_type, record_type, purpose, copies, reference_no, status)
       VALUES ($1, 'online', 'baptism', 'School', 1, $2, 'pending')`,
      [parish.id, `CR-T-${tag()}`]
    );

    // The quiet parish only has a super admin action, which isn't the parish using HolyApp.
    await pool.query(
      `INSERT INTO audit_log (parish_id, actor_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, 'parish.updated', 'parish', $1, '{}')`,
      [quiet.id, superAdmin.id]
    );
  });

  after(() => pool.end());

  /** The last 31 days (the 31 before them are the comparison), or any other range. */
  async function report(query = { from: day(-30), to: day(0) }) {
    const res = await api(superAdmin).get('/platform/reports').query(query);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    return res.body.report;
  }

  function rowFor(rep, id) {
    const row = rep.parishes.find((p) => p.id === id);
    assert.ok(row, 'parish missing from the report');
    return row;
  }

  it('includes both ends, and compares with the same number of days before', () => {
    const range = rangeBounds('2026-11-01', '2026-11-30');
    assert.equal(range.start, '2026-11-01 00:00:00');
    assert.equal(range.end, '2026-12-01 00:00:00');
    assert.deepEqual(
      { from: range.previous.from, to: range.previous.to, days: range.previous.days },
      { from: '2026-10-02', to: '2026-10-31', days: 30 }
    );
    const swapped = rangeBounds('2026-11-30', '2026-11-01');
    assert.equal(swapped.from, '2026-11-01');
    assert.equal(rangeBounds('2026-11-01', '').previous, null);
    assert.equal(rangeBounds('', '').start, null);
  });

  it('counts only what falls in the period, leaving out archived records and spoiled certificates', async () => {
    const recent = rowFor(await report(), parish.id);
    assert.equal(recent.records, 1);
    assert.equal(recent.certificates, 1);
    assert.equal(recent.openRequests, 1);

    const all = rowFor(await report({}), parish.id);
    assert.equal(all.records, 3);
    assert.equal(all.certificates, 1);
  });

  it('compares with the period before, and has nothing to compare for all time', async () => {
    const recent = await report();
    assert.ok(recent.previous.records >= 1, 'the record from 45 days ago belongs to the 31 days before');
    assert.equal(recent.previousRange.days, 31);
    assert.equal(recent.previousRange.to, day(-31));
    assert.equal((await report({})).previous, null);
    assert.equal((await report({ from: day(-30) })).previous, null);
  });

  it('shows office activity, not super admin actions', async () => {
    const rep = await report();
    const busy = rowFor(rep, parish.id);
    assert.equal(busy.activeInPeriod, true);
    assert.ok(busy.lastActivity);
    assert.equal(busy.hasAdmin, true);

    const idle = rowFor(rep, quiet.id);
    assert.equal(idle.activeInPeriod, false);
    assert.equal(idle.lastActivity, null);
  });

  it('groups by week from the first day, by month, or by year, depending on the range', async () => {
    const weeks = await report({ from: '2026-11-01', to: '2026-11-30' });
    assert.equal(weeks.unit, 'week');
    assert.deepEqual(
      weeks.buckets.map((b) => `${b.start}..${b.end}`),
      ['2026-11-01..2026-11-07', '2026-11-08..2026-11-14', '2026-11-15..2026-11-21', '2026-11-22..2026-11-28', '2026-11-29..2026-11-30']
    );
    const months = await report({ from: '2026-01-15', to: '2026-12-31' });
    assert.equal(months.unit, 'month');
    assert.equal(months.buckets.length, 12);
    assert.equal(months.buckets[0].start, '2026-01-15');
    const years = await report({ from: '2022-01-01', to: '2026-12-31' });
    assert.equal(years.unit, 'year');
    assert.equal(years.buckets.length, 5);
  });

  it('refuses a date that does not exist, and anyone but a super admin', async () => {
    const bad = await api(superAdmin).get('/platform/reports').query({ from: '2026-02-30' });
    assert.equal(bad.status, 400);
    const admin = await api(parish.admin).get('/platform/reports');
    assert.equal(admin.status, 403);
  });
});
