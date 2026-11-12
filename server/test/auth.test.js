// Signing in.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish, PASSWORD } = require('./helpers');

describe('Sign-in', () => {
  let parish;

  before(async () => {
    parish = await createParish('Auth');
  });

  after(() => pool.end());

  it('signs in with the right password and returns a working token', async () => {
    const res = await api(null).post('/auth/login').send({ email: parish.staff.email, password: PASSWORD });
    assert.equal(res.status, 200);
    const token = res.body.accessToken || res.body.token || res.body.access_token;
    assert.ok(token, 'the response holds an access token');

    const me = await api({ token }).get('/auth/me');
    assert.equal(me.status, 200);
  });

  it('refuses a wrong password', async () => {
    const res = await api(null).post('/auth/login').send({ email: parish.staff.email, password: 'wrong-password' });
    assert.equal(res.status, 401);
  });

  it('refuses an unknown email with the same message as a wrong password', async () => {
    const wrongPassword = await api(null)
      .post('/auth/login')
      .send({ email: parish.staff.email, password: 'wrong-password' });
    const unknown = await api(null).post('/auth/login').send({ email: 'nobody@holyapp.test', password: PASSWORD });
    assert.equal(unknown.status, 401);
    assert.equal(unknown.body.error, wrongPassword.body.error);
  });

  it('refuses a suspended account', async () => {
    await pool.query("UPDATE app_user SET status = 'suspended' WHERE id = $1", [parish.parishioner.id]);
    const res = await api(null).post('/auth/login').send({ email: parish.parishioner.email, password: PASSWORD });
    assert.equal(res.status, 403);
  });
});
