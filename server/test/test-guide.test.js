// UAT only: the in-app test guide and the automatic test office for the ready-made tester accounts.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish, createBaptism } = require('./helpers');
const { hashPassword } = require('../src/utils/password');
const { signAccessToken } = require('../src/utils/tokens');
const { runOnce, nameMatches } = require('../src/testing/testOffice');

async function createTester(parishId, n) {
  const { rows } = await pool.query(
    `INSERT INTO app_user (parish_id, role, email, password_hash, status, first_name, last_name, email_verified_at)
     VALUES ($1, 'parishioner', $2, $3, 'active', 'Test', 'Parishioner', NOW())
     RETURNING id, parish_id, role, email`,
    [parishId, `holyapp.uat+test${n}@gmail.com`, await hashPassword('password123')]
  );
  return { ...rows[0], token: signAccessToken(rows[0]) };
}

function requestFor(first, last, birthdate) {
  return {
    sacramentType: 'baptism',
    deliveryMethod: 'digital',
    purpose: 'School enrollment',
    relationship: 'Other relative',
    fields: { firstName: first, lastName: last, birthdate, birthplace: 'Cebu City' },
  };
}

describe('Test guide and automatic test office', () => {
  const saved = {};
  let parish;
  let tester;
  let other;

  before(async () => {
    for (const key of ['UAT_MODE', 'UAT_TESTER_PARISHES', 'UAT_TESTER_PASSWORD', 'UAT_OFFICE_DELAY_SECONDS', 'PAYMONGO_SECRET_KEY']) {
      saved[key] = process.env[key];
    }
    parish = await createParish('Guide');
    process.env.UAT_TESTER_PARISHES = `${parish.slug},${parish.slug}`;
    process.env.UAT_TESTER_PASSWORD = 'password123';
    process.env.UAT_OFFICE_DELAY_SECONDS = '0';
    tester = await createTester(parish.id, 1);
    // Tester 1's person on the handout card, with a middle name the tester leaves out.
    await createBaptism(parish.admin, { firstName: 'Maria', middleName: 'Cruz', lastName: 'Santos', dateOfBirth: '1990-03-03' });
    other = parish.parishioner;
  });

  after(async () => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await pool.end();
  });

  it('stays hidden unless UAT_MODE is on', async () => {
    delete process.env.UAT_MODE;
    assert.deepEqual((await api(null).get('/test-guide/status')).body, { enabled: false });
    assert.equal((await api(null).get('/test-guide/testers/1')).status, 404);
    assert.equal((await api(tester).get('/test-guide/me')).status, 404);
  });

  it('refuses to run beside a live PayMongo key', async () => {
    process.env.UAT_MODE = 'on';
    process.env.PAYMONGO_SECRET_KEY = 'sk_live_example';
    assert.deepEqual((await api(null).get('/test-guide/status')).body, { enabled: false });
    process.env.PAYMONGO_SECRET_KEY = 'sk_test_example';
    assert.deepEqual((await api(null).get('/test-guide/status')).body, { enabled: true });
  });

  it('gives a tester their sign-in details and progress', async () => {
    const signIn = await api(null).get('/test-guide/testers/1');
    assert.equal(signIn.status, 200);
    assert.equal(signIn.body.email, 'holyapp.uat+test1@gmail.com');
    assert.equal(signIn.body.parishSlug, parish.slug);

    const me = await api(tester).get('/test-guide/me');
    assert.equal(me.status, 200);
    assert.equal(me.body.tester.first, 'Maria');
    assert.equal(me.body.steps.find((s) => s.key === 'signin').status, 'done');
    assert.equal(me.body.steps.find((s) => s.key === 'request').status, null);
  });

  it('shows nothing to parishioners who are not ready-made testers', async () => {
    assert.equal((await api(other).get('/test-guide/me')).status, 404);
    assert.equal((await api(null).get('/test-guide/testers/99')).status, 404);
  });

  it('saves when a task was started, hints, skips and ratings', async () => {
    const save = (body) => api(tester).put('/test-guide/me/steps/give').send(body);
    const give = async () => (await api(tester).get('/test-guide/me')).body.steps.find((s) => s.key === 'give');

    assert.equal((await save({ started: true })).status, 200);
    let step = await give();
    assert.equal(step.started, true);
    assert.equal(step.status, null);
    assert.equal(step.hintUsed, false);

    assert.equal((await save({ hint: true })).status, 200);
    assert.equal((await save({ status: 'skipped' })).status, 200);
    assert.equal((await save({ rating: 'hard' })).status, 200);
    step = await give();
    assert.equal(step.status, 'skipped');
    assert.equal(step.rating, 'hard');
    assert.equal(step.hintUsed, true, 'a later save does not clear the hint');
    assert.equal(typeof step.seconds, 'number');

    assert.equal((await save({})).status, 400);
    assert.equal((await api(tester).put('/test-guide/me/steps/nonsense').send({ status: 'done' })).status, 400);
  });

  it('finds the record for a tester request with the middle name left out', async () => {
    const sent = await api(tester).post('/requests').send(requestFor('Maria', 'Santos', '1990-03-03'));
    assert.equal(sent.status, 201, JSON.stringify(sent.body));
    await runOnce();
    const mine = (await api(tester).get(`/requests/mine/${sent.body.id}`)).body.request;
    assert.equal(mine.status, 'processing');
    assert.ok(mine.linkedRecordId);

    const audit = await pool.query(
      `SELECT u.first_name, u.last_name, u.status FROM audit_log a JOIN app_user u ON u.id = a.actor_id
       WHERE a.entity_id = $1 AND a.action = 'certificate_request.linked'`,
      [sent.body.id]
    );
    assert.deepEqual(audit.rows[0], { first_name: 'Automatic', last_name: 'Test Office', status: 'suspended' });
  });

  it('turns down a tester request that matches no record, with a reason', async () => {
    const sent = await api(tester).post('/requests').send(requestFor('Maria', 'Santos', '1991-01-01'));
    await runOnce();
    const mine = (await api(tester).get(`/requests/mine/${sent.body.id}`)).body.request;
    assert.equal(mine.status, 'rejected');
    assert.match(mine.rejectionReason, /could not find a baptism record/);
  });

  it('leaves requests from other parishioners for the real office', async () => {
    const sent = await api(other).post('/requests').send(requestFor('Maria', 'Santos', '1990-03-03'));
    await runOnce();
    const mine = (await api(other).get(`/requests/mine/${sent.body.id}`)).body.request;
    assert.equal(mine.status, 'pending');
  });

  it('matches names the way the office search does', () => {
    assert.equal(nameMatches('Maria Santos', 'Maria Cruz Santos'), true);
    assert.equal(nameMatches('Joy Ybanez', 'Joy Sy Ybañez'), true);
    assert.equal(nameMatches('Maria Santos', 'Mario Reyes'), false);
  });
});
