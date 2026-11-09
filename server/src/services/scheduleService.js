const pool = require('../config/db');
const { NEEDS_RECORDING } = require('../utils/scheduleRecordLink');
const { isClergyRank, formatPersonName } = require('../constants/personnelRoles');
const {
  convert24to12,
  dayAbbrev,
  daysInMonth,
  conflictMessage,
  findConflict,
  parseTimeToMinutes,
  toISO,
  toTimestamp,
} = require('../utils/scheduleTime');

const DEFAULT_MASS = [
  {
    label: 'Weekday Mass',
    event_type: 'mass',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    slots: [
      { start: '6:00 AM', end: '7:00 AM' },
      { start: '6:00 PM', end: '7:00 PM' },
    ],
  },
  {
    label: 'Saturday Mass',
    event_type: 'mass',
    days: ['Sat'],
    slots: [
      { start: '6:00 AM', end: '7:00 AM' },
      { start: '6:00 PM', end: '7:00 PM' },
    ],
  },
  {
    label: 'Sunday Mass',
    event_type: 'mass',
    days: ['Sun'],
    slots: [
      { start: '6:00 AM', end: '7:00 AM' },
      { start: '8:00 AM', end: '9:00 AM' },
      { start: '10:00 AM', end: '11:00 AM' },
      { start: '5:00 PM', end: '6:00 PM' },
    ],
  },
];

/** Regular Masses and other standing commitments are held in the church itself. */
const DEFAULT_LOCATION = 'Main church';

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The name as shown ("Fr. Juan Santos, SVD"), always from the Staff record. */
const PERSON_NAME = `concat_ws(' ', p.honorific, p.full_name) || COALESCE(', ' || p.post_nominals, '')`;

/**
 * Who is assigned (C2): a person on the staff list by id, with their current name, or a guest by the name typed
 * in (a visiting priest). The text column is kept only for guests.
 */
function assigneeOf(personId, personName, guestName) {
  if (personId) return { assigneeId: personId, assignee: personName || '', guest: false };
  const name = String(guestName || '').trim();
  return { assigneeId: null, assignee: name, guest: name !== '' };
}

function toRecurring(row) {
  return {
    id: row.id,
    label: row.label,
    type: row.event_type,
    days: row.days || [],
    slots: Array.isArray(row.slots) ? row.slots : [],
    ...assigneeOf(row.assigned_to, row.assigned_personnel_name, row.assignee),
    showOnOverview: row.show_on_overview !== false,
  };
}

function toBlock(row) {
  return {
    id: row.id,
    date: row.event_date,
    start: convert24to12(row.start_24),
    end: convert24to12(row.end_24),
    title: row.title,
    type: row.event_type,
    source: row.source || 'manual',
    ...assigneeOf(row.assigned_to, row.assigned_personnel_name, row.assignee_name),
    location: row.location || '',
    recordStatus: row.record_status || undefined,
    /** Register entries made from it: [{ id, register, name }]. */
    recorded: row.recorded || [],
    /** A wedding booked through a marriage application. */
    marriageApplicationId: row.marriage_application_id || null,
    showOnOverview: row.show_on_overview !== false,
  };
}

function getOccurrencesForDate(dateStr, recurring, blocks, overrides) {
  const day = dayAbbrev(dateStr);
  const occurrences = [];

  for (const rc of recurring) {
    if (!rc.days.includes(day)) continue;
    for (const slot of rc.slots) {
      const occId = `${rc.id}-${dateStr}-${slot.start}`;
      // A change for this one Mass wins over the regular assignment.
      const who = overrides[occId] || rc;
      occurrences.push({
        id: occId,
        date: dateStr,
        start: slot.start,
        end: slot.end,
        title: rc.label,
        type: rc.type,
        source: 'recurring',
        assigneeId: who.assigneeId || null,
        assignee: who.assignee || '',
        guest: Boolean(who.guest),
        location: DEFAULT_LOCATION,
        showOnOverview: rc.showOnOverview !== false,
        isRecurringOccurrence: true,
      });
    }
  }

  for (const b of blocks) {
    if (b.date !== dateStr) continue;
    occurrences.push({
      ...b,
      source: b.type === 'manual' ? 'manual' : b.source,
      showOnOverview: b.showOnOverview !== false,
      isRecurringOccurrence: false,
    });
  }

  occurrences.sort((a, b) => parseTimeToMinutes(a.start) - parseTimeToMinutes(b.start));
  return occurrences;
}

const EVENT_SELECT = `
  SELECT e.*,
         to_char(e.start_datetime, 'YYYY-MM-DD') AS event_date,
         to_char(e.start_datetime, 'HH24:MI') AS start_24,
         to_char(COALESCE(e.end_datetime, e.start_datetime + interval '1 hour'), 'HH24:MI') AS end_24,
         ${PERSON_NAME} AS assigned_personnel_name,
         rec.recorded
  FROM event e
  LEFT JOIN parish_personnel p ON p.id = e.assigned_to
  -- Register entries made from this event (C11): a baptism session can have several.
  LEFT JOIN LATERAL (
    SELECT json_agg(json_build_object('id', r.id, 'register', r.register, 'name', r.name) ORDER BY r.created_at) AS recorded
    FROM (
      SELECT id, 'baptismal' AS register, concat_ws(' ', first_name, last_name) AS name, created_at
        FROM baptism WHERE schedule_event_id = e.id AND archived_at IS NULL
      UNION ALL
      SELECT id, 'confirmation', concat_ws(' ', first_name, last_name), created_at
        FROM confirmation WHERE schedule_event_id = e.id AND archived_at IS NULL
      UNION ALL
      SELECT m.id, 'marriage', (
               SELECT string_agg(concat_ws(' ', mp.first_name, mp.last_name), ' & ' ORDER BY mp.role)
               FROM marriage_party mp WHERE mp.marriage_id = m.id
             ), m.created_at
        FROM marriage m WHERE m.schedule_event_id = e.id AND m.archived_at IS NULL
      UNION ALL
      SELECT id, 'death', concat_ws(' ', first_name, last_name), created_at
        FROM death WHERE schedule_event_id = e.id AND archived_at IS NULL
    ) r
  ) rec ON true
`;

const RECURRING_SELECT = `
  SELECT c.*, ${PERSON_NAME} AS assigned_personnel_name
  FROM parish_recurring_commitment c
  LEFT JOIN parish_personnel p ON p.id = c.assigned_to
`;

async function loadRecurring(parishId) {
  const result = await pool.query(
    `${RECURRING_SELECT}
     WHERE c.parish_id = $1
     ORDER BY c.created_at`,
    [parishId]
  );
  return result.rows.map(toRecurring);
}

async function loadCommitment(parishId, id) {
  const result = await pool.query(`${RECURRING_SELECT} WHERE c.parish_id = $1 AND c.id = $2`, [parishId, id]);
  return result.rows[0] ? toRecurring(result.rows[0]) : null;
}

/** Changes for single Masses, by occurrence id. A cleared change falls back to the regular assignment. */
async function loadOverrides(parishId) {
  const result = await pool.query(
    `SELECT o.occurrence_id, o.assigned_to, o.assignee, ${PERSON_NAME} AS assigned_personnel_name
     FROM parish_schedule_override o
     LEFT JOIN parish_personnel p ON p.id = o.assigned_to
     WHERE o.parish_id = $1`,
    [parishId]
  );
  const map = {};
  for (const row of result.rows) {
    const who = assigneeOf(row.assigned_to, row.assigned_personnel_name, row.assignee);
    if (who.assigneeId || who.guest) map[row.occurrence_id] = who;
  }
  return map;
}

async function loadBlocks(parishId) {
  const result = await pool.query(
    `${EVENT_SELECT}
     WHERE e.parish_id = $1 AND e.status <> 'cancelled'
     ORDER BY e.start_datetime`,
    [parishId]
  );
  return result.rows.map(toBlock);
}

async function ensureDefaultMassSchedule(parishId, userId) {
  const existing = await pool.query(
    'SELECT 1 FROM parish_recurring_commitment WHERE parish_id = $1 LIMIT 1',
    [parishId]
  );
  if (existing.rowCount) return;
  for (const item of DEFAULT_MASS) {
    await pool.query(
      `INSERT INTO parish_recurring_commitment
         (parish_id, label, event_type, days, slots, assignee, show_on_overview, created_by)
       VALUES ($1, $2, $3, $4, $5::jsonb, '', true, $6)`,
      [parishId, item.label, item.event_type, item.days, JSON.stringify(item.slots), userId]
    );
  }
}

/**
 * Reads who to assign from a request body: `assigneeId` (someone on the staff list) or `assignee` (a guest's
 * name). Returns { assigneeId, assignee } with `assignee` set only for a guest; nobody is { null, '' }.
 */
function assigneeInput(body = {}) {
  const id = String(body.assigneeId || '').trim();
  if (id) {
    if (!UUID.test(id)) throw httpError(400, 'Choose someone from the staff list.');
    return { assigneeId: id, assignee: '' };
  }
  return { assigneeId: null, assignee: String(body.assignee || '').trim().slice(0, 255) };
}

/** The person must be on this parish's staff list. Returns their name as shown, or the guest's name. */
async function checkAssignee(parishId, { assigneeId, assignee }) {
  if (!assigneeId) return assignee || '';
  const result = await pool.query(
    `SELECT ${PERSON_NAME} AS name FROM parish_personnel p WHERE p.id = $1 AND p.parish_id = $2`,
    [assigneeId, parishId]
  );
  if (!result.rows[0]) throw httpError(400, 'Choose someone from the staff list.');
  return result.rows[0].name;
}

/** Clergy first so priests are easy to find when assigning; everyone carries their role for identification. */
async function listAssignableStaff(parishId) {
  const result = await pool.query(
    `SELECT id, full_name, role_title, honorific, post_nominals, clergy_rank FROM parish_personnel
     WHERE parish_id = $1 AND status = 'active'
     ORDER BY full_name`,
    [parishId]
  );
  return result.rows
    .filter((row) => row.full_name)
    // Clergy from their clergy status (item 4), so a priest who is also a chaplain stays with the priests.
    .map((row) => ({
      id: row.id,
      name: formatPersonName({ honorific: row.honorific, name: row.full_name, postNominals: row.post_nominals }),
      role: row.role_title,
      clergy: isClergyRank(row.clergy_rank),
    }))
    .sort((a, b) => Number(b.clergy) - Number(a.clergy) || a.name.localeCompare(b.name));
}

/** Throws 409 when the new time clashes with an event in the same place or with the same priest. */
async function assertNoConflict(parishId, { date, start, end, assigneeId, assignee, location, excludeId }) {
  const occurrences = await occurrencesForDate(parishId, date);
  const conflict = findConflict(occurrences, start, end, { excludeId, assigneeId, assignee, location });
  if (conflict) throw httpError(409, conflictMessage(conflict));
}

async function occurrencesForDate(parishId, dateStr) {
  const [recurring, blocks, overrides] = await Promise.all([
    loadRecurring(parishId),
    loadBlocks(parishId),
    loadOverrides(parishId),
  ]);
  return getOccurrencesForDate(dateStr, recurring, blocks, overrides);
}

async function occurrencesForMonth(parishId, year, month) {
  const [recurring, blocks, overrides] = await Promise.all([
    loadRecurring(parishId),
    loadBlocks(parishId),
    loadOverrides(parishId),
  ]);
  const result = {};
  const total = daysInMonth(year, month);
  for (let d = 1; d <= total; d += 1) {
    const dateStr = toISO(new Date(year, month, d));
    result[dateStr] = getOccurrencesForDate(dateStr, recurring, blocks, overrides);
  }
  return result;
}

function massScheduleFromCommitments(recurring) {
  const buckets = {
    weekday: new Set(),
    saturday: new Set(),
    sunday: new Set(),
    firstFriday: new Set(),
  };
  for (const rc of recurring.filter((item) => item.type === 'mass')) {
    for (const day of rc.days) {
      for (const slot of rc.slots) {
        if (day === 'Sun') buckets.sunday.add(slot.start);
        else if (day === 'Sat') buckets.saturday.add(slot.start);
        else buckets.weekday.add(slot.start);
        if (day === 'Fri') buckets.firstFriday.add(slot.start);
      }
    }
  }
  const sortTimes = (set) => [...set].sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));
  return [
    { dayType: 'weekday', label: 'Weekdays', times: sortTimes(buckets.weekday) },
    { dayType: 'saturday', label: 'Saturday', times: sortTimes(buckets.saturday) },
    { dayType: 'sunday', label: 'Sunday', times: sortTimes(buckets.sunday) },
    { dayType: 'firstFriday', label: 'First Friday', times: sortTimes(buckets.firstFriday) },
  ];
}

function scheduleLabelForDate(dateStr, schedule) {
  const date = new Date(`${dateStr}T00:00:00`);
  const day = date.getDay();
  const isFirstFriday = day === 5 && date.getDate() <= 7;
  const dayType = isFirstFriday ? 'firstFriday' : day === 0 ? 'sunday' : day === 6 ? 'saturday' : 'weekday';
  return schedule.find((entry) => entry.dayType === dayType)?.label || '';
}

async function createEvent(parishId, userId, input) {
  await checkAssignee(parishId, input);
  const inserted = await pool.query(
    `INSERT INTO event (
       parish_id, event_type, title, description, start_datetime, end_datetime,
       location, status, created_by, assigned_to, assignee_name, source,
       record_status, show_on_overview, marriage_application_id
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'upcoming', $8, $9, $10, $11, $12, $13, $14)
     RETURNING id`,
    [
      parishId,
      input.type,
      input.title,
      input.description || null,
      toTimestamp(input.date, input.start),
      toTimestamp(input.date, input.end),
      input.location || null,
      userId,
      input.assigneeId || null,
      input.assigneeId ? null : input.assignee || null,
      input.source || 'manual',
      // Sacraments wait to be written in the register (C11).
      input.recordStatus || (NEEDS_RECORDING.includes(input.type) ? 'Pending' : null),
      input.showOnOverview !== false,
      input.marriageApplicationId || null,
    ]
  );
  return inserted.rows[0].id;
}

/** Recurring occurrence ids end in "-YYYY-MM-DD-h:mm AM"; event ids are UUIDs. */
function occurrenceDate(occurrenceId) {
  const match = /(\d{4}-\d{2}-\d{2})-\d{1,2}:\d{2} [AP]M$/.exec(occurrenceId);
  return match ? match[1] : null;
}

async function updateEvent(parishId, eventId, input) {
  await checkAssignee(parishId, input);
  await pool.query(
    `UPDATE event
     SET title = $1, event_type = $2, start_datetime = $3, end_datetime = $4, location = $5,
         assigned_to = $6, assignee_name = $7, show_on_overview = $8, updated_at = NOW()
     WHERE id = $9 AND parish_id = $10`,
    [
      input.title,
      input.type,
      toTimestamp(input.date, input.start),
      toTimestamp(input.date, input.end),
      input.location || null,
      input.assigneeId || null,
      input.assigneeId ? null : input.assignee || null,
      input.showOnOverview !== false,
      eventId,
      parishId,
    ]
  );
}

/** `who` is { assigneeId, assignee } from assigneeInput. Returns the name as shown. */
async function assignOccurrence(parishId, occurrenceId, who) {
  const uuid = UUID.test(occurrenceId);
  const name = await checkAssignee(parishId, who);
  if (who.assigneeId || who.assignee) {
    let date = occurrenceDate(occurrenceId);
    if (uuid) {
      const found = await pool.query(
        "SELECT to_char(start_datetime, 'YYYY-MM-DD') AS d FROM event WHERE id = $1 AND parish_id = $2",
        [occurrenceId, parishId]
      );
      date = found.rows[0]?.d || null;
    }
    if (date) {
      const occurrence = (await occurrencesForDate(parishId, date)).find((o) => o.id === occurrenceId);
      if (occurrence) {
        await assertNoConflict(parishId, {
          date,
          start: occurrence.start,
          end: occurrence.end,
          assigneeId: who.assigneeId,
          assignee: who.assignee,
          excludeId: occurrenceId,
        });
      }
    }
  }
  if (uuid) {
    const updated = await pool.query(
      `UPDATE event
       SET assigned_to = $1, assignee_name = $2, updated_at = NOW()
       WHERE id = $3 AND parish_id = $4
       RETURNING id`,
      [who.assigneeId || null, who.assigneeId ? null : who.assignee || null, occurrenceId, parishId]
    );
    if (!updated.rowCount) throw httpError(404, 'Event not found.');
    return name;
  }
  await pool.query(
    `INSERT INTO parish_schedule_override (parish_id, occurrence_id, assigned_to, assignee)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (parish_id, occurrence_id)
     DO UPDATE SET assigned_to = EXCLUDED.assigned_to, assignee = EXCLUDED.assignee`,
    [parishId, occurrenceId, who.assigneeId || null, who.assigneeId ? '' : who.assignee || '']
  );
  return name;
}

module.exports = {
  httpError,
  toRecurring,
  toBlock,
  getOccurrencesForDate,
  loadRecurring,
  loadCommitment,
  loadOverrides,
  loadBlocks,
  ensureDefaultMassSchedule,
  assigneeInput,
  checkAssignee,
  occurrenceDate,
  listAssignableStaff,
  assertNoConflict,
  DEFAULT_LOCATION,
  occurrencesForDate,
  occurrencesForMonth,
  massScheduleFromCommitments,
  scheduleLabelForDate,
  createEvent,
  updateEvent,
  assignOccurrence,
  EVENT_SELECT,
  findConflict,
  conflictMessage,
};
