const pool = require('../config/db');
const { sendRecordError } = require('../utils/recordFields');

/** "2026-03-01" or nothing; anything else is ignored rather than passed to SQL. */
function dateParam(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function rangeOf(req) {
  return [dateParam(req.query.from), dateParam(req.query.to)];
}

/** Every month from the first key to the last, so a quiet month shows as zero instead of vanishing. */
function monthSpan(keys) {
  if (keys.length === 0) return [];
  const sorted = [...keys].sort();
  let [year, month] = sorted[0].split('-').map(Number);
  const [lastYear, lastMonth] = sorted[sorted.length - 1].split('-').map(Number);
  const months = [];
  while (year < lastYear || (year === lastYear && month <= lastMonth)) {
    months.push(`${year}-${String(month).padStart(2, '0')}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
}

/**
 * Register entries a year, by the date the sacrament took place. Archived entries are left out. Only years
 * with entries are listed: old books leave long empty stretches that would fill the table with zeros.
 */
async function getSacramentReport(req, res) {
  try {
    const [from, to] = rangeOf(req);
    const result = await pool.query(
      `SELECT kind, EXTRACT(YEAR FROM day)::int AS year, COUNT(*)::int AS n
       FROM (
         SELECT 'baptism' AS kind, date_of_baptism AS day FROM baptism WHERE parish_id = $1 AND archived_at IS NULL
         UNION ALL
         SELECT 'confirmation', date_of_confirmation FROM confirmation WHERE parish_id = $1 AND archived_at IS NULL
         UNION ALL
         SELECT 'marriage', date_of_marriage FROM marriage WHERE parish_id = $1 AND archived_at IS NULL
         UNION ALL
         SELECT 'death', date_of_death FROM death WHERE parish_id = $1 AND archived_at IS NULL
       ) entries
       WHERE ($2::date IS NULL OR day >= $2::date) AND ($3::date IS NULL OR day <= $3::date)
       GROUP BY 1, 2`,
      [req.parishId, from, to]
    );
    const byYear = new Map();
    for (const row of result.rows) {
      if (!byYear.has(row.year)) byYear.set(row.year, { year: row.year, baptism: 0, confirmation: 0, marriage: 0, death: 0 });
      byYear.get(row.year)[row.kind] = row.n;
    }
    res.json({ rows: [...byYear.values()].sort((a, b) => a.year - b.year) });
  } catch (err) {
    sendRecordError(res, err);
  }
}

/** Certificate requests a month, by the day they came in. */
async function getCertificateReport(req, res) {
  try {
    const [from, to] = rangeOf(req);
    const result = await pool.query(
      `SELECT to_char(created_at, 'YYYY-MM') AS month, status::text AS status, record_type, request_type::text AS channel,
              COUNT(*)::int AS n
       FROM certificate_request
       WHERE parish_id = $1
         AND ($2::date IS NULL OR created_at >= $2::date)
         AND ($3::date IS NULL OR created_at < $3::date + 1)
       GROUP BY 1, 2, 3, 4`,
      [req.parishId, from, to]
    );
    const byMonth = new Map(
      monthSpan(result.rows.map((row) => row.month)).map((month) => [
        month,
        {
          month,
          pending: 0,
          processing: 0,
          released: 0,
          rejected: 0,
          baptism: 0,
          confirmation: 0,
          marriage: 0,
          death: 0,
          online: 0,
          walkin: 0,
        },
      ])
    );
    for (const row of result.rows) {
      const bucket = byMonth.get(row.month);
      // Waiting on payment still sits with the office; "ready" is processed but not yet handed over.
      const stage =
        row.status === 'released' ? 'released'
          : row.status === 'rejected' ? 'rejected'
            : row.status === 'processing' || row.status === 'ready' ? 'processing'
              : 'pending';
      bucket[stage] += row.n;
      if (row.record_type in bucket) bucket[row.record_type] += row.n;
      bucket[row.channel === 'walkin' ? 'walkin' : 'online'] += row.n;
    }
    res.json({ rows: [...byMonth.values()] });
  } catch (err) {
    sendRecordError(res, err);
  }
}

/** Gifts a month by how they were given, plus the total for each purpose. Unpaid online gifts are left out. */
async function getDonationReport(req, res) {
  try {
    const [from, to] = rangeOf(req);
    const result = await pool.query(
      `SELECT to_char(d.donation_date, 'YYYY-MM') AS month,
              LOWER(d.donation_type) AS type,
              COALESCE(NULLIF(TRIM(d.purpose), ''), 'Unspecified') AS purpose,
              SUM(d.amount)::float AS amount
       FROM donation d
       LEFT JOIN payment p ON p.donation_id = d.id
       WHERE d.parish_id = $1 AND (p.id IS NULL OR p.status = 'paid') AND d.voided_at IS NULL
         AND ($2::date IS NULL OR d.donation_date >= $2::date)
         AND ($3::date IS NULL OR d.donation_date <= $3::date)
       GROUP BY 1, 2, 3`,
      [req.parishId, from, to]
    );
    const byMonth = new Map(
      monthSpan(result.rows.map((row) => row.month)).map((month) => [month, { month, amount: 0, cash: 0, gcash: 0 }])
    );
    const purposes = new Map();
    for (const row of result.rows) {
      const bucket = byMonth.get(row.month);
      bucket.amount += row.amount;
      bucket[row.type === 'gcash' ? 'gcash' : 'cash'] += row.amount;
      purposes.set(row.purpose, (purposes.get(row.purpose) || 0) + row.amount);
    }
    res.json({
      rows: [...byMonth.values()],
      purposes: [...purposes.entries()]
        .map(([purpose, amount]) => ({ purpose, amount }))
        .sort((a, b) => b.amount - a.amount),
    });
  } catch (err) {
    sendRecordError(res, err);
  }
}

/** Mass intentions a month, by the Mass they are booked on. Offerings count once paid. */
async function getIntentionReport(req, res) {
  try {
    const [from, to] = rangeOf(req);
    const result = await pool.query(
      `SELECT to_char(schedule_date, 'YYYY-MM') AS month,
              COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
              COUNT(*) FILTER (WHERE status = 'confirmed')::int AS confirmed,
              COUNT(*) FILTER (WHERE status = 'said')::int AS said,
              COALESCE(SUM(offering) FILTER (WHERE payment_status = 'paid'), 0)::float AS offering
       FROM mass_intention
       WHERE parish_id = $1 AND status IN ('pending', 'confirmed', 'said')
         AND ($2::date IS NULL OR schedule_date >= $2::date)
         AND ($3::date IS NULL OR schedule_date <= $3::date)
       GROUP BY 1`,
      [req.parishId, from, to]
    );
    const found = new Map(result.rows.map((row) => [row.month, row]));
    res.json({
      rows: monthSpan([...found.keys()]).map(
        (month) => found.get(month) || { month, pending: 0, confirmed: 0, said: 0, offering: 0 }
      ),
    });
  } catch (err) {
    sendRecordError(res, err);
  }
}

module.exports = { getSacramentReport, getCertificateReport, getDonationReport, getIntentionReport };
