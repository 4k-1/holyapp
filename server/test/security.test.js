// Public-site protections: attempt limits on sign-in codes, security headers, no leftover debug routes.

const { describe, it, after, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { pool } = require('./helpers');
const app = require('../src/app');
const { limits } = require('../src/middleware/security');

describe('Public-site protections', () => {
  after(() => pool.end());
  afterEach(() => {
    limits.codeByChallenge.enabledInTests = false;
    limits.codeByChallenge.reset();
  });

  it('gives each sign-in code only 5 guesses', async () => {
    limits.codeByChallenge.enabledInTests = true;
    const challengeId = '00000000-0000-4000-8000-000000000001';
    for (let i = 0; i < 5; i += 1) {
      const res = await request(app).post('/auth/login/2fa').send({ challengeId, code: String(1000 + i) });
      assert.equal(res.status, 400);
    }
    const blocked = await request(app).post('/auth/login/2fa').send({ challengeId, code: '1005' });
    assert.equal(blocked.status, 429);
    assert.match(blocked.body.error, /Too many wrong codes/);
  });

  it('sends basic security headers', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.equal(res.headers['x-frame-options'], 'DENY');
    assert.equal(res.headers['x-powered-by'], undefined);
  });

  it('has no leftover database test route', async () => {
    const res = await request(app).get('/db-test');
    assert.equal(res.status, 404);
  });
});
