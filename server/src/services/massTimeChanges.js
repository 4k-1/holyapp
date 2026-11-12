// When a regular Mass time is changed or removed in Settings, intentions already booked on it for a
// future date would be left on a Mass that no longer happens. This finds them and moves them.
//
// A changed time moves its intentions automatically (the form sends { "6:00 PM": "7:00 PM" }).
// For a removed time, staff choose another Mass time on the same dates. When a date has no Mass
// left, staff choose another date and Mass for that day's intentions. Until every one has a place,
// the save is refused with the list of what still needs a choice.
//
// moves keys: "6:00 PM" (every date with that time) or "2026-11-14|6:00 PM" (one date, wins).
// Values: "7:00 PM" (same date) or "2026-11-15|8:00 AM" (another date).

const { writeAudit } = require('../utils/audit');
const { createNotification } = require('../utils/notify');
const { manilaToday } = require('../constants/purposes');
const { dayAbbrev, parseTimeToMinutes } = require('../utils/scheduleTime');
const { massScheduleFromCommitments, scheduleLabelForDate } = require('./scheduleService');

/** Intentions still to be said. */
const OPEN = ['pending', 'confirmed'];

function massTimesOn(commitments, date) {
  const day = dayAbbrev(date);
  const times = new Set();
  for (const c of commitments) {
    if (c.type !== 'mass' || !c.days.includes(day)) continue;
    for (const slot of c.slots) times.add(slot.start);
  }
  return times;
}

const byTime = (a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b);

function needsChoice(groups) {
  const count = groups.reduce((sum, g) => sum + g.count, 0);
  const err = new Error(
    `${count} Mass ${count === 1 ? 'intention is' : 'intentions are'} booked on a time this change removes. Choose where ${
      count === 1 ? 'it goes' : 'they go'
    }.`
  );
  err.status = 409;
  err.details = { code: 'intentions_affected', affected: groups };
  return err;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Where `target` sends an intention from `date`, if that Mass exists after the change. */
function resolveTarget(target, date, after, today) {
  if (!target) return null;
  const [toDate, toTime] = target.includes('|') ? target.split('|') : [date, target];
  if (!ISO_DATE.test(toDate) || toDate < today) return null;
  return massTimesOn(after, toDate).has(toTime) ? { toDate, to: toTime } : null;
}

/**
 * `before` and `after`: the parish's regular commitments now and once the change is saved.
 * Returns the intentions to move, each with `toDate` and `to`, or throws 409 listing the removed
 * times that still need a choice: [{ time, count, dates, options, days: [{ date, count, options }] }].
 * `options` are the Mass times left on every one of those dates; a day with no options needs another
 * date.
 */
async function planIntentionMoves(db, parishId, before, after, moves = {}) {
  const today = manilaToday();
  const result = await db.query(
    `SELECT id, to_char(schedule_date, 'YYYY-MM-DD') AS date, schedule_time AS time, requester_id, intention_for
     FROM mass_intention
     WHERE parish_id = $1 AND schedule_date >= $2 AND status = ANY($3::text[])
     ORDER BY schedule_date, schedule_time`,
    [parishId, today, OPEN]
  );
  const plan = [];
  const groups = new Map();
  for (const row of result.rows) {
    // Only intentions this change strands: their Mass is there now and gone afterwards.
    if (!massTimesOn(before, row.date).has(row.time)) continue;
    const left = massTimesOn(after, row.date);
    if (left.has(row.time)) continue;
    const target =
      resolveTarget(moves[`${row.date}|${row.time}`], row.date, after, today) ||
      resolveTarget(moves[row.time], row.date, after, today);
    if (target) {
      plan.push({ ...row, ...target });
      continue;
    }
    const group = groups.get(row.time) || { time: row.time, count: 0, dates: [], options: null, days: [] };
    group.count += 1;
    if (!group.dates.includes(row.date)) {
      group.dates.push(row.date);
      group.days.push({ date: row.date, count: 0, options: [...left].sort(byTime) });
    }
    group.days.find((d) => d.date === row.date).count += 1;
    group.options = group.options ? group.options.filter((t) => left.has(t)) : [...left];
    groups.set(row.time, group);
  }
  if (groups.size) {
    throw needsChoice(
      [...groups.values()]
        .map((g) => ({ ...g, options: g.options.sort(byTime) }))
        .sort((a, b) => byTime(a.time, b.time))
    );
  }
  // A new date takes that day's label (Sunday, Weekdays…) from the schedule after the change.
  const entries = massScheduleFromCommitments(after);
  for (const item of plan) {
    if (item.toDate !== item.date) item.toLabel = scheduleLabelForDate(item.toDate, entries);
  }
  return plan;
}

async function applyIntentionMoves(db, plan) {
  for (const item of plan) {
    if (item.toLabel !== undefined) {
      await db.query(
        'UPDATE mass_intention SET schedule_date = $1, schedule_time = $2, schedule_label = $3 WHERE id = $4',
        [item.toDate, item.to, item.toLabel, item.id]
      );
    } else {
      await db.query('UPDATE mass_intention SET schedule_time = $1 WHERE id = $2', [item.to, item.id]);
    }
  }
}

/** After the change is saved: tell the people who booked, and keep a record. */
async function announceIntentionMoves({ parishId, actorId, commitmentId, label, plan }) {
  if (!plan.length) return;
  for (const item of plan) {
    if (!item.requester_id) continue;
    await createNotification({
      parishId,
      recipientId: item.requester_id,
      kind: 'parishioner',
      title: 'Mass time changed',
      body:
        item.toDate === item.date
          ? `The ${item.time} Mass on ${item.date} is no longer held, so your intention for ${item.intention_for} moved to the ${item.to} Mass that day.`
          : `The ${item.time} Mass on ${item.date} is no longer held, so your intention for ${item.intention_for} moved to the ${item.to} Mass on ${item.toDate}.`,
      href: 'intentions',
    });
  }
  await writeAudit({
    parishId,
    actorId,
    action: 'mass_intention.moved',
    entityType: 'parish_recurring_commitment',
    entityId: commitmentId,
    metadata: {
      label,
      moved: plan.map((item) => ({ id: item.id, date: item.date, from: item.time, toDate: item.toDate, to: item.to })),
    },
  });
}

/** Reads the moves object from a request body (see the top of this file), ignoring anything else. */
function movesFrom(body) {
  const moves = {};
  if (body && typeof body.moves === 'object' && body.moves) {
    for (const [from, to] of Object.entries(body.moves)) {
      if (typeof to === 'string' && to.trim()) moves[String(from)] = to.trim();
    }
  }
  return moves;
}

module.exports = { planIntentionMoves, applyIntentionMoves, announceIntentionMoves, movesFrom, massTimesOn };
