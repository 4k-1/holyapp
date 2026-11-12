// The landing page's Book a demo form: POST /contact emails HolyApp's inbox and stores nothing.

const { describe, it, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api } = require('./helpers');
const mailer = require('../src/utils/mailer');
const { resetLimits, contactInbox } = require('../src/controllers/contactController');

after(() => pool.end());

const realSendMail = mailer.sendMail;
after(() => {
  mailer.sendMail = realSendMail;
});

const good = {
  name: 'Test Person',
  parish: 'Test Parish, Test Town',
  contact: 'test.person@holyapp.test',
  bestTime: 'Saturdays',
  message: 'Can we see the <b>certificate</b> requests?',
};

describe('Book a demo', () => {
  let sent;

  beforeEach(() => {
    resetLimits();
    sent = [];
    mailer.sendMail = async (mail) => {
      sent.push(mail);
      return { messageId: 'test' };
    };
  });

  it('emails the request to the HolyApp inbox, with the sender as reply-to', async () => {
    const res = await api().post('/contact').send(good);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(sent.length, 1);
    const [mail] = sent;
    assert.equal(mail.to, contactInbox());
    assert.equal(mail.subject, 'Demo request: Test Parish, Test Town');
    assert.equal(mail.replyTo, '"Test Person" <test.person@holyapp.test>');
    assert.match(mail.text, /Best time to reach them: Saturdays/);
    assert.match(mail.text, /Can we see the <b>certificate<\/b> requests\?/);
    assert.match(mail.html, /&lt;b&gt;certificate&lt;\/b&gt;/);
  });

  it('takes a mobile number instead of an email, with no reply-to', async () => {
    const res = await api().post('/contact').send({ ...good, contact: '0917 123 4567', bestTime: '', message: '' });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(sent[0].replyTo, undefined);
    assert.match(sent[0].text, /Any time/);
  });

  it('refuses missing or invalid answers', async () => {
    for (const [change, error] of [
      [{ name: ' ' }, 'Enter your name.'],
      [{ parish: '' }, 'Enter your parish and town.'],
      [{ contact: 'abc' }, 'Enter a valid email or a mobile number.'],
      [{ bestTime: 'Midnight' }, 'Choose a time from the list.'],
      [{ message: 'x'.repeat(2001) }, 'Keep the message under 2000 characters.'],
    ]) {
      const res = await api().post('/contact').send({ ...good, ...change });
      assert.equal(res.status, 400);
      assert.equal(res.body.error, error);
    }
    assert.equal(sent.length, 0);
  });

  it('thanks bots that fill in the hidden field, and sends nothing', async () => {
    const res = await api().post('/contact').send({ ...good, website: 'http://spam.example' });
    assert.equal(res.status, 200);
    assert.equal(sent.length, 0);
  });

  it('allows five requests an hour from one connection', async () => {
    for (let i = 0; i < 5; i++) {
      assert.equal((await api().post('/contact').send(good)).status, 200);
    }
    const sixth = await api().post('/contact').send(good);
    assert.equal(sixth.status, 429);
    assert.equal(sent.length, 5);
  });

  it('says so when the email could not be sent', async () => {
    mailer.sendMail = async () => {
      const err = new Error('down');
      err.code = 'MAIL_SEND_FAILED';
      throw err;
    };
    const res = await api().post('/contact').send(good);
    assert.equal(res.status, 503);
  });
});
