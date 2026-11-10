// A marriage application linked to a parishioner account, so they can follow its status in the portal.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish } = require('./helpers');

after(() => pool.end());

describe('Linking a marriage application to a parishioner account', () => {
  let parish;
  let other;
  let application;

  const mine = (user) => api(user).get('/marriage-applications/mine');

  before(async () => {
    parish = await createParish('Account link');
    other = await createParish('Other parish');
    const res = await api(parish.staff).post('/marriage-applications').send({
      groomFirstName: 'Pedro',
      groomLastName: 'Cruz',
      brideFirstName: 'Ana',
      brideLastName: 'Reyes',
      remarks: 'Office only: call the groom first.',
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    application = res.body.application;
    assert.equal(application.linkedAccount, null);
  });

  it('says so when the email belongs to no account, instead of filing it unlinked', async () => {
    const res = await api(parish.staff).post('/marriage-applications').send({
      groomFirstName: 'Juan',
      groomLastName: 'Luna',
      brideFirstName: 'Rosa',
      brideLastName: 'Diaz',
      parishionerEmail: 'nobody@holyapp.test',
    });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /No parishioner account/);
  });

  it('links an account later by its email, and the parishioner then sees it', async () => {
    assert.equal((await mine(parish.parishioner)).body.applications.length, 0);

    const missing = await api(parish.staff)
      .put(`/marriage-applications/${application.id}/parishioner`)
      .send({ email: 'nobody@holyapp.test' });
    assert.equal(missing.status, 400);
    assert.match(missing.body.error, /can't track the application online/);

    // An account in another parish doesn't count.
    const elsewhere = await api(parish.staff)
      .put(`/marriage-applications/${application.id}/parishioner`)
      .send({ email: other.parishioner.email });
    assert.equal(elsewhere.status, 400);

    const linked = await api(parish.staff)
      .put(`/marriage-applications/${application.id}/parishioner`)
      .send({ email: parish.parishioner.email.toUpperCase() });
    assert.equal(linked.status, 200, JSON.stringify(linked.body));
    assert.equal(linked.body.application.linkedAccount.email, parish.parishioner.email);
    assert.equal(linked.body.application.linkedAccount.name, 'Paz Parishioner');

    const list = await mine(parish.parishioner);
    assert.equal(list.body.applications.length, 1);
    const seen = list.body.applications[0];
    assert.equal(seen.id, application.id);
    // The office's own notes stay with the office.
    assert.equal(seen.remarks, '');
    assert.ok(seen.requirements.every((item) => item.verifiedByName === null));

    const notes = await pool.query(
      `SELECT title FROM app_notification WHERE recipient_id = $1 AND title = 'Marriage application linked'`,
      [parish.parishioner.id]
    );
    assert.equal(notes.rowCount, 1);
  });

  it('only lets the linked parishioner open it, and only the office link it', async () => {
    const own = await api(parish.parishioner).get(`/marriage-applications/${application.id}`);
    assert.equal(own.status, 200);
    assert.equal(own.body.application.remarks, '');

    assert.equal((await api(other.parishioner).get(`/marriage-applications/${application.id}`)).status, 404);
    assert.equal(
      (
        await api(parish.parishioner)
          .put(`/marriage-applications/${application.id}/parishioner`)
          .send({ email: parish.parishioner.email })
      ).status,
      403
    );
  });

  it('unlinks it, and the parishioner no longer sees it', async () => {
    const res = await api(parish.admin).delete(`/marriage-applications/${application.id}/parishioner`);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.application.linkedAccount, null);
    assert.equal((await mine(parish.parishioner)).body.applications.length, 0);
    assert.equal((await api(parish.parishioner).get(`/marriage-applications/${application.id}`)).status, 404);
  });
});
