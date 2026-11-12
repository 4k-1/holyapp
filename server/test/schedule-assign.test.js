// C2: schedule assignments are saved by the person's record id, not a typed name.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish } = require('./helpers');

after(() => pool.end());

// A Monday, far enough ahead to count as upcoming.
const DAY = '2030-03-04';

describe('Assigning staff by record', () => {
  let parish;
  let mark;
  let ana;
  let commitment;

  async function addPerson(body) {
    const res = await api(parish.admin).post('/personnel').send(body);
    assert.equal(res.status, 201, JSON.stringify(res.body));
    return res.body.person;
  }

  const addEvent = (body) =>
    api(parish.staff)
      .post('/schedule/events')
      .send({ date: DAY, start: '9:00 AM', end: '10:00 AM', type: 'blessing', ...body });

  async function occurrences() {
    const res = await api(parish.staff).get('/schedule/month').query({ year: 2030, month: 2 });
    assert.equal(res.status, 200);
    return res.body.occurrences[DAY];
  }

  before(async () => {
    parish = await createParish('Assign');
    mark = await addPerson({ name: 'Fr. Mark Lim', titles: [{ title: 'Parochial Vicar' }] });
    ana = await addPerson({ name: 'Ana Reyes', titles: [{ title: 'Sacristan' }] });
  });

  it('saves the person, shows their current name, and checks clashes by person', async () => {
    const first = await addEvent({ title: 'House blessing', location: 'Cruz home', assigneeId: mark.id });
    assert.equal(first.status, 201, JSON.stringify(first.body));
    assert.equal(first.body.block.assigneeId, mark.id);
    assert.equal(first.body.block.assignee, 'Fr. Mark Lim');
    assert.equal(first.body.block.guest, false);

    const clash = await addEvent({ title: 'Car blessing', location: 'Parking lot', assigneeId: mark.id });
    assert.equal(clash.status, 409);
    assert.match(clash.body.error, /Fr\. Mark Lim is already assigned/);

    // A visiting priest typed in is a guest; even with the same name, a guest is not the staff member.
    const guest = await addEvent({ title: 'Car blessing', location: 'Parking lot', assignee: 'Fr. Mark Lim' });
    assert.equal(guest.status, 201, JSON.stringify(guest.body));
    assert.equal(guest.body.block.assigneeId, null);
    assert.equal(guest.body.block.guest, true);

    const renamed = await api(parish.admin).patch(`/personnel/${mark.id}`).send({ name: 'Marcus Lim' });
    assert.equal(renamed.status, 200, JSON.stringify(renamed.body));
    const day = await occurrences();
    assert.equal(day.find((o) => o.id === first.body.block.id).assignee, 'Fr. Marcus Lim');
  });

  it("refuses someone from another parish's staff list", async () => {
    const other = await createParish('Other');
    const stranger = (await api(other.admin).post('/personnel').send({ name: 'Fr. Stranger', titles: [{ title: 'Parochial Vicar' }] })).body.person;
    const res = await addEvent({ title: 'Blessing', location: 'Hall', assigneeId: stranger.id });
    assert.equal(res.status, 400);
    assert.equal((await addEvent({ title: 'Blessing', location: 'Hall', assigneeId: 'not-an-id' })).status, 400);
  });

  it('links regular commitments and single-Mass changes to the person', async () => {
    const created = await api(parish.admin)
      .post('/schedule/recurring')
      .send({
        label: 'Monday Holy Hour',
        type: 'other',
        days: ['Mon'],
        slots: [{ start: '3:00 PM', end: '4:00 PM' }],
        assigneeId: ana.id,
      });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    commitment = created.body.commitment;
    assert.equal(commitment.assigneeId, ana.id);
    assert.equal(commitment.assignee, 'Ana Reyes');

    const occurrenceId = `${commitment.id}-${DAY}-3:00 PM`;
    assert.equal((await occurrences()).find((o) => o.id === occurrenceId).assigneeId, ana.id);

    const changed = await api(parish.staff).post('/schedule/assign').send({ occurrenceId, assigneeId: mark.id });
    assert.equal(changed.status, 200, JSON.stringify(changed.body));
    const occurrence = (await occurrences()).find((o) => o.id === occurrenceId);
    assert.equal(occurrence.assigneeId, mark.id);
    assert.equal(occurrence.assignee, 'Fr. Marcus Lim');

    // Mark is at the house blessing 9–10; a change that puts him at the 3 PM is fine, a clash at 9 is not.
    const clash = await api(parish.staff)
      .post('/schedule/conflicts')
      .send({ date: DAY, start: '9:30 AM', end: '10:30 AM', assigneeId: mark.id, location: 'Elsewhere' });
    assert.ok(clash.body.conflict);
    assert.equal(clash.body.conflict.reason, 'priest');
  });

  it('hands over regular commitments and single-Mass changes when someone leaves', async () => {
    const occurrenceId = `${commitment.id}-${DAY}-3:00 PM`;
    await api(parish.staff).post('/schedule/assign').send({ occurrenceId, assigneeId: ana.id });

    const view = await api(parish.admin).get(`/personnel/${ana.id}/handover`);
    assert.equal(view.status, 200);
    assert.deepEqual(
      view.body.regular.map((r) => r.label),
      ['Monday Holy Hour']
    );
    const change = view.body.events.find((e) => e.id === occurrenceId);
    assert.ok(change, 'the single-Mass change is listed with the events');
    assert.equal(change.date, DAY);
    assert.equal(change.time, '15:00');

    const left = await api(parish.admin)
      .post(`/personnel/${ana.id}/leave`)
      .send({ regular: [{ id: commitment.id, to: mark.id }], events: [] });
    assert.equal(left.status, 200, JSON.stringify(left.body));

    const saved = await pool.query('SELECT assigned_to FROM parish_recurring_commitment WHERE id = $1', [commitment.id]);
    assert.equal(saved.rows[0].assigned_to, mark.id);
    // The change left unassigned goes back to the regular assignment, now Mark.
    assert.equal((await occurrences()).find((o) => o.id === occurrenceId).assigneeId, mark.id);
  });

  it('keeps the name as a guest when someone is removed', async () => {
    const temp = await addPerson({ name: 'Jose Ramos', titles: [{ title: 'Sacristan' }] });
    const event = await addEvent({ title: 'Blessing', location: 'Chapel', start: '1:00 PM', end: '2:00 PM', assigneeId: temp.id });
    assert.equal(event.status, 201, JSON.stringify(event.body));
    assert.equal((await api(parish.admin).delete(`/personnel/${temp.id}`)).status, 200);
    const block = (await occurrences()).find((o) => o.id === event.body.block.id);
    assert.equal(block.assigneeId, null);
    assert.equal(block.assignee, 'Jose Ramos');
    assert.equal(block.guest, true);
  });
});
