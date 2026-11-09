// Changing or removing a regular Mass time in Settings carries the intentions booked on it.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish } = require('./helpers');

after(() => pool.end());

const SAT = '2030-03-02'; // a Saturday, still to come
const PAST_SAT = '2020-01-04';

describe('Mass time changes and booked intentions', () => {
  let parish;
  let saturday;
  const ids = {};

  async function addIntention(date, time, { status = 'pending', requester = null } = {}) {
    const result = await pool.query(
      `INSERT INTO mass_intention
         (parish_id, requester_name, intention_type, intention_for, schedule_date, schedule_time, status, requester_id)
       VALUES ($1, 'Ana Reyes', 'thanksgiving', 'the Reyes family', $2, $3, $4, $5)
       RETURNING id`,
      [parish.id, date, time, status, requester]
    );
    return result.rows[0].id;
  }

  const timeOf = async (id) =>
    (await pool.query('SELECT schedule_time FROM mass_intention WHERE id = $1', [id])).rows[0].schedule_time;

  const saveSaturday = (times, moves) =>
    api(parish.admin)
      .patch(`/schedule/recurring/${saturday.id}`)
      .send({
        label: 'Saturday Mass',
        type: 'mass',
        days: ['Sat'],
        slots: times.map(([start, end]) => ({ start, end })),
        moves,
      });

  before(async () => {
    parish = await createParish('MassTimes');
    const list = await api(parish.admin).get('/schedule/recurring');
    saturday = list.body.commitments.find((c) => c.label === 'Saturday Mass');
    ids.evening = await addIntention(SAT, '6:00 PM', { requester: parish.parishioner.id });
    ids.evening2 = await addIntention(SAT, '6:00 PM', { status: 'confirmed' });
    ids.said = await addIntention(SAT, '6:00 PM', { status: 'said' });
    ids.morning = await addIntention(SAT, '6:00 AM');
    ids.past = await addIntention(PAST_SAT, '6:00 PM');
  });

  it('moves intentions to the new time when a Mass time changes', async () => {
    const res = await saveSaturday(
      [
        ['6:00 AM', '7:00 AM'],
        ['7:00 PM', '8:00 PM'],
      ],
      { '6:00 PM': '7:00 PM' }
    );
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.movedIntentions, 2);
    assert.equal(await timeOf(ids.evening), '7:00 PM');
    assert.equal(await timeOf(ids.evening2), '7:00 PM');
    assert.equal(await timeOf(ids.said), '6:00 PM', 'intentions already said stay');
    assert.equal(await timeOf(ids.past), '6:00 PM', 'past dates stay');
    assert.equal(await timeOf(ids.morning), '6:00 AM');

    const note = await pool.query(
      `SELECT body FROM app_notification WHERE recipient_id = $1 AND title = 'Mass time changed'`,
      [parish.parishioner.id]
    );
    assert.equal(note.rowCount, 1);
    assert.match(note.rows[0].body, /moved to the 7:00 PM Mass/);
  });

  it('asks where intentions go before a time is removed', async () => {
    const refused = await saveSaturday([['6:00 AM', '7:00 AM']]);
    assert.equal(refused.status, 409);
    assert.equal(refused.body.code, 'intentions_affected');
    assert.deepEqual(refused.body.affected, [{ time: '7:00 PM', count: 2, dates: [SAT], options: ['6:00 AM'] }]);
    assert.equal(await timeOf(ids.evening), '7:00 PM', 'nothing changed');
    const unchanged = (await api(parish.admin).get('/schedule/recurring')).body.commitments.find(
      (c) => c.id === saturday.id
    );
    assert.equal(unchanged.slots.length, 2);

    const badChoice = await saveSaturday([['6:00 AM', '7:00 AM']], { '7:00 PM': '9:00 PM' });
    assert.equal(badChoice.status, 409, 'a time with no Mass that day is not accepted');

    const saved = await saveSaturday([['6:00 AM', '7:00 AM']], { '7:00 PM': '6:00 AM' });
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.equal(await timeOf(ids.evening), '6:00 AM');
  });

  it('asks the same when a whole Mass is removed, and offers only Masses left that day', async () => {
    const refused = await api(parish.admin).delete(`/schedule/recurring/${saturday.id}`).send({});
    assert.equal(refused.status, 409);
    assert.deepEqual(refused.body.affected, [{ time: '6:00 AM', count: 3, dates: [SAT], options: [] }]);

    const added = await api(parish.admin)
      .post('/schedule/recurring')
      .send({ label: 'Anticipated Mass', type: 'mass', days: ['Sat'], slots: [{ start: '5:00 PM', end: '6:00 PM' }] });
    assert.equal(added.status, 201);

    const removed = await api(parish.admin)
      .delete(`/schedule/recurring/${saturday.id}`)
      .send({ moves: { '6:00 AM': '5:00 PM' } });
    assert.equal(removed.status, 200, JSON.stringify(removed.body));
    assert.equal(removed.body.movedIntentions, 3);
    assert.equal(await timeOf(ids.morning), '5:00 PM');

    const audit = await pool.query(
      `SELECT metadata FROM audit_log WHERE action = 'mass_intention.moved' AND entity_id = $1 ORDER BY created_at`,
      [saturday.id]
    );
    assert.equal(audit.rowCount, 3);
  });
});
