// The mailer sends through Brevo's HTTPS API when BREVO_API_KEY is set (hosts that block SMTP).
// fetch is replaced here, so nothing leaves this machine.

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const mailer = require('../src/utils/mailer');

const saved = {};
const KEYS = ['BREVO_API_KEY', 'SMTP_FROM', 'SMTP_USER', 'SMTP_PASS', 'AUTH_DEBUG'];
const realFetch = globalThis.fetch;

describe('Mailer through Brevo', () => {
  let calls;

  beforeEach(() => {
    for (const k of KEYS) saved[k] = process.env[k];
    process.env.BREVO_API_KEY = 'test-brevo-key';
    process.env.SMTP_FROM = 'HolyApp <holyapp.sender@holyapp.test>';
    process.env.SMTP_USER = '';
    process.env.SMTP_PASS = '';
    process.env.AUTH_DEBUG = '';
    calls = [];
    globalThis.fetch = async (url, init) => {
      calls.push({ url, init, body: JSON.parse(init.body) });
      return { ok: true, status: 201, statusText: 'Created', json: async () => ({ messageId: '<brevo-1@test>' }) };
    };
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it('counts as configured with only the Brevo key', () => {
    assert.equal(mailer.brevoConfigured(), true);
    assert.equal(mailer.smtpConfigured(), true);
  });

  it('posts the email to Brevo with the key, sender, recipient, text and html', async () => {
    const info = await mailer.sendMail({
      to: 'parishioner@holyapp.test',
      subject: 'Reset your HolyApp password',
      text: 'Plain text',
      html: '<p>Html</p>',
      replyTo: 'office@holyapp.test',
    });
    assert.equal(info.messageId, '<brevo-1@test>');
    assert.equal(calls.length, 1);
    const [call] = calls;
    assert.equal(call.url, 'https://api.brevo.com/v3/smtp/email');
    assert.equal(call.init.method, 'POST');
    assert.equal(call.init.headers['api-key'], 'test-brevo-key');
    assert.deepEqual(call.body.sender, { name: 'HolyApp', email: 'holyapp.sender@holyapp.test' });
    assert.deepEqual(call.body.to, [{ email: 'parishioner@holyapp.test' }]);
    assert.equal(call.body.subject, 'Reset your HolyApp password');
    assert.equal(call.body.textContent, 'Plain text');
    assert.equal(call.body.htmlContent, '<p>Html</p>');
    assert.deepEqual(call.body.replyTo, { email: 'office@holyapp.test' });
  });

  it('turns a refusal from Brevo into MAIL_SEND_FAILED', async () => {
    globalThis.fetch = async () => ({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({ code: 'invalid_parameter', message: 'sender is not valid' }),
    });
    await assert.rejects(
      mailer.sendMail({ to: 'parishioner@holyapp.test', subject: 'Hi', text: 'Hi' }),
      (err) => err.code === 'MAIL_SEND_FAILED' && /Brevo answered 400: sender is not valid/.test(err.cause.message)
    );
  });

  it('reads the sender from "Name <email>" or a bare address', () => {
    assert.deepEqual(mailer.parseAddress('Santuario Office <office@holyapp.test>'), { name: 'Santuario Office', email: 'office@holyapp.test' });
    assert.deepEqual(mailer.parseAddress('office@holyapp.test'), { name: 'HolyApp', email: 'office@holyapp.test' });
  });

  it('asks for the same Wi-Fi only when the reset link is a local address', () => {
    assert.match(mailer.passwordResetEmail('http://192.168.1.5:5173/reset-password/x').text, /same Wi-Fi/);
    assert.doesNotMatch(mailer.passwordResetEmail('https://holyapp-production.up.railway.app/reset-password/x').text, /Wi-Fi/);
  });

  it('is not configured with neither Brevo nor SMTP', async () => {
    process.env.BREVO_API_KEY = '';
    assert.equal(mailer.smtpConfigured(), false);
    await assert.rejects(mailer.sendMail({ to: 'a@holyapp.test', subject: 'Hi', text: 'Hi' }), { code: 'MAIL_NOT_CONFIGURED' });
  });
});
