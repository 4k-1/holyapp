// Parishioner sign-up, email first: code → name and birthday → password. No account exists until
// the last step, and the sign-up row is gone once it does. Brevo is faked, so the code is read
// from the email that would have been sent and nothing leaves this machine.

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish } = require('./helpers');

const realFetch = globalThis.fetch;
const savedEnv = { BREVO_API_KEY: process.env.BREVO_API_KEY, SMTP_FROM: process.env.SMTP_FROM };

describe('Parishioner sign-up', () => {
  let parish;
  let sent;

  const lastCode = () => /code is (\d{4})/.exec(sent.at(-1).textContent)[1];
  const fresh = (label) => `signup.${label}.${Date.now()}.${Math.random().toString(16).slice(2, 6)}@holyapp.test`;
  const start = (email) => api().post('/auth/signup/start').send({ email, parishId: parish.id });
  const verify = (email, code) => api().post('/auth/signup/verify').send({ email, code });
  const about = { firstName: 'Lorna', lastName: 'Abellana', birthday: '1990-02-02', password: 'a-long-password' };
  const finish = (email, signupToken, extra = {}) =>
    api().post('/auth/signup/finish').send({ email, signupToken, ...about, ...extra });
  const row = async (email) => (await pool.query('SELECT * FROM signup_verification WHERE email = $1', [email])).rows[0];
  // Lets the next code go out without waiting the minute between codes.
  const skipWait = (email) =>
    pool.query(`UPDATE signup_verification SET last_sent_at = NOW() - INTERVAL '2 minutes' WHERE email = $1`, [email]);

  async function codeFor(email) {
    const res = await start(email);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    return lastCode();
  }

  async function tokenFor(email) {
    const res = await verify(email, await codeFor(email));
    assert.equal(res.status, 200, JSON.stringify(res.body));
    return res.body.signupToken;
  }

  before(async () => {
    parish = await createParish('Sign-up');
    process.env.BREVO_API_KEY = 'test-brevo-key';
    process.env.SMTP_FROM = 'HolyApp <holyapp.sender@holyapp.test>';
  });

  beforeEach(() => {
    sent = [];
    globalThis.fetch = async (url, init) => {
      sent.push(JSON.parse(init.body));
      return { ok: true, status: 201, json: async () => ({ messageId: `<m${sent.length}@test>` }) };
    };
  });

  after(async () => {
    globalThis.fetch = realFetch;
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    await pool.end();
  });

  it('makes the account only at the last step, verified, without an address, and removes the sign-up row', async () => {
    const email = fresh('happy');
    const token = await tokenFor(email);
    assert.equal((await pool.query('SELECT 1 FROM app_user WHERE email = $1', [email])).rowCount, 0, 'no account yet');

    const res = await finish(email, token, { middleName: '  Cuyos ' });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.ok(res.body.token, 'signed in');
    assert.equal(res.body.user.role, 'parishioner');
    assert.equal(res.body.user.parish_id, parish.id);
    assert.equal(res.body.user.middle_name, 'Cuyos');
    assert.equal(res.body.user.birthday, '1990-02-02');
    assert.ok(res.body.user.email_verified_at);
    assert.equal(res.body.user.address, null);
    assert.equal(await row(email), undefined, 'the sign-up row is deleted');

    const again = await finish(email, token);
    assert.equal(again.status, 400, 'a sign-up token works once');
  });

  it('accepts the email in any case and stores it lower-case', async () => {
    const email = fresh('case');
    const token = await tokenFor(email.toUpperCase());
    const res = await finish(email, token);
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.user.email, email);
  });

  it('answers an existing account the same way but emails a sign-in note instead of a code', async () => {
    const res = await start(parish.parishioner.email);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { ok: true, email: parish.parishioner.email });
    assert.equal(sent.length, 1);
    assert.equal(sent[0].subject, 'You already have a HolyApp account');
    assert.doesNotMatch(sent[0].textContent, /code is/);
    assert.equal(await row(parish.parishioner.email), undefined, 'nothing stored for an existing account');
  });

  it('refuses a wrong code, and a new code after five wrong guesses', async () => {
    const email = fresh('guess');
    const code = await codeFor(email);
    const wrong = code === '0000' ? '1111' : '0000';
    for (let i = 0; i < 5; i += 1) {
      const res = await verify(email, wrong);
      assert.equal(res.status, 400);
    }
    const right = await verify(email, code);
    assert.equal(right.status, 429, 'even the right code is refused once the guesses are used');

    await skipWait(email);
    const newCode = await codeFor(email);
    const ok = await verify(email, newCode);
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
  });

  it('replaces the code on resend, makes you wait a minute, and stops after five codes an hour', async () => {
    const email = fresh('resend');
    const first = await codeFor(email);
    const tooSoon = await start(email);
    assert.equal(tooSoon.status, 429);
    assert.match(tooSoon.body.error, /seconds/);

    await skipWait(email);
    const second = await codeFor(email);
    if (first !== second) assert.equal((await verify(email, first)).status, 400, 'the old code stops working');

    for (let n = 3; n <= 5; n += 1) {
      await skipWait(email);
      await codeFor(email);
    }
    await skipWait(email);
    const sixth = await start(email);
    assert.equal(sixth.status, 429);
    assert.match(sixth.body.error, /5 codes/);
    assert.equal((await row(email)).sends, 5);
  });

  it('does not count a code that failed to send', async () => {
    const email = fresh('mailfail');
    globalThis.fetch = async () => ({ ok: false, status: 400, json: async () => ({ message: 'nope' }) });
    const res = await start(email);
    assert.equal(res.status, 503);
    globalThis.fetch = async (url, init) => {
      sent.push(JSON.parse(init.body));
      return { ok: true, status: 201, json: async () => ({}) };
    };
    const retry = await start(email);
    assert.equal(retry.status, 200, 'no wait after a failed send');
    assert.equal((await row(email)).sends, 1);
  });

  it('refuses a code older than ten minutes and an expired sign-up token', async () => {
    const email = fresh('old');
    const code = await codeFor(email);
    await pool.query(`UPDATE signup_verification SET last_sent_at = NOW() - INTERVAL '11 minutes' WHERE email = $1`, [email]);
    assert.equal((await verify(email, code)).status, 400);

    const other = fresh('late');
    const token = await tokenFor(other);
    await pool.query(`UPDATE signup_verification SET expires_at = NOW() - INTERVAL '1 second' WHERE email = $1`, [other]);
    assert.equal((await finish(other, token)).status, 400);
  });

  it('checks the name, birthday and password before making the account', async () => {
    const email = fresh('checks');
    const token = await tokenFor(email);
    const tomorrow = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
    assert.equal((await finish(email, token, { firstName: ' ' })).status, 400);
    assert.equal((await finish(email, token, { birthday: tomorrow })).status, 400);
    assert.equal((await finish(email, token, { birthday: '1990-02-30' })).status, 400);
    assert.equal((await finish(email, token, { password: 'short' })).status, 400);
    assert.equal((await finish(email, token, { signupToken: 'x'.repeat(43) })).status, 400);
    assert.ok(await row(email), 'the sign-up survives refused attempts');
    assert.equal((await finish(email, token)).status, 201);
  });

  it('lets an unfinished sign-up from the old flow start over', async () => {
    const email = fresh('legacy');
    const old = await pool.query(
      `INSERT INTO app_user (parish_id, role, email, password_hash, status, first_name, last_name)
       VALUES ($1, 'parishioner', $2, 'x', 'active', 'Old', 'Signup') RETURNING id`,
      [parish.id, email]
    );
    // A failed sign-in was logged against it, which once made deleting it impossible.
    await pool.query(
      `INSERT INTO audit_log (parish_id, actor_id, action, entity_type, entity_id, metadata) VALUES ($1, $2, 'auth.login_failed', 'app_user', $2, '{}')`,
      [parish.id, old.rows[0].id]
    );
    const token = await tokenFor(email);
    const res = await finish(email, token);
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const users = await pool.query('SELECT first_name FROM app_user WHERE email = $1', [email]);
    assert.deepEqual(users.rows, [{ first_name: 'Lorna' }]);
  });

  it('can sign in with the new password', async () => {
    const email = fresh('login');
    await finish(email, await tokenFor(email));
    const res = await api().post('/auth/login').send({ email, password: about.password });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.ok(res.body.token);
  });
});
