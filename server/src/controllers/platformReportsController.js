// Super admin reports: how parishes are using HolyApp between two dates, from the tables that already exist.
// Dates follow the calendar in the Philippines (UTC+8, no daylight saving); stored times are UTC.

const pool = require('../config/db');

const DAY_MS = 86_400_000;
const OFFICE_ROLES = `('parish_admin', 'parish_staff')`;
const OPEN_STATUSES = `('pending', 'processing', 'awaiting_payment', 'ready')`;
/** The fewest online requests worth giving a typical wait for. */
const MIN_WAIT_SAMPLE = 5;
/** Up to this many days the chart groups by week; up to two years, by month; beyond that, by year. */
const WEEKLY_UP_TO_DAYS = 62;
const MONTHLY_UP_TO_DAYS = 731;

/** A stored UTC time, read as Manila wall-clock time. */
function ph(column) {
  return `((${column} AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Manila')`;
}

/** `column` falls in [$a, $b); either end may be null for no limit. */
function inRange(column, a, b) {
  return `($${a}::timestamp IS NULL OR ${ph(column)} >= $${a}::timestamp)
      AND ($${b}::timestamp IS NULL OR ${ph(column)} < $${b}::timestamp)`;
}

/** Register entries still in the books, from all four registers. */
const RECORDS = `
  SELECT parish_id, created_at FROM baptism WHERE archived_at IS NULL
  UNION ALL SELECT parish_id, created_at FROM confirmation WHERE archived_at IS NULL
  UNION ALL SELECT parish_id, created_at FROM marriage WHERE archived_at IS NULL
  UNION ALL SELECT parish_id, created_at FROM death WHERE archived_at IS NULL`;

/** Things parish office accounts did (not super admins, not parishioners). */
const OFFICE_ACTIVITY = `
  SELECT l.parish_id, l.created_at
  FROM audit_log l
  JOIN app_user u ON u.id = l.actor_id
  WHERE l.parish_id IS NOT NULL AND u.role::text IN ${OFFICE_ROLES}`;

/** Today's date in Manila, YYYY-MM-DD. */
function manilaToday() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

function isDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function addDays(day, n) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

function daysBetween(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

function unitFor(days) {
  if (days <= WEEKLY_UP_TO_DAYS) return 'week';
  if (days <= MONTHLY_UP_TO_DAYS) return 'month';
  return 'year';
}

/**
 * The days a report covers, both ends included. Either end may be left open. With both ends given, the report
 * also compares with the same number of days just before.
 */
function rangeBounds(fromDay, toDay) {
  let from = fromDay || null;
  let to = toDay || null;
  if (from && to && from > to) [from, to] = [to, from];
  const bounds = {
    from,
    to,
    start: from ? `${from} 00:00:00` : null,
    end: to ? `${addDays(to, 1)} 00:00:00` : null,
    previous: null,
  };
  if (from && to) {
    const days = daysBetween(from, to) + 1;
    const prevFrom = addDays(from, -days);
    bounds.previous = {
      from: prevFrom,
      to: addDays(from, -1),
      days,
      start: `${prevFrom} 00:00:00`,
      end: bounds.start,
    };
  }
  return bounds;
}

async function figures(start, end) {
  const result = await pool.query(
    `WITH recs AS (${RECORDS}), office AS (${OFFICE_ACTIVITY})
     SELECT
       (SELECT COUNT(*)::int FROM recs WHERE ${inRange('created_at', 1, 2)}) AS records,
       (SELECT COUNT(*)::int FROM certificate WHERE void_kind IS NULL AND ${inRange('issued_at', 1, 2)}) AS certificates,
       (SELECT COUNT(*)::int FROM certificate_request WHERE ${inRange('created_at', 1, 2)}) AS requests,
       (SELECT COUNT(DISTINCT o.parish_id)::int FROM office o JOIN parish p ON p.id = o.parish_id
         WHERE ${inRange('o.created_at', 1, 2)}) AS parishes_in_use`,
    [start, end]
  );
  const row = result.rows[0];
  return {
    records: row.records,
    certificates: row.certificates,
    requests: row.requests,
    parishesInUse: row.parishes_in_use,
  };
}

/** The first day with any record or certificate, or null when there are none. */
async function firstDay(end) {
  const result = await pool.query(
    `WITH recs AS (${RECORDS})
     SELECT to_char(MIN(t), 'YYYY-MM-DD') AS first
     FROM (SELECT ${ph('created_at')} AS t FROM recs
           UNION ALL SELECT ${ph('issued_at')} FROM certificate WHERE void_kind IS NULL) x
     WHERE $1::timestamp IS NULL OR t < $1::timestamp`,
    [end]
  );
  return result.rows[0].first;
}

/**
 * Bars for the chart. Weeks run seven days from the first day of the range; months and years follow the
 * calendar, with the first and last cut to the range.
 */
async function buckets(bounds) {
  const chartTo = bounds.to || manilaToday();
  const chartFrom = bounds.from || (await firstDay(bounds.end)) || chartTo;
  const unit = unitFor(daysBetween(chartFrom, chartTo) + 1);
  const start = `${chartFrom} 00:00:00`;
  const end = `${addDays(chartTo, 1)} 00:00:00`;
  const first = unit === 'week' ? '$1::timestamp' : `date_trunc('${unit}', $1::timestamp)`;
  const step = unit === 'week' ? `interval '7 days'` : `interval '1 ${unit}'`;
  const result = await pool.query(
    `WITH recs AS (${RECORDS}),
     b AS (SELECT generate_series(${first}, $2::timestamp - interval '1 second', ${step}) AS s)
     SELECT to_char(GREATEST(b.s, $1::timestamp), 'YYYY-MM-DD') AS start,
       to_char(LEAST(b.s + ${step}, $2::timestamp) - interval '1 day', 'YYYY-MM-DD') AS "end",
       (SELECT COUNT(*)::int FROM recs
         WHERE ${ph('created_at')} >= b.s AND ${ph('created_at')} < b.s + ${step}
           AND ${inRange('created_at', 1, 2)}) AS records,
       (SELECT COUNT(*)::int FROM certificate
         WHERE void_kind IS NULL AND ${ph('issued_at')} >= b.s AND ${ph('issued_at')} < b.s + ${step}
           AND ${inRange('issued_at', 1, 2)}) AS certificates
     FROM b ORDER BY b.s`,
    [start, end]
  );
  return { unit, buckets: result.rows };
}

async function outcomes(start, end) {
  const counts = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE status::text = 'released')::int AS released,
       COUNT(*) FILTER (WHERE status::text = 'rejected')::int AS rejected,
       COUNT(*) FILTER (WHERE status::text IN ${OPEN_STATUSES})::int AS open
     FROM certificate_request WHERE ${inRange('created_at', 1, 2)}`,
    [start, end]
  );
  // Online requests only: walk-ins are issued on the spot and would make the wait look shorter than it is.
  const wait = await pool.query(
    `SELECT COUNT(*)::int AS n,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (c.issued_at - q.created_at)) / 86400) AS median
     FROM certificate_request q
     JOIN certificate c ON c.id = q.certificate_id
     WHERE q.status::text = 'released' AND q.request_type::text = 'online'
       AND c.issued_at >= q.created_at AND ${inRange('q.created_at', 1, 2)}`,
    [start, end]
  );
  const { n, median } = wait.rows[0];
  return {
    ...counts.rows[0],
    onlineReleased: n,
    typicalDays: n >= MIN_WAIT_SAMPLE && median !== null ? Math.round(Number(median) * 10) / 10 : null,
  };
}

async function byParish(start, end) {
  const result = await pool.query(
    `WITH recs AS (${RECORDS}), office AS (${OFFICE_ACTIVITY})
     SELECT p.id, p.name, p.address,
       (SELECT COUNT(*)::int FROM recs r WHERE r.parish_id = p.id AND ${inRange('r.created_at', 1, 2)}) AS records,
       (SELECT COUNT(*)::int FROM certificate c
         WHERE c.parish_id = p.id AND c.void_kind IS NULL AND ${inRange('c.issued_at', 1, 2)}) AS certificates,
       (SELECT COUNT(*)::int FROM certificate_request q
         WHERE q.parish_id = p.id AND q.status::text IN ${OPEN_STATUSES} AND ${inRange('q.created_at', 1, 2)}) AS open_requests,
       (SELECT MAX(o.created_at) FROM office o WHERE o.parish_id = p.id) AS last_activity,
       EXISTS (SELECT 1 FROM office o WHERE o.parish_id = p.id AND ${inRange('o.created_at', 1, 2)}) AS active_in_period,
       EXISTS (SELECT 1 FROM app_user a WHERE a.parish_id = p.id AND a.role::text = 'parish_admin') AS has_admin
     FROM parish p
     ORDER BY p.name`,
    [start, end]
  );
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    address: row.address,
    records: row.records,
    certificates: row.certificates,
    openRequests: row.open_requests,
    lastActivity: row.last_activity ? new Date(row.last_activity).toISOString() : null,
    activeInPeriod: row.active_in_period,
    hasAdmin: row.has_admin,
  }));
}

async function reports(req, res) {
  const from = String(req.query.from || '');
  const to = String(req.query.to || '');
  if ((from && !isDay(from)) || (to && !isDay(to))) {
    return res.status(400).json({ error: 'Dates must look like 2026-11-12.' });
  }
  try {
    const bounds = rangeBounds(from, to);
    const [current, previous, chart, requestOutcomes, parishes] = await Promise.all([
      figures(bounds.start, bounds.end),
      bounds.previous ? figures(bounds.previous.start, bounds.previous.end) : null,
      buckets(bounds),
      outcomes(bounds.start, bounds.end),
      byParish(bounds.start, bounds.end),
    ]);
    return res.json({
      report: {
        from: bounds.from,
        to: bounds.to,
        parishCount: parishes.length,
        figures: current,
        previous,
        previousRange: bounds.previous
          ? { from: bounds.previous.from, to: bounds.previous.to, days: bounds.previous.days }
          : null,
        unit: chart.unit,
        buckets: chart.buckets,
        outcomes: requestOutcomes,
        parishes,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { reports, rangeBounds };
