// E2: handover when someone leaves.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish, PASSWORD } = require('./helpers');

after(() => pool.end());

describe('Handover when someone leaves', () => {
  let parish;
  let pedro;
  let mark;
  let ana;
  const events = [];
  let pastEvent;
  let refreshToken;

  async function addPerson(body) {
    const res = await api(parish.admin).post('/personnel').send(body);
    assert.equal(res.status, 201, JSON.stringify(res.body));
    return res.body.person;
  }

  async function addEvent(title, daysFromNow, assignedTo) {
    const result = await pool.query(
      `INSERT INTO event (parish_id, event_type, title, start_datetime, created_by, assigned_to, assignee_name)
       VALUES ($1, 'mass', $2, NOW() + ($3 || ' days')::interval, $4, $5, 'Old typed name')
       RETURNING id`,
      [parish.id, title, String(daysFromNow), parish.admin.id, assignedTo]
    );
    return result.rows[0].id;
  }

  async function assignee(eventId) {
    const result = await pool.query('SELECT assigned_to, assignee_name FROM event WHERE id = $1', [eventId]);
    return result.rows[0];
  }

  before(async () => {
    parish = await createParish('Handover');
    pedro = await addPerson({ name: 'Fr. Pedro Cruz', titles: [{ title: 'Parish Priest' }] });
    mark = await addPerson({ name: 'Fr. Mark Lim', titles: [{ title: 'Parochial Vicar' }] });
    ana = await addPerson({ name: 'Ana Reyes', titles: [{ title: 'Sacristan' }] });
    // Pedro signs in as the staff user.
    await pool.query('UPDATE parish_personnel SET user_id = $1 WHERE id = $2', [parish.staff.id, pedro.id]);
    await pool.query(
      `INSERT INTO certificate_configuration (parish_id, certificate_type, updated_by, signatory_name, signatory_title)
       VALUES ($1, 'baptism', $2, 'Rev. Fr. Pedro Cruz', 'Parish Priest'),
              ($1, 'death', $2, 'Msgr. Someone Else', 'Parish Priest')`,
      [parish.id, parish.admin.id]
    );
    events.push(await addEvent('Sunday Mass', 2, pedro.id));
    events.push(await addEvent('Wedding', 5, pedro.id));
    events.push(await addEvent('Blessing', 9, pedro.id));
    pastEvent = await addEvent('Last week Mass', -7, pedro.id);

    const login = await api(null).post('/auth/login').send({ email: parish.staff.email, password: PASSWORD });
    assert.equal(login.status, 200);
    refreshToken = login.body.refresh_token || login.body.refreshToken;
    assert.ok(refreshToken);
  });

  it('lists what they still hold and who can take it', async () => {
    const res = await api(parish.admin).get(`/personnel/${pedro.id}/handover`);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.deepEqual(
      res.body.events.map((e) => e.title),
      ['Sunday Mass', 'Wedding', 'Blessing']
    );
    assert.equal(res.body.parishPriest, true);
    assert.deepEqual(res.body.signatory.types, ['baptism']);
    assert.equal(res.body.isSelf, false);
    const ids = res.body.candidates.map((c) => c.id);
    assert.ok(!ids.includes(pedro.id));
    assert.equal(res.body.candidates.find((c) => c.id === mark.id).priest, true);
    assert.equal(res.body.candidates.find((c) => c.id === ana.id).priest, false);
  });

  it('is for admins only', async () => {
    assert.equal((await api(parish.staff).get(`/personnel/${pedro.id}/handover`)).status, 403);
    assert.equal((await api(parish.staff).post(`/personnel/${pedro.id}/leave`).send({})).status, 403);
  });

  it('changes nothing if any part is refused', async () => {
    const res = await api(parish.admin)
      .post(`/personnel/${pedro.id}/leave`)
      .send({ events: [{ id: events[0], to: mark.id }], parishPriestTo: ana.id, signAs: true });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /Add Fr\. or Msgr\./);
    assert.equal((await assignee(events[0])).assigned_to, pedro.id);
    const row = await pool.query('SELECT status FROM parish_personnel WHERE id = $1', [pedro.id]);
    assert.equal(row.rows[0].status, 'active');
  });

  it('passes everything on and sets them inactive in one step', async () => {
    const res = await api(parish.admin)
      .post(`/personnel/${pedro.id}/leave`)
      .send({
        events: [
          { id: events[0], to: mark.id },
          { id: events[1], to: ana.id },
          // events[2] left out: unassigned
        ],
        parishPriestTo: mark.id,
        signAs: true,
      });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.person.status, 'inactive');
    assert.equal(res.body.moved, 2);
    assert.equal(res.body.unassigned, 1);

    assert.deepEqual(await assignee(events[0]), { assigned_to: mark.id, assignee_name: null });
    assert.equal((await assignee(events[1])).assigned_to, ana.id);
    assert.equal((await assignee(events[2])).assigned_to, null);
    assert.equal((await assignee(pastEvent)).assigned_to, pedro.id, 'past events keep their name');

    const list = await api(parish.admin).get('/personnel');
    const newPriest = list.body.personnel.find((p) => p.id === mark.id);
    assert.deepEqual(
      newPriest.titles.map((t) => t.title),
      ['Parish Priest', 'Parochial Vicar']
    );

    const config = await pool.query(
      'SELECT certificate_type, signatory_name FROM certificate_configuration WHERE parish_id = $1 ORDER BY 1',
      [parish.id]
    );
    assert.deepEqual(config.rows, [
      { certificate_type: 'baptism', signatory_name: 'Fr. Mark Lim' },
      { certificate_type: 'death', signatory_name: 'Msgr. Someone Else' },
    ]);

    const user = await pool.query('SELECT status FROM app_user WHERE id = $1', [parish.staff.id]);
    assert.equal(user.rows[0].status, 'suspended');
    const refreshed = await api(null).post('/auth/refresh').send({ refresh_token: refreshToken });
    assert.ok([401, 403].includes(refreshed.status), `refresh gave ${refreshed.status}`);
    const login = await api(null).post('/auth/login').send({ email: parish.staff.email, password: PASSWORD });
    assert.equal(login.status, 403);

    const audit = await pool.query(
      `SELECT metadata FROM audit_log WHERE action = 'personnel.handover' AND entity_id = $1`,
      [pedro.id]
    );
    assert.equal(audit.rows[0].metadata.parishPriestTo, 'Fr. Mark Lim');
  });

  it('refuses a second handover, and your own', async () => {
    assert.equal((await api(parish.admin).post(`/personnel/${pedro.id}/leave`).send({})).status, 409);

    const me = await addPerson({ name: 'Ada Admin', titles: [{ title: 'Admin Staff' }] });
    await pool.query('UPDATE parish_personnel SET user_id = $1 WHERE id = $2', [parish.admin.id, me.id]);
    const self = await api(parish.admin).post(`/personnel/${me.id}/leave`).send({});
    assert.equal(self.status, 400);
  });

  it('keeps parishes apart', async () => {
    const other = await createParish('Other');
    assert.equal((await api(other.admin).get(`/personnel/${mark.id}/handover`)).status, 404);
    assert.equal((await api(other.admin).post(`/personnel/${mark.id}/leave`).send({})).status, 404);
  });
});
