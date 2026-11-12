// C11: sacraments on the schedule wait to be written in the register.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish, baptismBody } = require('./helpers');

after(() => pool.end());

describe('Recording sacraments from the schedule', () => {
  let parish;

  const addEvent = async (type, title, date = '2030-03-03') => {
    const res = await api(parish.staff)
      .post('/schedule/events')
      .send({ date, start: '11:00 AM', end: '12:00 PM', type, title, location: `${title} place` });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    return res.body.block;
  };

  const block = async (id) => (await api(parish.staff).get('/schedule/blocks')).body.blocks.find((b) => b.id === id);

  before(async () => {
    parish = await createParish('Recording');
  });

  it('marks sacraments as needing recording, and nothing else', async () => {
    assert.equal((await addEvent('baptism', 'Baptism session')).recordStatus, 'Pending');
    assert.equal((await addEvent('funeral', 'Funeral')).recordStatus, 'Pending');
    assert.equal((await addEvent('blessing', 'House blessing')).recordStatus, undefined);
  });

  it('keeps a baptism session open while children are recorded, until staff close it', async () => {
    const session = await addEvent('baptism', 'Sunday baptisms');
    for (const firstName of ['Juan', 'Maria']) {
      const res = await api(parish.staff)
        .post('/records/baptism')
        .send({ ...baptismBody({ firstName }), scheduleEventId: session.id });
      assert.equal(res.status, 201, JSON.stringify(res.body));
      assert.equal(res.body.record.scheduleEventId, session.id);
    }
    const seen = await block(session.id);
    assert.equal(seen.recordStatus, 'Pending', 'a batch stays open');
    assert.deepEqual(
      seen.recorded.map((r) => [r.register, r.name.split(' ')[0]]),
      [
        ['baptismal', 'Juan'],
        ['baptismal', 'Maria'],
      ]
    );

    const closed = await api(parish.staff)
      .patch(`/schedule/events/${session.id}/record-status`)
      .send({ status: 'Recorded' });
    assert.equal(closed.status, 200);
    assert.equal((await block(session.id)).recordStatus, 'Recorded');
  });

  it('closes a funeral once its death entry is saved', async () => {
    const funeral = await addEvent('funeral', 'Funeral of Pedro Cruz');
    const res = await api(parish.staff).post('/records/death').send({
      firstName: 'Pedro',
      lastName: 'Cruz',
      dateOfDeath: '2030-03-01',
      dateOfBurial: '2030-03-03',
      placeOfBurial: 'Parish cemetery',
      minister: 'Fr. Mark Lim',
      bookNumber: '1',
      pageNumber: '2',
      entryNumber: '3',
      scheduleEventId: funeral.id,
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const seen = await block(funeral.id);
    assert.equal(seen.recordStatus, 'Recorded');
    assert.deepEqual(seen.recorded, [{ id: res.body.record.id, register: 'death', name: 'Pedro Cruz' }]);
  });

  it("refuses an event of the wrong kind or another parish's, and saves nothing", async () => {
    const blessing = await addEvent('blessing', 'Car blessing');
    const before = (await pool.query('SELECT count(*)::int AS n FROM baptism WHERE parish_id = $1', [parish.id])).rows[0].n;
    const wrong = await api(parish.staff)
      .post('/records/baptism')
      .send({ ...baptismBody({ firstName: 'Lito' }), scheduleEventId: blessing.id });
    assert.equal(wrong.status, 400);

    const other = await createParish('OtherRecording');
    const theirs = await api(other.staff)
      .post('/schedule/events')
      .send({ date: '2030-03-03', start: '9:00 AM', end: '10:00 AM', type: 'baptism', title: 'Theirs', location: 'Chapel' });
    const stranger = await api(parish.staff)
      .post('/records/baptism')
      .send({ ...baptismBody({ firstName: 'Lito' }), scheduleEventId: theirs.body.block.id });
    assert.equal(stranger.status, 400);
    const after = (await pool.query('SELECT count(*)::int AS n FROM baptism WHERE parish_id = $1', [parish.id])).rows[0].n;
    assert.equal(after, before);
  });
});
