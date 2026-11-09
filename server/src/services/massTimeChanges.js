// When a regular Mass time is changed or removed in Settings, intentions already booked on it for a
// future date would be left on a Mass that no longer happens. This finds them and moves them.
//
// A changed time moves its intentions automatically (the form sends { "6:00 PM": "7:00 PM" }).
// For a removed time, staff choose another Mass time on the same dates; until they do, the save is
// refused with the list of times that need a choice.

const { writeAudit } = require('../utils/audit');
const { createNotification } = require('../utils/notify');
const { manilaToday } = require('../constants/purposes');
const { dayAbbrev, parseTimeToMinutes } = require('../utils/scheduleTime');

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

/**
 * `before` and `after`: the parish's regular commitments now and once the change is saved.
 * `moves`: { oldTime: newTime }. Returns the intentions to move, each with `to`, or throws 409 listing
 * the removed times that still need a choice: [{ time, count, dates, options }], where `options` are
 * the Mass times left on every one of those dates.
 */
async function planIntentionMoves(db, parishId, before, after, moves = {}) {
  const result = await db.query(
    `SELECT id, to_char(schedule_date, 'YYYY-MM-DD') AS date, schedule_time AS time, requester_id, intention_for
     FROM mass_intention
     WHERE parish_id = $1 AND schedule_date >= $2 AND status = ANY($3::text[])
     ORDER BY schedule_date, schedule_time`,
    [parishId, manilaToday(), OPEN]
  );
  const plan = [];
  const groups = new Map();
  for (const row of result.rows) {
    // Only intentions this change strands: their Mass is there now and gone afterwards.
    if (!massTimesOn(before, row.date).has(row.time)) continue;
    const left = massTimesOn(after, row.date);
    if (left.has(row.time)) continue;
    const to = moves[row.time];
    if (to && left.has(to)) {
      plan.push({ ...row, to });
      continue;
    }
    const group = groups.get(row.time) || { time: row.time, count: 0, dates: [], options: null };
    group.count += 1;
    if (!group.dates.includes(row.date)) group.dates.push(row.date);
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
  return plan;
}

async function applyIntentionMoves(db, plan) {
  for (const item of plan) {
    await db.query('UPDATE mass_intention SET schedule_time = $1 WHERE id = $2', [item.to, item.id]);
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
      body: `The ${item.time} Mass on ${item.date} is no longer held, so your intention for ${item.intention_for} moved to the ${item.to} Mass that day.`,
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
      moved: plan.map((item) => ({ id: item.id, date: item.date, from: item.time, to: item.to })),
    },
  });
}

/** Reads { "6:00 PM": "7:00 PM" } from a request body, ignoring anything else. */
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
