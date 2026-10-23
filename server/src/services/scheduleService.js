const pool = require('../config/db');
const { isClergy } = require('../constants/personnelRoles');
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

function toRecurring(row) {
  return {
    id: row.id,
    label: row.label,
    type: row.event_type,
    days: row.days || [],
    slots: Array.isArray(row.slots) ? row.slots : [],
    assignee: row.assignee || '',
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
    assignee: row.assignee_name || row.assigned_personnel_name || '',
    location: row.location || '',
    recordStatus: row.record_status || undefined,
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
      occurrences.push({
        id: occId,
        date: dateStr,
        start: slot.start,
        end: slot.end,
        title: rc.label,
        type: rc.type,
        source: 'recurring',
        assignee: overrides[occId] || rc.assignee || '',
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
         p.full_name AS assigned_personnel_name
  FROM event e
  LEFT JOIN parish_personnel p ON p.id = e.assigned_to
`;

async function loadRecurring(parishId) {
  const result = await pool.query(
    `SELECT * FROM parish_recurring_commitment
     WHERE parish_id = $1
     ORDER BY created_at`,
    [parishId]
  );
  return result.rows.map(toRecurring);
}

async function loadOverrides(parishId) {
  const result = await pool.query(
    `SELECT occurrence_id, assignee FROM parish_schedule_override WHERE parish_id = $1`,
    [parishId]
  );
  const map = {};
  for (const row of result.rows) map[row.occurrence_id] = row.assignee || '';
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

async function resolvePersonnelId(parishId, name) {
  const text = String(name || '').trim();
  if (!text) return null;
  const result = await pool.query(
    `SELECT id FROM parish_personnel
     WHERE parish_id = $1 AND lower(full_name) = lower($2)
     LIMIT 1`,
    [parishId, text]
  );
  return result.rows[0]?.id || null;
}

/** Clergy first so priests are easy to find when assigning; everyone carries their role for identification. */
async function listAssignableStaff(parishId) {
  const result = await pool.query(
    `SELECT id, full_name, role_title FROM parish_personnel
     WHERE parish_id = $1 AND status = 'active'
     ORDER BY full_name`,
    [parishId]
  );
  return result.rows
    .filter((row) => row.full_name)
    .map((row) => ({ id: row.id, name: row.full_name, role: row.role_title, clergy: isClergy(row.role_title) }))
    .sort((a, b) => Number(b.clergy) - Number(a.clergy) || a.name.localeCompare(b.name));
}

/** Throws 409 when the new time clashes with an event in the same place or with the same priest. */
async function assertNoConflict(parishId, { date, start, end, assignee, location, excludeId }) {
  const occurrences = await occurrencesForDate(parishId, date);
  const conflict = findConflict(occurrences, start, end, { excludeId, assignee, location });
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
  const assignedTo = await resolvePersonnelId(parishId, input.assignee);
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
      assignedTo,
      input.assignee || '',
      input.source || 'manual',
      input.recordStatus || null,
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

async function assignOccurrence(parishId, occurrenceId, assignee) {
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(occurrenceId);
  if (assignee) {
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
          assignee,
          excludeId: occurrenceId,
        });
      }
    }
  }
  const assignedTo = await resolvePersonnelId(parishId, assignee);
  if (uuid) {
    const updated = await pool.query(
      `UPDATE event
       SET assigned_to = $1, assignee_name = $2, updated_at = NOW()
       WHERE id = $3 AND parish_id = $4
       RETURNING id`,
      [assignedTo, assignee || '', occurrenceId, parishId]
    );
    if (!updated.rowCount) throw httpError(404, 'Event not found.');
    return;
  }
  await pool.query(
    `INSERT INTO parish_schedule_override (parish_id, occurrence_id, assignee)
     VALUES ($1, $2, $3)
     ON CONFLICT (parish_id, occurrence_id)
     DO UPDATE SET assignee = EXCLUDED.assignee`,
    [parishId, occurrenceId, assignee || '']
  );
}

module.exports = {
  httpError,
  toRecurring,
  toBlock,
  getOccurrencesForDate,
  loadRecurring,
  loadOverrides,
  loadBlocks,
  ensureDefaultMassSchedule,
  resolvePersonnelId,
  listAssignableStaff,
  assertNoConflict,
  DEFAULT_LOCATION,
  occurrencesForDate,
  occurrencesForMonth,
  massScheduleFromCommitments,
  scheduleLabelForDate,
  createEvent,
  assignOccurrence,
  EVENT_SELECT,
  findConflict,
  conflictMessage,
};
