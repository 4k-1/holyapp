// Item 5a: marriage requirements a parish sets itself, conditions from the couple's answers, and
// documents checked against the wedding date.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish } = require('./helpers');
const { addMonths, manilaToday } = require('../src/constants/purposes');

after(() => pool.end());

function addDays(iso, days) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

describe('Marriage requirements', () => {
  let parish;

  before(async () => {
    parish = await createParish('Marriage');
  });

  const list = async (user = parish.admin) => (await api(user).get('/marriage-requirements')).body.requirements;
  const byKey = (items, key) => items.find((i) => i.key === key);
  const keysOf = (application) => application.requirements.map((r) => r.key || r.name);

  async function createApplication(circumstances) {
    const res = await api(parish.staff).post('/marriage-applications').send({
      groomFirstName: 'Pedro',
      groomLastName: 'Cruz',
      brideFirstName: 'Ana',
      brideLastName: 'Reyes',
      circumstances,
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    return res.body.application;
  }

  it('gives each party a CENOMAR and keeps a renamed or removed item that way', async () => {
    const items = await list();
    assert.ok(byKey(items, 'cenomar_groom'));
    assert.ok(byKey(items, 'cenomar_bride'));
    assert.equal(byKey(items, 'license').validForDays, 120);

    const interview = byKey(items, 'interview');
    const banns = byKey(items, 'banns');
    assert.equal(
      (await api(parish.admin).patch(`/marriage-requirements/${interview.id}`).send({ name: 'Pre-nuptial interview' })).status,
      200
    );
    assert.equal((await api(parish.admin).patch(`/marriage-requirements/${banns.id}`).send({ active: false })).status, 200);

    const again = await list(parish.staff);
    assert.equal(again.length, items.length, 'nothing came back');
    assert.equal(byKey(again, 'interview').name, 'Pre-nuptial interview');
    assert.equal(byKey(again, 'banns').active, false);
  });

  it('adds only the papers the couple needs from their answers', async () => {
    const plain = await createApplication({});
    assert.ok(keysOf(plain).includes('license'));
    assert.ok(!keysOf(plain).includes('death_spouse'));
    assert.ok(!keysOf(plain).includes('banns'), 'turned-off items are not asked for');

    const special = await createApplication({ widowed: true, cohabiting_5yrs: true, unknown: true });
    assert.deepEqual(special.circumstances.widowed, true);
    assert.equal(special.circumstances.unknown, undefined);
    assert.ok(keysOf(special).includes('death_spouse'));
    assert.ok(keysOf(special).includes('art34_affidavit'));
    assert.ok(!keysOf(special).includes('license'), 'the Art. 34 affidavit replaces the license');

    const changed = await api(parish.staff)
      .patch(`/marriage-applications/${plain.id}/circumstances`)
      .send({ circumstances: { foreign_party: true } });
    assert.equal(changed.status, 200);
    assert.ok(keysOf(changed.body.application).includes('legal_capacity'));
  });

  it('needs the date on a document that expires, and checks it', async () => {
    const application = await createApplication({});
    const baptism = application.requirements.find((r) => r.key === 'baptism_groom');
    const precana = application.requirements.find((r) => r.key === 'precana');
    const path = (r) => `/marriage-applications/${application.id}/requirements/${r.id}`;

    const noDate = await api(parish.staff).patch(path(baptism)).send({ submitted: true });
    assert.equal(noDate.status, 400);
    assert.match(noDate.body.error, /Enter the date/);
    const future = await api(parish.staff).patch(path(baptism)).send({ submitted: true, documentDate: '2999-01-01' });
    assert.equal(future.status, 400);
    assert.equal((await api(parish.staff).patch(path(precana)).send({ submitted: true })).status, 200, 'undated items need no date');

    const old = await api(parish.staff).patch(path(baptism)).send({ submitted: true, documentDate: '2020-01-15' });
    assert.equal(old.status, 200);
    const oldRow = old.body.application.requirements.find((r) => r.id === baptism.id);
    assert.equal(oldRow.documentDate, '2020-01-15');
    assert.equal(oldRow.expiresOn, '2020-07-13');
    assert.equal(oldRow.expired, true);

    // Good today, but not on a wedding 7 months away.
    const today = manilaToday();
    await pool.query('UPDATE marriage_application SET preferred_wedding_date = $1 WHERE id = $2', [
      addMonths(today, 7),
      application.id,
    ]);
    const fresh = await api(parish.staff).patch(path(baptism)).send({ submitted: true, documentDate: today });
    const freshRow = fresh.body.application.requirements.find((r) => r.id === baptism.id);
    assert.equal(freshRow.expiresOn, addDays(today, 180));
    assert.equal(freshRow.expired, false);
    assert.equal(freshRow.expiresBeforeWedding, true);
  });

  it("adds the parish's own items to open applications, and only admins change the list", async () => {
    const application = await createApplication({});
    assert.equal(
      (await api(parish.staff).post('/marriage-requirements').send({ name: 'Seminar certificate' })).status,
      403
    );
    const added = await api(parish.admin)
      .post('/marriage-requirements')
      .send({ name: 'Seminar certificate', validForDays: 365, note: 'From the diocesan family office.' });
    assert.equal(added.status, 201, JSON.stringify(added.body));
    assert.equal(added.body.requirement.builtIn, false);

    const seen = await api(parish.staff).get(`/marriage-applications/${application.id}`);
    const row = seen.body.application.requirements.find((r) => r.name === 'Seminar certificate');
    assert.ok(row);
    assert.equal(row.note, 'From the diocesan family office.');

    await api(parish.admin).patch(`/marriage-requirements/${added.body.requirement.id}`).send({ active: false });
    const hidden = await api(parish.staff).get(`/marriage-applications/${application.id}`);
    assert.ok(!hidden.body.application.requirements.some((r) => r.name === 'Seminar certificate'));

    const bad = await api(parish.admin).post('/marriage-requirements').send({ name: 'X', validForDays: -3 });
    assert.equal(bad.status, 400);
  });

  it('keeps parishes apart', async () => {
    const other = await createParish('Other');
    const mine = await list();
    const res = await api(other.admin).patch(`/marriage-requirements/${mine[0].id}`).send({ name: 'Hijack' });
    assert.equal(res.status, 404);
  });
});
