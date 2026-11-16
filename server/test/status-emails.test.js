// Parishioners get an email whenever the parish office changes the status of one of their requests:
// certificate requests, marriage applications (with the banns steps) and Mass intentions.

const { describe, it, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish, createBaptism } = require('./helpers');
const mailer = require('../src/utils/mailer');
const statusEmail = require('../src/utils/statusEmail');

const realSendMail = mailer.sendMail;
after(async () => {
  mailer.sendMail = realSendMail;
  await pool.end();
});

let sent;
beforeEach(() => {
  sent = [];
  mailer.sendMail = async (mail) => {
    sent.push(mail);
    return { messageId: 'test' };
  };
});

/** The emails sent once every background send has finished. */
async function mails() {
  await statusEmail.settled();
  return sent;
}

function requestBody(deliveryMethod) {
  return {
    sacramentType: 'baptism',
    deliveryMethod,
    purpose: 'School enrollment',
    relationship: 'Parent',
    sacramentDate: '2024-03-10',
    fields: {
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      birthdate: '2024-01-15',
      birthplace: 'Cebu City',
      mothersName: 'Maria Reyes',
    },
  };
}

describe('Status emails: certificate requests', () => {
  let parish;
  let record;

  before(async () => {
    parish = await createParish('Mail');
    record = await createBaptism(parish.staff);
  });

  async function newRequest(deliveryMethod = 'digital') {
    const res = await api(parish.parishioner).post('/requests').send(requestBody(deliveryMethod));
    assert.equal(res.status, 201, JSON.stringify(res.body));
    await mails();
    sent = [];
    return res.body.id;
  }

  it('emails the parishioner at each step of a digital request, with a link back to it', async () => {
    const id = await newRequest('digital');

    const linked = await api(parish.staff).post(`/requests/${id}/link`).send({ recordId: record.id });
    assert.equal(linked.status, 200, JSON.stringify(linked.body));
    let [mail] = await mails();
    assert.equal(sent.length, 1);
    assert.equal(mail.to, parish.parishioner.email);
    assert.equal(mail.subject, 'We found the record for your baptism certificate');
    assert.match(mail.text, new RegExp(`Parish: ${parish.name}`));
    assert.match(mail.text, /New status: Record found, waiting for payment/);
    assert.match(mail.text, new RegExp(`/${parish.slug}/portal/requests/${id}`));
    assert.match(mail.html, /#16798C/);

    sent = [];
    assert.equal((await api(parish.staff).post(`/requests/${id}/payment`)).status, 200);
    [mail] = await mails();
    assert.match(mail.text, /New status: Paid, being prepared/);

    sent = [];
    const issued = await api(parish.staff).post(`/requests/${id}/issue`);
    assert.equal(issued.status, 200, JSON.stringify(issued.body));
    [mail] = await mails();
    assert.equal(mail.subject, 'Your baptism certificate is ready');
    assert.match(mail.text, /New status: Released/);
    assert.match(mail.text, /certificate wallet/);
  });

  it('emails when a pickup certificate is ready and when it is released', async () => {
    const id = await newRequest('pickup');
    await api(parish.staff).post(`/requests/${id}/link`).send({ recordId: record.id });
    await api(parish.staff).post(`/requests/${id}/payment`);
    await mails();
    sent = [];

    const ready = await api(parish.staff).post(`/requests/${id}/ready`);
    assert.equal(ready.status, 200, JSON.stringify(ready.body));
    let [mail] = await mails();
    assert.equal(mail.subject, 'Your baptism certificate is ready for pickup');
    assert.match(mail.text, /Bring a valid ID/);

    sent = [];
    const released = await api(parish.staff).post(`/requests/${id}/release`).send({ releasedTo: 'Maria Reyes' });
    assert.equal(released.status, 200, JSON.stringify(released.body));
    [mail] = await mails();
    assert.match(mail.text, /New status: Released/);
    assert.match(mail.text, /to Maria Reyes/);
  });

  it('gives the rejection reason, escaped in the HTML', async () => {
    const id = await newRequest();
    const res = await api(parish.admin)
      .post(`/requests/${id}/reject`)
      .send({ reason: 'No entry under <that> name in Book 4.' });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const [mail] = await mails();
    assert.equal(mail.subject, 'Your baptism certificate request was not approved');
    assert.match(mail.text, /New status: Rejected/);
    assert.match(mail.text, /Reason from the parish office: No entry under <that> name in Book 4\./);
    assert.match(mail.html, /No entry under &lt;that&gt; name/);
  });

  it('still changes the status when the email cannot be sent', async () => {
    const id = await newRequest();
    mailer.sendMail = async () => {
      const err = new Error('SMTP is down');
      err.code = 'MAIL_SEND_FAILED';
      throw err;
    };
    const res = await api(parish.staff).post(`/requests/${id}/link`).send({ recordId: record.id });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    await mails();
    const row = await pool.query('SELECT status FROM certificate_request WHERE id = $1', [id]);
    assert.equal(row.rows[0].status, 'processing');
  });

  it('sends nothing for walk-in certificates issued at the office', async () => {
    const res = await api(parish.staff)
      .post(`/records/baptism/${record.id}/certificates`)
      .send({ purpose: 'School enrollment' });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal((await mails()).length, 0);
  });

  it('sends nothing when STATUS_EMAILS is false', async () => {
    const id = await newRequest();
    process.env.STATUS_EMAILS = 'false';
    try {
      await api(parish.staff).post(`/requests/${id}/link`).send({ recordId: record.id });
      assert.equal((await mails()).length, 0);
    } finally {
      delete process.env.STATUS_EMAILS;
    }
  });
});

describe('Status emails: marriage applications', () => {
  let parish;

  before(async () => {
    parish = await createParish('Mail Marriage');
  });

  async function newApplication() {
    const res = await api(parish.staff).post('/marriage-applications').send({
      groomFirstName: 'Pedro',
      groomLastName: 'Cruz',
      brideFirstName: 'Ana',
      brideLastName: 'Reyes',
      parishionerEmail: parish.parishioner.email,
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    return res.body.application;
  }

  it('emails when the office files an application for the parishioner', async () => {
    await newApplication();
    const [mail] = await mails();
    assert.equal(mail.to, parish.parishioner.email);
    assert.equal(mail.subject, 'The parish office opened a marriage application for you');
    assert.match(mail.text, new RegExp(`/${parish.slug}/portal/marriage`));
  });

  it('emails each banns step: dates set, each announcement, then complete', async () => {
    const app = await newApplication();
    const save = (banns) => api(parish.staff).patch(`/marriage-applications/${app.id}/banns`).send({ banns });
    const sundays = ['2026-10-18', '2026-10-25', '2026-11-01'];
    await mails();

    sent = [];
    assert.equal((await save({ sundays })).status, 200);
    let [mail] = await mails();
    assert.equal(mail.subject, 'Your banns dates are set');
    assert.match(mail.text, /Sunday, October 18, 2026/);

    sent = [];
    assert.equal((await save({ sundays, announced: sundays.slice(0, 1) })).status, 200);
    [mail] = await mails();
    assert.equal(mail.subject, 'Your banns were announced at Mass');
    assert.match(mail.text, /Banns announced \(1 of 3\)/);

    sent = [];
    assert.equal((await save({ sundays, announced: sundays })).status, 200);
    [mail] = await mails();
    assert.equal(mail.subject, 'Your banns are complete');

    sent = [];
    assert.equal((await save({ sundays, announced: sundays })).status, 200);
    assert.equal((await mails()).length, 0, 'saving the same banns again sends nothing');
  });

  it('emails a granted dispensation and a rejection with its reason', async () => {
    const app = await newApplication();
    await mails();

    sent = [];
    const granted = await api(parish.staff)
      .patch(`/marriage-applications/${app.id}/dispensation`)
      .send({ dispensationNeeded: true, dispensationStatus: 'granted' });
    assert.equal(granted.status, 200, JSON.stringify(granted.body));
    let [mail] = await mails();
    assert.equal(mail.subject, 'Your dispensation was granted');

    sent = [];
    const rejected = await api(parish.admin)
      .post(`/marriage-applications/${app.id}/reject`)
      .send({ remarks: 'The couple withdrew the application.' });
    assert.equal(rejected.status, 200, JSON.stringify(rejected.body));
    [mail] = await mails();
    assert.equal(mail.subject, 'Your marriage application was not approved');
    assert.match(mail.text, /Reason from the parish office: The couple withdrew the application\./);
  });

  it('sends nothing for a walk-in application with no account', async () => {
    const res = await api(parish.staff).post('/marriage-applications').send({
      groomFirstName: 'Jose',
      groomLastName: 'Luna',
      brideFirstName: 'Rosa',
      brideLastName: 'Diaz',
    });
    assert.equal(res.status, 201);
    await api(parish.admin).post(`/marriage-applications/${res.body.application.id}/reject`).send({ remarks: 'Test' });
    assert.equal((await mails()).length, 0);
  });
});

describe('Status emails: Mass intentions', () => {
  let parish;
  let id;

  before(async () => {
    parish = await createParish('Mail Intention');
    const result = await pool.query(
      `INSERT INTO mass_intention
         (parish_id, requester_name, intention_type, intention_for, schedule_date, schedule_time, status, requester_id)
       VALUES ($1, 'Paz Parishioner', 'thanksgiving', 'the Reyes family', '2026-12-06', '08:00', 'pending', $2)
       RETURNING id`,
      [parish.id, parish.parishioner.id]
    );
    id = result.rows[0].id;
  });

  it('emails when the intention is confirmed and when it is said', async () => {
    const confirmed = await api(parish.staff).patch(`/intentions/${id}/confirm`);
    assert.equal(confirmed.status, 200, JSON.stringify(confirmed.body));
    let [mail] = await mails();
    assert.equal(mail.to, parish.parishioner.email);
    assert.equal(mail.subject, 'Your Mass intention is confirmed');
    assert.match(mail.text, /Sunday, December 6, 2026 at 8:00 AM/);
    assert.match(mail.text, new RegExp(`/${parish.slug}/portal/intentions`));

    sent = [];
    assert.equal((await api(parish.staff).patch(`/intentions/${id}/said`)).status, 200);
    [mail] = await mails();
    assert.equal(mail.subject, 'Your Mass intention was offered');
    assert.match(mail.text, /New status: Said/);
  });
});
