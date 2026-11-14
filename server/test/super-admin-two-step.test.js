// Super admins always sign in in two steps. Delivery is mocked for now: the code comes back to the sign-in page.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { pool, api, PASSWORD } = require('./helpers');
const { hashPassword } = require('../src/utils/password');

describe('Super admin two-step sign-in', () => {
  const email = `super.${crypto.randomBytes(4).toString('hex')}@holyapp.test`;
  const deviceId = crypto.randomUUID();
  let userId;

  before(async () => {
    const result = await pool.query(
      `INSERT INTO app_user (parish_id, role, email, password_hash, status, first_name, last_name, email_verified_at)
       VALUES (NULL, 'super_admin', $1, $2, 'active', 'Sol', 'Super', NOW())
       RETURNING id`,
      [email, await hashPassword(PASSWORD)]
    );
    userId = result.rows[0].id;
  });

  after(() => pool.end());

  function signIn() {
    return api(null).post('/auth/login/super-admin').send({ email, password: PASSWORD, device_id: deviceId });
  }

  it('asks for a code instead of signing straight in, and hands back the test code', async () => {
    const res = await signIn();
    assert.equal(res.status, 200);
    assert.equal(res.body.two_factor_required, true);
    assert.ok(res.body.challenge_id);
    assert.match(res.body.mock_code, /^\d{4}$/);
    assert.equal(res.body.token, undefined);
  });

  it('turns away a wrong code', async () => {
    const first = await signIn();
    const wrong = first.body.mock_code === '0000' ? '1111' : '0000';
    const res = await api(null).post('/auth/login/2fa').send({ challenge_id: first.body.challenge_id, code: wrong, device_id: deviceId });
    assert.equal(res.status, 400);
  });

  it('signs in with the right code, once', async () => {
    const first = await signIn();
    const body = { challenge_id: first.body.challenge_id, code: first.body.mock_code, device_id: deviceId };
    const res = await api(null).post('/auth/login/2fa').send(body);
    assert.equal(res.status, 200);
    assert.ok(res.body.token);
    assert.equal(res.body.user.role, 'super_admin');
    // The same code can't be used again.
    assert.equal((await api(null).post('/auth/login/2fa').send(body)).status, 400);
  });

  it('asks again on the same device, and remembers no device', async () => {
    const res = await signIn();
    assert.equal(res.body.two_factor_required, true);
    const trusted = await pool.query('SELECT count(*)::int AS n FROM trusted_device WHERE user_id = $1', [userId]);
    assert.equal(trusted.rows[0].n, 0);
  });

  it('gives a fresh test code on resend', async () => {
    const first = await signIn();
    const res = await api(null).post('/auth/login/2fa/resend').send({ challenge_id: first.body.challenge_id, device_id: deviceId });
    assert.equal(res.status, 200);
    assert.notEqual(res.body.challenge_id, first.body.challenge_id);
    assert.match(res.body.mock_code, /^\d{4}$/);
  });
});
