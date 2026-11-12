// B5 + C5: the Church calendar on the schedule, and warnings for bookings it doesn't allow.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish } = require('./helpers');
const calendar = require('../src/utils/liturgicalCalendar');

after(() => pool.end());

describe('Liturgical calendar', () => {
  it('works out Easter and the days that hang on it', () => {
    assert.equal(calendar.easterSunday(2026), '2026-04-05');
    assert.equal(calendar.easterSunday(2027), '2027-03-28');
    assert.equal(calendar.liturgicalDay('2026-02-18').title, 'Ash Wednesday');
    assert.equal(calendar.liturgicalDay('2026-04-03').season, 'triduum');
    // Ascension is kept on the 7th Sunday of Easter in the Philippines.
    assert.match(calendar.liturgicalDay('2026-05-17').title, /Ascension/);
  });

  it('names seasons, Sundays and holy days of obligation', () => {
    assert.equal(calendar.liturgicalDay('2026-11-29').title, '1st Sunday of Advent');
    assert.equal(calendar.liturgicalDay('2026-11-15').title, '33rd Sunday in Ordinary Time');
    assert.equal(calendar.liturgicalDay('2026-01-18').title, 'Feast of the Santo Niño');
    const dec8 = calendar.liturgicalDay('2026-12-08');
    assert.equal(dec8.obligation, true);
    assert.ok(dec8.notes.includes('Holy day of obligation'));
    assert.ok(calendar.liturgicalDay('2026-12-16').notes.includes('Simbang Gabi, day 1 of 9'));
    // On a Sunday of Advent the Immaculate Conception moves to Monday.
    assert.equal(calendar.liturgicalDay('2024-12-08').title, '2nd Sunday of Advent');
    assert.match(calendar.liturgicalDay('2024-12-09').title, /Immaculate Conception/);
  });

  it('warns about funeral Masses and weddings the Church does not allow', () => {
    const levels = (type, date) => calendar.bookingWarnings(type, date).map((w) => w.level);
    assert.deepEqual(levels('funeral', '2026-03-01'), ['rule']); // Sunday of Lent
    assert.deepEqual(levels('funeral', '2026-04-02'), ['rule']); // Holy Thursday
    assert.deepEqual(levels('funeral', '2026-12-25'), ['rule']); // holy day of obligation
    assert.deepEqual(levels('funeral', '2026-11-15'), []); // Sunday in Ordinary Time
    assert.deepEqual(levels('wedding', '2026-04-03'), ['rule']); // Good Friday
    assert.deepEqual(levels('wedding', '2026-03-07'), ['note']); // Lent
    assert.deepEqual(levels('mass', '2026-04-03'), []);
  });
});

describe('Booking with the liturgical calendar', () => {
  let parish;

  const funeral = (date, extra = {}) =>
    api(parish.staff)
      .post('/schedule/events')
      .send({ date, start: '9:00 AM', end: '10:00 AM', type: 'funeral', title: 'Funeral — Cruz', location: 'Main church', ...extra });

  before(async () => {
    parish = await createParish('Calendar');
  });

  it('stops a funeral Mass on a Sunday of Lent until staff book anyway', async () => {
    const first = await funeral('2030-03-17');
    assert.equal(first.status, 409);
    assert.equal(first.body.code, 'calendar_warning');
    assert.match(first.body.error, /GIRM 380/);

    const anyway = await funeral('2030-03-17', { calendarOk: true });
    assert.equal(anyway.status, 201, JSON.stringify(anyway.body));

    const ordinary = await funeral('2030-06-25', { start: '1:00 PM', end: '2:00 PM' });
    assert.equal(ordinary.status, 201, JSON.stringify(ordinary.body));
  });

  it('warns about a wedding on Good Friday when a date is reserved', async () => {
    const created = await api(parish.staff).post('/marriage-applications').send({
      groomFirstName: 'Pedro',
      groomLastName: 'Cruz',
      brideFirstName: 'Ana',
      brideLastName: 'Reyes',
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const reserve = (extra = {}) =>
      api(parish.staff)
        .post(`/marriage-applications/${created.body.application.id}/reserve-date`)
        .send({ date: '2030-04-19', start: '9:00 AM', end: '10:00 AM', ...extra });
    const first = await reserve();
    assert.equal(first.status, 409);
    assert.equal(first.body.code, 'calendar_warning');
    assert.equal((await reserve({ calendarOk: true })).status, 200);
  });

  it("shows the parish's own dates and notes them when booking", async () => {
    const save = (extra) =>
      api(parish.admin)
        .patch('/parish/settings/profile')
        .send({ name: 'Calendar Parish', address: 'Cebu City', patron: 'St Roch', ...extra });

    assert.equal((await save({ fiestaDate: '02-30' })).status, 400);
    const saved = await save({ fiestaDate: '08-16', localFeasts: [{ name: 'San Isidro chapel fiesta', date: '05-15' }] });
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.equal(saved.body.profile.fiestaDate, '08-16');

    // Saving without these fields (an older screen) keeps them.
    const kept = await api(parish.admin)
      .patch('/parish/settings/profile')
      .send({ name: 'Calendar Parish', address: 'Cebu City', patron: 'St Roch' });
    assert.equal(kept.body.profile.localFeasts.length, 1);

    const month = await api(parish.staff).get('/schedule/month?year=2030&month=7');
    assert.deepEqual(month.body.calendar['2030-08-16'].local, ['Parish fiesta (St Roch)']);
    assert.equal(month.body.calendar['2030-08-15'].rank, 'solemnity');

    const day = await api(parish.staff).get('/schedule/calendar-day?date=2030-05-15&type=wedding');
    assert.equal(day.status, 200);
    assert.deepEqual(
      day.body.warnings.map((w) => w.level),
      ['note']
    );
    // A note alone never stops a booking.
    const onFiesta = await funeral('2030-08-16', { type: 'blessing', title: 'House blessing' });
    assert.equal(onFiesta.status, 201, JSON.stringify(onFiesta.body));
  });
});
