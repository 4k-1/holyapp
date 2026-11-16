// New parish office accounts have no shared password: the person gets an emailed link to set their own, and a
// parish admin can send a new link later. Brevo is faked, so the link is read from the email that would go out.

const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish } = require('./helpers');

const realFetch = globalThis.fetch;
const savedEnv = { BREVO_API_KEY: process.env.BREVO_API_KEY, SMTP_FROM: process.env.SMTP_FROM };

describe('Staff account invitations', () => {
  let parish;
  let sent;

  const linkToken = (mail) => /reset-password\/([a-f0-9]+)/.exec(mail.textContent)[1];
  const login = (email, password) => api().post('/auth/login').send({ email, password });

  before(async () => {
    parish = await createParish('Staff Invite');
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

  async function createAccount(email, accessRole = 'staff') {
    const res = await api(parish.admin).post('/staff').send({ name: 'Nena Cabahug', email, role: 'Secretary', accessRole });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    return res;
  }

  it('gives a new account no known password and emails a 3-day link to set one', async () => {
    const email = `invite.${Date.now()}@holyapp.test`;
    const res = await createAccount(email, 'admin');
    assert.equal(res.body.inviteSent, true);

    assert.equal((await login(email, 'password123')).status, 401, 'the old shared password does not work');

    assert.equal(sent.length, 1);
    assert.equal(sent[0].to[0].email, email);
    assert.match(sent[0].subject, /Set up your HolyApp account for Staff Invite Parish/);
    assert.match(sent[0].textContent, /expires in 72 hours/);
    const { rows } = await pool.query(
      `SELECT expires_at > NOW() + INTERVAL '71 hours' AS long FROM password_reset r JOIN app_user u ON u.id = r.user_id WHERE u.email = $1`,
      [email]
    );
    assert.equal(rows[0].long, true);

    const set = await api().post('/auth/reset-password').send({ token: linkToken(sent[0]), password: 'their-own-password' });
    assert.equal(set.status, 200, JSON.stringify(set.body));
    assert.equal((await login(email, 'their-own-password')).status, 200);
  });

  it('still makes the account when the email fails, and says so', async () => {
    globalThis.fetch = async () => ({ ok: false, status: 400, json: async () => ({ message: 'nope' }) });
    const res = await createAccount(`invite.fail.${Date.now()}@holyapp.test`);
    assert.equal(res.body.inviteSent, false);
    assert.ok(res.body.staff.id);
  });

  it('lets an admin send a new link, which cancels the earlier one', async () => {
    const email = `relink.${Date.now()}@holyapp.test`;
    const created = await createAccount(email);
    const first = linkToken(sent[0]);

    const res = await api(parish.admin).post(`/staff/${created.body.staff.id}/sign-in-link`);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(sent.length, 2);
    assert.equal(sent[1].subject, 'Set a new HolyApp password');
    assert.match(sent[1].textContent, /expires in 24 hours/);

    const old = await api().post('/auth/reset-password').send({ token: first, password: 'another-password' });
    assert.equal(old.status, 400, 'the first link no longer works');
    const fresh = await api().post('/auth/reset-password').send({ token: linkToken(sent[1]), password: 'another-password' });
    assert.equal(fresh.status, 200);

    const audit = await pool.query(`SELECT 1 FROM audit_log WHERE action = 'app_user.sign_in_link_sent' AND entity_id = $1`, [
      created.body.staff.id,
    ]);
    assert.equal(audit.rowCount, 1);
  });

  it('sends links only for active office accounts in the parish, and only for admins', async () => {
    const created = await createAccount(`gated.${Date.now()}@holyapp.test`);
    const id = created.body.staff.id;
    assert.equal((await api(parish.staff).post(`/staff/${id}/sign-in-link`)).status, 403);
    assert.equal((await api(parish.admin).post(`/staff/${parish.parishioner.id}/sign-in-link`)).status, 404);

    const other = await createParish('Other Invite');
    assert.equal((await api(other.admin).post(`/staff/${id}/sign-in-link`)).status, 404);

    await api(parish.admin).patch(`/staff/${id}/status`).send({ status: 'Inactive' });
    assert.equal((await api(parish.admin).post(`/staff/${id}/sign-in-link`)).status, 400);
  });
});
