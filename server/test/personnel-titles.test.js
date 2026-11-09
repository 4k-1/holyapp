// Item 4: several titles per staff member, a name in parts, clergy status, one Parish Priest.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish } = require('./helpers');

after(() => pool.end());

describe('Staff titles', () => {
  let parish;
  let pastor;

  before(async () => {
    parish = await createParish('Titles');
  });

  async function add(body) {
    return api(parish.admin).post('/personnel').send(body);
  }

  it('keeps the name in parts and shows it in full, with several titles', async () => {
    const res = await add({
      name: 'Pedro Cruz',
      honorific: 'Rev. Fr.',
      postNominals: 'SVD',
      titles: [{ title: 'Parish Priest' }, { title: 'Chaplain', scope: 'St. Jude School' }],
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    pastor = res.body.person;
    assert.equal(pastor.name, 'Rev. Fr. Pedro Cruz, SVD');
    assert.equal(pastor.plainName, 'Pedro Cruz');
    assert.equal(pastor.role, 'Parish Priest');
    assert.equal(pastor.clergy, true);
    assert.equal(pastor.clergyRank, 'priest');
    assert.deepEqual(pastor.titles, [
      { title: 'Parish Priest', scope: null },
      { title: 'Chaplain', scope: 'St. Jude School' },
    ]);
  });

  it('splits an honorific typed into the name box', async () => {
    const res = await add({ name: 'Msgr. Luis Tan', titles: [{ title: 'Guest Priest' }] });
    assert.equal(res.status, 201);
    assert.equal(res.body.person.honorific, 'Msgr.');
    assert.equal(res.body.person.plainName, 'Luis Tan');
    assert.equal(res.body.person.clergyRank, 'priest');
  });

  it('allows only one active Parish Priest, and only a priest', async () => {
    const second = await add({ name: 'Fr. Mark Lim', titles: [{ title: 'Parish Priest' }] });
    assert.equal(second.status, 409);
    assert.match(second.body.error, /Rev\. Fr\. Pedro Cruz, SVD is the Parish Priest/);

    const lay = await add({ name: 'Mark Lim', titles: [{ title: 'Parish Priest' }] });
    assert.equal(lay.status, 400);
    assert.match(lay.body.error, /Add Fr\. or Msgr\./);

    const noFr = await api(parish.admin)
      .post('/staff')
      .send({ name: 'Noel Uy', email: `uy.${Date.now()}@holyapp.test`, role: 'Parish Priest', accessRole: 'staff' });
    assert.equal(noFr.status, 400);

    // Through Staff accounts too.
    const email = `noel.${Date.now()}@holyapp.test`;
    const account = await api(parish.admin)
      .post('/staff')
      .send({ name: 'Fr. Noel Uy', email, role: 'Parish Priest', accessRole: 'staff' });
    assert.equal(account.status, 409);
    const saved = await pool.query('SELECT 1 FROM app_user WHERE email = $1', [email]);
    assert.equal(saved.rowCount, 0, 'no sign-in is left behind');
  });

  it('hands the title over once it is removed from the current holder', async () => {
    const moved = await api(parish.admin)
      .patch(`/personnel/${pastor.id}`)
      .send({ titles: [{ title: 'Chaplain', scope: 'St. Jude School' }] });
    assert.equal(moved.status, 200, JSON.stringify(moved.body));
    assert.equal(moved.body.person.clergy, true, 'still a priest without the title');

    const next = await add({ name: 'Fr. Mark Lim', titles: [{ title: 'Parish Priest' }] });
    assert.equal(next.status, 201);
  });

  it('keeps a chaplain with the priests in the schedule picker', async () => {
    const res = await api(parish.staff).get('/schedule/staff');
    assert.equal(res.status, 200);
    const pedro = res.body.staff.find((s) => s.id === pastor.id);
    assert.equal(pedro.clergy, true);
    assert.equal(pedro.name, 'Rev. Fr. Pedro Cruz, SVD');
  });

  it('works out clergy status from the honorific', async () => {
    const cases = [
      ['Dcn.', 'deacon', true],
      ['Sr.', 'religious', false],
      ['Mr.', 'lay', false],
      ['', 'lay', false],
    ];
    for (const [honorific, rank, clergy] of cases) {
      const res = await add({ name: `Test ${rank} ${honorific}`, honorific, titles: [{ title: 'Catechist' }] });
      assert.equal(res.status, 201, JSON.stringify(res.body));
      assert.equal(res.body.person.clergyRank, rank, honorific);
      assert.equal(res.body.person.clergy, clergy, honorific);
    }
    const changed = await api(parish.admin).patch(`/personnel/${pastor.id}`).send({ honorific: 'Mr.' });
    assert.equal(changed.body.person.clergy, false, 'dropping Fr. makes them lay');
    await api(parish.admin).patch(`/personnel/${pastor.id}`).send({ honorific: 'Rev. Fr.' });
  });

  it('refuses unknown or repeated titles, and an empty list', async () => {
    assert.equal((await add({ name: 'X Y', titles: [{ title: 'Pope' }] })).status, 400);
    assert.equal((await add({ name: 'X Y', titles: [{ title: 'Sacristan' }, { title: 'Sacristan' }] })).status, 400);
    assert.equal((await add({ name: 'X Y', titles: [] })).status, 400);
  });

  it('is for admins only', async () => {
    const res = await api(parish.staff).post('/personnel').send({ name: 'X Y', titles: [{ title: 'Sacristan' }] });
    assert.equal(res.status, 403);
  });
});
