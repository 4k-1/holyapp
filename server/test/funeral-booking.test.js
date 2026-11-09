// C7: book a funeral fast, with the follow-up Masses families expect as Mass intentions.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish } = require('./helpers');

after(() => pool.end());

describe('Funeral booking', () => {
  let parish;
  let priest;
  const DAY = '2030-06-25'; // a Tuesday in Ordinary Time

  const slots = async (from = DAY) => {
    const res = await api(parish.staff).get('/schedule/funeral-slots').query({ from });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    return res.body.days;
  };

  const book = (extra = {}) =>
    api(parish.staff)
      .post('/schedule/funerals')
      .send({
        deceasedName: 'Juan Dela Cruz',
        date: DAY,
        start: '9:00 AM',
        end: '10:00 AM',
        assigneeId: priest.id,
        requesterName: 'Maria Dela Cruz',
        contact: '0917 000 0000',
        ...extra,
      });

  const intentionsFor = async (name) =>
    (
      await pool.query('SELECT * FROM mass_intention WHERE parish_id = $1 AND intention_for LIKE $2', [
        parish.id,
        `%${name}%`,
      ])
    ).rows;

  before(async () => {
    parish = await createParish('Funerals');
    const res = await api(parish.admin)
      .post('/personnel')
      .send({ name: 'Fr. Pedro Reyes', titles: [{ title: 'Parochial Vicar' }] });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    priest = res.body.person;
  });

  it('lists the free church hours for three days with the priests free at each', async () => {
    const days = await slots();
    assert.deepEqual(
      days.map((d) => d.date),
      ['2030-06-25', '2030-06-26', '2030-06-27']
    );
    const nine = days[0].slots.find((s) => s.start === '9:00 AM');
    assert.ok(nine);
    assert.ok(nine.freePriests.includes(priest.id));
    // Never earlier than today.
    const past = await slots('2020-01-01');
    assert.ok(past[0].date >= new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10));
  });

  it('books the funeral and the follow-up Masses together', async () => {
    const res = await book({
      followUps: [
        { label: '9th day', date: '2030-07-02', time: '6:00 PM', offering: 200 },
        { label: '40th day', date: '2030-08-02', time: '6:00 PM' },
      ],
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.block.title, 'Funeral — Juan Dela Cruz');
    assert.equal(res.body.block.location, 'Main church');
    assert.equal(res.body.block.recordStatus, 'Pending');
    assert.equal(res.body.intentions.length, 2);

    const rows = await intentionsFor('Juan Dela Cruz');
    assert.equal(rows.length, 2);
    const ninth = rows.find((r) => r.intention_for.includes('9th day'));
    assert.equal(ninth.intention_for, 'For the eternal repose of the soul of Juan Dela Cruz (9th day)');
    assert.equal(ninth.status, 'confirmed');
    assert.equal(ninth.payment_status, 'paid');
    assert.equal(ninth.requester_name, 'Maria Dela Cruz');

    // The church is now taken at 9 AM.
    const days = await slots();
    assert.equal(days[0].slots.find((s) => s.start === '9:00 AM'), undefined);
  });

  it('saves nothing when a follow-up Mass does not exist', async () => {
    const res = await book({
      deceasedName: 'Ana Santos',
      start: '11:00 AM',
      end: '12:00 PM',
      followUps: [{ label: '9th day', date: '2030-07-02', time: '3:00 PM' }],
    });
    assert.equal(res.status, 400);
    assert.match(res.body.error, /no 3:00 PM Mass/);
    const events = await pool.query(`SELECT 1 FROM event WHERE parish_id = $1 AND title LIKE '%Ana Santos%'`, [
      parish.id,
    ]);
    assert.equal(events.rowCount, 0);
  });

  it('needs someone named for the follow-up Masses, and a funeral Mass warning needs Book anyway', async () => {
    const noName = await book({
      deceasedName: 'Rosa Lim',
      start: '1:00 PM',
      end: '2:00 PM',
      requesterName: '',
      followUps: [{ label: '40th day', date: '2030-08-02', time: '6:00 PM' }],
    });
    assert.equal(noName.status, 400);

    const lent = await book({ deceasedName: 'Rosa Lim', date: '2030-03-17', start: '1:00 PM', end: '2:00 PM' });
    assert.equal(lent.status, 409);
    assert.equal(lent.body.code, 'calendar_warning');
  });
});
