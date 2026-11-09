// C7: book a funeral fast. Families come 1–3 days ahead, so the office sees the open church times for
// the next few days with the priests free at each, books the funeral, and can book the Masses families
// expect afterwards (9th day, 40th day, first anniversary) as Mass intentions on regular Masses.

const pool = require('../config/db');
const schedule = require('./scheduleService');
const liturgical = require('../utils/liturgicalCalendar');
const { findConflict, minutesToTime } = require('../utils/scheduleTime');
const { requiredText, optionalText, dateValue } = require('../utils/recordFields');
const { manilaToday } = require('../constants/purposes');
const { insertOfficeIntention, parseDonation } = require('./intentionBooking');

/** Funerals start on the hour from 7 AM to 4 PM and take about an hour. */
const FIRST_START = 7 * 60;
const LAST_START = 16 * 60;
const FUNERAL_MINUTES = 60;
/** At most the three follow-up Masses. */
const MAX_FOLLOW_UPS = 3;

function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Minutes past midnight now in the Philippines. */
function manilaMinutes(now = new Date()) {
  const t = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return t.getUTCHours() * 60 + t.getUTCMinutes();
}

/**
 * Each day from `from` (never before today): the Church calendar, funeral warnings, and the hours the
 * main church is free, each with the ids of the priests free then.
 */
async function funeralSlots(parishId, from, days = 3) {
  const today = manilaToday();
  const start = from && from > today ? from : today;
  const [staff, local] = await Promise.all([
    schedule.listAssignableStaff(parishId),
    schedule.loadLocalDates(parishId),
  ]);
  const priests = staff.filter((person) => person.clergy);
  const result = [];
  for (let i = 0; i < days; i += 1) {
    const date = addDays(start, i);
    const occurrences = await schedule.occurrencesForDate(parishId, date);
    const pastMinutes = date === today ? manilaMinutes() : -1;
    const slots = [];
    for (let minutes = FIRST_START; minutes <= LAST_START; minutes += 60) {
      if (minutes <= pastMinutes) continue;
      const slotStart = minutesToTime(minutes);
      const slotEnd = minutesToTime(minutes + FUNERAL_MINUTES);
      if (findConflict(occurrences, slotStart, slotEnd, { location: schedule.DEFAULT_LOCATION })) continue;
      slots.push({
        start: slotStart,
        end: slotEnd,
        freePriests: priests
          .filter((p) => !findConflict(occurrences, slotStart, slotEnd, { assigneeId: p.id }))
          .map((p) => p.id),
      });
    }
    result.push({
      date,
      day: liturgical.liturgicalDay(date, local),
      warnings: liturgical.bookingWarnings('funeral', date, local),
      slots,
    });
  }
  return result;
}

/** The follow-up Masses asked for: { label, date, time, offering }, each on a regular Mass from today on. */
async function parseFollowUps(parishId, list) {
  const items = Array.isArray(list) ? list : [];
  if (items.length > MAX_FOLLOW_UPS) throw schedule.httpError(400, 'Book at most three follow-up Masses.');
  const today = manilaToday();
  const parsed = [];
  for (const item of items) {
    const label = requiredText(item?.label, 'Follow-up Mass');
    const date = dateValue(item?.date, `${label} date`);
    const time = requiredText(item?.time, `${label} Mass time`);
    if (date < today) throw schedule.httpError(400, `The ${label} Mass can't be on a past date.`);
    const occurrences = await schedule.occurrencesForDate(parishId, date);
    if (!occurrences.some((o) => o.type === 'mass' && o.start === time)) {
      throw schedule.httpError(400, `There is no ${time} Mass on ${date} for the ${label} Mass.`);
    }
    parsed.push({ label, date, time, offering: parseDonation(item?.offering) });
  }
  return parsed;
}

/**
 * Books the funeral in the main church and the follow-up Masses in one go; nothing is saved if any part
 * fails. Returns { eventId, intentions }.
 */
async function bookFuneral(parishId, actorId, body = {}) {
  const deceasedName = requiredText(body.deceasedName, 'Name of the deceased');
  const input = {
    title: `Funeral — ${deceasedName}`,
    date: dateValue(body.date, 'Funeral date'),
    start: requiredText(body.start, 'Start time'),
    end: requiredText(body.end, 'End time'),
    type: 'funeral',
    source: 'manual',
    ...schedule.assigneeInput(body),
    location: schedule.DEFAULT_LOCATION,
  };
  const followUps = await parseFollowUps(parishId, body.followUps);
  const requesterName = optionalText(body.requesterName);
  if (followUps.length > 0 && !requesterName) {
    throw schedule.httpError(400, 'Enter who asked for the follow-up Masses.');
  }
  await schedule.checkAssignee(parishId, input);
  await schedule.assertNoConflict(parishId, input);
  await schedule.assertCalendarOk(parishId, { ...input, calendarOk: body.calendarOk });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const eventId = await schedule.createEvent(parishId, actorId, input, client);
    const intentions = [];
    for (const item of followUps) {
      const row = await insertOfficeIntention(client, {
        parishId,
        actorId,
        date: item.date,
        time: item.time,
        requesterName,
        type: 'death_anniversary',
        intentionFor: `For the eternal repose of the soul of ${deceasedName} (${item.label})`,
        offering: item.offering,
        contact: optionalText(body.contact),
      });
      intentions.push({ id: row.id, label: item.label, date: item.date, time: item.time });
    }
    await client.query('COMMIT');
    return { eventId, input, intentions };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { funeralSlots, bookFuneral };
