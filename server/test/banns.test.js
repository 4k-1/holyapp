// 5b: banns as a parish step, including couples marrying in another parish.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish } = require('./helpers');
const bannsRules = require('../src/services/banns');

after(() => pool.end());

describe('Banns', () => {
  let parish;
  let application;

  const save = (id, banns) => api(parish.staff).patch(`/marriage-applications/${id}/banns`).send({ banns });
  const bannsItem = (app) => app.requirements.find((r) => r.key === 'banns');

  before(async () => {
    parish = await createParish('Banns');
    const res = await api(parish.staff).post('/marriage-applications').send({
      groomFirstName: 'Pedro',
      groomLastName: 'Cruz',
      brideFirstName: 'Ana',
      brideLastName: 'Reyes',
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    application = res.body.application;
  });

  it('suggests the next three Sundays before the wedding', () => {
    assert.deepEqual(bannsRules.suggestSundays(null, '2026-11-10'), ['2026-11-15', '2026-11-22', '2026-11-29']);
    assert.deepEqual(bannsRules.suggestSundays('2026-11-25', '2026-11-10'), ['2026-11-15', '2026-11-22']);
    assert.equal(application.bannsSuggestedSundays.length, 3);
    assert.equal(application.bannsAnnouncedHere, true);
  });

  it('checks the Sundays and ticks "Banns published" once all three are announced', async () => {
    assert.equal((await save(application.id, { sundays: ['2026-11-11'] })).status, 400); // a Wednesday
    assert.equal(
      (await save(application.id, { sundays: ['2026-11-01'], announced: ['2026-11-08'] })).status,
      400 // not a planned Sunday
    );
    assert.equal((await save(application.id, { sundays: ['2099-01-04'], announced: ['2099-01-04'] })).status, 400);

    const sundays = ['2026-10-18', '2026-10-25', '2026-11-01'];
    const partial = await save(application.id, { sundays, announced: sundays.slice(0, 2) });
    assert.equal(partial.status, 200, JSON.stringify(partial.body));
    assert.equal(partial.body.application.bannsComplete, false);
    assert.equal(bannsItem(partial.body.application).submitted, false);

    const done = await save(application.id, { sundays, announced: sundays });
    assert.equal(done.body.application.bannsComplete, true);
    assert.equal(bannsItem(done.body.application).submitted, true);

    // Undoing an announcement unticks it again.
    const undone = await save(application.id, { sundays, announced: sundays.slice(1) });
    assert.equal(bannsItem(undone.body.application).submitted, false);
  });

  it('waits for the certificate from the other parish, unless the bishop waived the banns', async () => {
    const elsewhere = { brideParish: 'San Roque Parish, Mandaue', sundays: [], announced: [] };
    const waiting = await save(application.id, {
      ...elsewhere,
      sundays: ['2026-10-18', '2026-10-25', '2026-11-01'],
      announced: ['2026-10-18', '2026-10-25', '2026-11-01'],
    });
    assert.equal(waiting.body.application.bannsComplete, false);
    const received = await save(application.id, {
      ...elsewhere,
      sundays: ['2026-10-18', '2026-10-25', '2026-11-01'],
      announced: ['2026-10-18', '2026-10-25', '2026-11-01'],
      received: { bride: true },
    });
    assert.equal(received.body.application.bannsComplete, true);
    const waived = await save(application.id, { dispensed: true });
    assert.equal(waived.body.application.bannsComplete, true);
  });

  it('keeps couples marrying elsewhere out of the applications list, and prints their certificate when done', async () => {
    assert.equal(
      (
        await api(parish.staff).post('/marriage-applications/banns-elsewhere').send({
          groomFirstName: 'Jose',
          groomLastName: 'Lim',
          brideFirstName: 'Rosa',
          brideLastName: 'Tan',
          weddingParish: 'Sto. Niño, Cebu',
          groomParish: 'Somewhere',
          brideParish: 'Elsewhere',
        })
      ).status,
      400 // nobody lives here
    );
    const created = await api(parish.staff).post('/marriage-applications/banns-elsewhere').send({
      groomFirstName: 'Jose',
      groomLastName: 'Lim',
      brideFirstName: 'Rosa',
      brideLastName: 'Tan',
      weddingParish: 'Sto. Niño, Cebu',
      brideParish: 'Sto. Niño, Cebu',
      parents: { groomFather: 'Ramon Lim', brideMother: ' Elena Tan ' },
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const entry = created.body.application;
    assert.equal(entry.weddingElsewhere, true);
    assert.equal(entry.banns.sundays.length, 3);
    assert.equal(entry.requirements.length, 0);
    // Parents are optional and kept for the Certificate of Banns.
    assert.deepEqual(entry.banns.parents, {
      groomFather: 'Ramon Lim',
      groomMother: '',
      brideFather: '',
      brideMother: 'Elena Tan',
    });

    const list = await api(parish.staff).get('/marriage-applications');
    assert.ok(!list.body.applications.some((a) => a.id === entry.id));
    const others = await api(parish.staff).get('/marriage-applications/banns-elsewhere');
    assert.ok(others.body.applications.some((a) => a.id === entry.id));

    assert.equal((await api(parish.staff).get(`/marriage-applications/${entry.id}/banns-certificate`)).status, 400);
    const sundays = ['2026-10-18', '2026-10-25', '2026-11-01'];
    assert.equal((await save(entry.id, { brideParish: 'Sto. Niño, Cebu', sundays, announced: sundays })).status, 200);
    const certificate = await api(parish.staff).get(`/marriage-applications/${entry.id}/banns-certificate`);
    assert.equal(certificate.status, 200, JSON.stringify(certificate.body));
    assert.equal(certificate.body.application.weddingParish, 'Sto. Niño, Cebu');
    assert.ok(certificate.body.parish.name);

    // The Sunday list reads both couples planned for that Sunday with the time of asking.
    const sunday = await api(parish.staff).get('/marriage-applications/banns-list').query({ date: '2026-10-25' });
    assert.equal(sunday.status, 200, JSON.stringify(sunday.body));
    const jose = sunday.body.couples.find((c) => c.id === entry.id);
    assert.equal(jose.asking, 2);
    assert.equal(jose.announced, true);
    // The first couple's banns were waived, so they aren't read.
    assert.ok(!sunday.body.couples.some((c) => c.id === application.id));
    assert.equal(
      (await api(parish.staff).get('/marriage-applications/banns-list').query({ date: '2026-10-26' })).status,
      400
    );

    assert.equal((await api(parish.staff).delete(`/marriage-applications/banns-elsewhere/${entry.id}`)).status, 200);
    assert.equal((await api(parish.staff).delete(`/marriage-applications/banns-elsewhere/${application.id}`)).status, 404);
  });

  it('lists weddings here that still need their Sundays planned', async () => {
    const res = await api(parish.staff).post('/marriage-applications').send({
      groomFirstName: 'Luis',
      groomLastName: 'Garcia',
      brideFirstName: 'Carmen',
      brideLastName: 'Diaz',
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const fresh = res.body.application;
    const unplanned = async () =>
      (await api(parish.staff).get('/marriage-applications/banns-list').query({ date: '2026-11-15' })).body.unplanned;
    const before = await unplanned();
    assert.ok(before.some((a) => a.id === fresh.id));
    // Waived banns need no Sundays.
    assert.ok(!before.some((a) => a.id === application.id));

    const poster = (id) => api(parish.staff).get(`/marriage-applications/${id}/banns-poster`);
    assert.equal((await poster(fresh.id)).status, 400); // no Sundays yet

    assert.equal(
      (
        await save(fresh.id, {
          sundays: fresh.bannsSuggestedSundays,
          groomAddress: 'Brgy. Mabolo, Cebu City',
          onlineConsent: true,
        })
      ).status,
      200
    );
    assert.ok(!(await unplanned()).some((a) => a.id === fresh.id));

    // The poster: the couple and the parish's contact details for anyone who knows of an impediment.
    const shown = await poster(fresh.id);
    assert.equal(shown.status, 200, JSON.stringify(shown.body));
    assert.equal(shown.body.application.banns.groomAddress, 'Brgy. Mabolo, Cebu City');
    assert.equal(shown.body.application.banns.brideAddress, '');
    assert.equal(shown.body.application.banns.onlineConsent, true);
    assert.ok('contact' in shown.body.parish && 'email' in shown.body.parish);
    // Waived banns have no poster.
    assert.equal((await poster(application.id)).status, 400);
  });
});
