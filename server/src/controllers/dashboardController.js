const pool = require('../config/db');
const { sendRecordError } = require('../utils/recordFields');
const { ROLES } = require('../constants/roles');
const { FULL_ACCESS, normalizeAccess } = require('../constants/staffAccess');
const schedule = require('../services/scheduleService');

const WEEK_DAYS = 7;
const ACTIVITY_LIMIT = 8;

function localISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function peso(amount) {
  return `₱${Number(amount || 0).toLocaleString('en-PH', { maximumFractionDigits: 2 })}`;
}

function plural(n, one, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

/** "2026-10-24" → "Sat, Oct 24". */
function shortDate(iso) {
  if (!iso) return '';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function massWhen(m) {
  return [shortDate(m.date), m.time].filter(Boolean).join(', ');
}

const SACRAMENT = { baptism: 'Baptism', confirmation: 'Confirmation', marriage: 'Marriage', death: 'Death' };

/** Turns an audit entry into a sentence a parish secretary would write in the log book. */
function describe(row) {
  const m = row.metadata || {};
  const who = row.actor_name || 'Online';
  const subject = row.subject || '';
  switch (row.action) {
    case 'certificate_request.created':
      return { text: `New ${SACRAMENT[m.sacrament] || ''} certificate request`.replace('  ', ' '), detail: subject || 'From the parishioner portal' };
    case 'certificate_request.payment_recorded':
      return { text: `Certificate fee paid · ${peso(m.amount)}`, detail: `${subject ? `${subject} · ` : ''}${m.method === 'gcash' ? 'GCash' : 'At the office'}` };
    case 'certificate_request.linked':
      return { text: 'Request matched to a register entry', detail: subject || `By ${who}` };
    case 'certificate_request.rejected':
      return { text: 'Certificate request declined', detail: m.reason || subject };
    case 'certificate.issued':
      return { text: 'Certificate issued', detail: m.code ? `${m.code} · by ${who}` : `By ${who}` };
    case 'certificate.reprinted':
      return { text: 'Certificate reprinted', detail: `${m.code ? `${m.code} · ` : ''}by ${who}` };
    case 'certificate.spoiled':
      return { text: 'Printed certificate spoiled and voided', detail: `${m.code ? `${m.code} · ` : ''}${m.reason || `by ${who}`}` };
    case 'certificate.released':
      return { text: 'Certificate released', detail: m.releasedTo ? `To ${m.releasedTo}` : `By ${who}` };
    case 'baptism.created':
    case 'confirmation.created':
      return {
        text: `${row.action.startsWith('baptism') ? 'Baptism' : 'Confirmation'} recorded in the register`,
        detail: m.bookNumber ? `Book ${m.bookNumber}, page ${m.pageNumber}, entry ${m.entryNumber} · by ${who}` : `By ${who}`,
      };
    case 'annotation.recorded':
      return { text: 'Annotation added to a baptism record', detail: `By ${who}` };
    case 'marriage_application.created':
      return { text: 'New marriage application', detail: m.groom && m.bride ? `${m.groom} & ${m.bride}` : `By ${who}` };
    case 'mass_intention.requested':
      return { text: 'Mass intention requested', detail: [subject, massWhen(m)].filter(Boolean).join(' · ') };
    case 'mass_intention.booked':
      return { text: 'Mass intention booked at the office', detail: [subject, massWhen(m)].filter(Boolean).join(' · ') };
    case 'mass_intention.donation_received':
      return { text: `Mass intention donation · ${peso(m.amount)}`, detail: subject || 'GCash' };
    case 'donation.received':
      return { text: `Online donation · ${peso(m.amount)}`, detail: subject || 'GCash' };
    case 'donation.recorded':
      return { text: `Donation recorded · ${peso(m.amount)}`, detail: `${m.type || ''} · by ${who}` };
    case 'donation.voided':
      return m.corrected ? null : { text: 'Donation voided', detail: `${m.reason || ''} · by ${who}` };
    case 'donation.corrected':
      return { text: 'Donation corrected', detail: `${m.reason || ''} · by ${who}` };
    case 'schedule.event_created':
      return { text: `Added to the schedule: ${m.title || 'an event'}`, detail: [shortDate(m.date), `by ${who}`].filter(Boolean).join(' · ') };
    case 'personnel.added':
      return { text: `${m.name || 'Someone'} joined the staff list`, detail: m.role || '' };
    default:
      return null;
  }
}

const ACTIVITY_ACTIONS = [
  'certificate_request.created',
  'certificate_request.payment_recorded',
  'certificate_request.linked',
  'certificate_request.rejected',
  'certificate.issued',
  'certificate.released',
  'certificate.reprinted',
  'certificate.spoiled',
  'baptism.created',
  'confirmation.created',
  'annotation.recorded',
  'marriage_application.created',
  'mass_intention.requested',
  'mass_intention.booked',
  'mass_intention.donation_received',
  'donation.received',
  'donation.recorded',
  'donation.voided',
  'donation.corrected',
  'schedule.event_created',
  'personnel.added',
];

// E1: which area each activity line belongs to. Lines with no area (a new staff member) show to everyone.
function activityArea(action) {
  if (action.startsWith('certificate')) return 'certificates';
  if (action.startsWith('baptism') || action.startsWith('confirmation') || action.startsWith('annotation')) return 'registers';
  if (action.startsWith('marriage_application')) return 'marriage';
  if (action.startsWith('mass_intention')) return 'intentions';
  if (action.startsWith('donation')) return 'donations';
  if (action.startsWith('schedule')) return 'schedule';
  return null;
}

/** What the signed-in user may see here: staff by their area access, everyone else everything. */
async function loadViewerAccess(req) {
  if (req.user.role !== ROLES.PARISH_STAFF) return { ...FULL_ACCESS };
  const result = await pool.query('SELECT staff_access FROM app_user WHERE id = $1', [req.user.id]);
  return normalizeAccess(result.rows[0] && result.rows[0].staff_access);
}

async function loadActivity(parishId, actions = ACTIVITY_ACTIONS) {
  const result = await pool.query(
    `SELECT a.id, a.action, a.metadata, a.created_at,
            NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), '') AS actor_name,
            COALESCE(
              r.subject_details->>'subjectName',
              CASE WHEN a.entity_type = 'mass_intention' THEN i.intention_for END,
              d.donor_name
            ) AS subject
     FROM audit_log a
     LEFT JOIN app_user u ON u.id = a.actor_id
     LEFT JOIN certificate_request r ON a.entity_type = 'certificate_request' AND r.id = a.entity_id
     LEFT JOIN mass_intention i ON a.entity_type = 'mass_intention' AND i.id = a.entity_id
     LEFT JOIN donation d ON a.entity_type = 'donation' AND d.id = a.entity_id
     WHERE a.parish_id = $1 AND a.action = ANY($2)
     ORDER BY a.created_at DESC
     LIMIT $3`,
    [parishId, actions, ACTIVITY_LIMIT * 2]
  );
  return result.rows
    .map((row) => {
      const line = describe(row);
      return line && { id: row.id, ...line, at: new Date(row.created_at).toISOString() };
    })
    .filter(Boolean)
    .slice(0, ACTIVITY_LIMIT);
}

async function donationTotal(parishId, from, to) {
  const result = await pool.query(
    `SELECT COALESCE(SUM(amount), 0)::float AS total FROM (
       SELECT d.amount
       FROM donation d
       LEFT JOIN payment p ON p.donation_id = d.id
       WHERE d.parish_id = $1 AND (p.id IS NULL OR p.status = 'paid') AND d.voided_at IS NULL
         AND d.clearing_status = 'cleared'
         AND d.donation_date >= $2 AND d.donation_date < $3
       UNION ALL
       SELECT p.amount_due
       FROM payment p
       JOIN mass_intention i ON i.id = p.mass_intention_id
       WHERE i.parish_id = $1 AND p.status = 'paid'
         AND p.paid_at >= $2 AND p.paid_at < $3
     ) gifts`,
    [parishId, from, to]
  );
  return result.rows[0].total;
}

/** Everything the parish office needs at a glance, from live data. */
async function getDashboard(req, res) {
  try {
    const parishId = req.parishId;
    await schedule.ensureDefaultMassSchedule(parishId, req.user.id);
    // E1: a staff member only sees counts, tasks and activity from areas they can at least view.
    const access = await loadViewerAccess(req);
    const can = (area) => access[area] !== 'off';
    const zero = Promise.resolve(0);
    const empty = Promise.resolve({ rows: [] });

    const now = new Date();
    const today = localISO(now);
    const weekEnd = localISO(addDays(now, WEEK_DAYS));
    const monthStart = localISO(new Date(now.getFullYear(), now.getMonth(), 1));
    const nextMonthStart = localISO(new Date(now.getFullYear(), now.getMonth() + 1, 1));
    const lastMonthStart = localISO(new Date(now.getFullYear(), now.getMonth() - 1, 1));

    const [requests, intentions, pendingRecords, donationsThisMonth, donationsLastMonth, activity] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'pending')::int AS to_review,
           COUNT(*) FILTER (WHERE status = 'awaiting_payment')::int AS awaiting_payment,
           COUNT(*) FILTER (WHERE status = 'ready')::int AS ready,
           COUNT(*) FILTER (WHERE status = 'released' AND updated_at >= $2 AND updated_at < $3)::int AS released_this_month,
           COUNT(*) FILTER (WHERE status = 'released' AND updated_at >= $4 AND updated_at < $2)::int AS released_last_month
         FROM certificate_request WHERE parish_id = $1`,
        [parishId, monthStart, nextMonthStart, lastMonthStart]
      ),
      can('intentions')
        ? pool.query(
            `SELECT schedule_date::text AS date, schedule_time AS time, status
             FROM mass_intention
             WHERE parish_id = $1 AND schedule_date >= $2 AND schedule_date < $3
               AND status IN ('pending', 'confirmed', 'said')`,
            [parishId, today, weekEnd]
          )
        : empty,
      can('schedule')
        ? pool.query(
            `SELECT COUNT(*)::int AS n FROM event
             WHERE parish_id = $1 AND record_status = 'Pending' AND status <> 'cancelled'
               AND start_datetime < (NOW() AT TIME ZONE 'Asia/Manila')`,
            [parishId]
          )
        : Promise.resolve({ rows: [{ n: 0 }] }),
      can('donations') ? donationTotal(parishId, monthStart, nextMonthStart) : zero,
      can('donations') ? donationTotal(parishId, lastMonthStart, monthStart) : zero,
      loadActivity(
        parishId,
        ACTIVITY_ACTIONS.filter((action) => {
          const area = activityArea(action);
          return !area || can(area);
        })
      ),
    ]);
    if (!can('certificates')) {
      Object.assign(requests.rows[0], { to_review: 0, awaiting_payment: 0, ready: 0, released_this_month: 0, released_last_month: 0 });
    }

    // Intentions per Mass, keyed "date time", for the Mass rows in today's and this week's lists.
    const intentionsByMass = {};
    let intentionsUnconfirmed = 0;
    for (const row of intentions.rows) {
      const key = `${row.date} ${row.time}`;
      intentionsByMass[key] = (intentionsByMass[key] || 0) + 1;
      if (row.status === 'pending') intentionsUnconfirmed += 1;
    }

    const [recurring, blocks, overrides] = await Promise.all([
      schedule.loadRecurring(parishId),
      schedule.loadBlocks(parishId),
      schedule.loadOverrides(parishId),
    ]);
    const toItem = (o) => ({
      id: o.id,
      start: o.start,
      end: o.end,
      title: o.title,
      type: o.type,
      location: o.location || '',
      assignee: o.assignee || '',
      recordStatus: o.recordStatus || undefined,
      intentions: o.type === 'mass' ? intentionsByMass[`${o.date} ${o.start}`] || 0 : undefined,
    });

    const week = [];
    let unassigned = 0;
    for (let i = 0; i < WEEK_DAYS; i += 1) {
      const date = localISO(addDays(now, i));
      // Without the schedule area the days stay (Today's tasks needs today's date) but carry no events.
      const occurrences = can('schedule') ? schedule.getOccurrencesForDate(date, recurring, blocks, overrides) : [];
      // Events only: the parish priest settles who says the regular Masses, so the office doesn't assign them.
      unassigned += occurrences.filter((o) => o.type !== 'mass' && !o.assignee).length;
      week.push({ date, items: occurrences.map(toItem) });
    }

    const r = requests.rows[0];
    const attention = [];
    if (r.to_review > 0) {
      attention.push({
        id: 'review',
        bold: plural(r.to_review, 'certificate request'),
        rest: r.to_review === 1 ? ' is waiting for review.' : ' are waiting for review.',
        href: 'requests',
        cta: 'Review requests',
      });
    }
    if (r.ready > 0) {
      attention.push({
        id: 'ready',
        bold: plural(r.ready, 'certificate'),
        rest: r.ready === 1 ? ' is ready to release.' : ' are ready to release.',
        href: 'requests',
        cta: 'Open requests',
      });
    }
    if (intentionsUnconfirmed > 0) {
      attention.push({
        id: 'intentions',
        bold: plural(intentionsUnconfirmed, 'Mass intention'),
        rest: ' requested online for this week still need the office to schedule them.',
        href: 'mass-intentions',
        cta: 'Review intentions',
      });
    }
    if (pendingRecords.rows[0].n > 0) {
      attention.push({
        id: 'records',
        bold: plural(pendingRecords.rows[0].n, 'past event'),
        rest: pendingRecords.rows[0].n === 1 ? ' still needs to be recorded in the register.' : ' still need to be recorded in the register.',
        href: 'schedule?needs=record',
        cta: 'See the list',
      });
    }
    if (unassigned > 0) {
      attention.push({
        id: 'unassigned',
        bold: plural(unassigned, 'event'),
        rest: unassigned === 1 ? ' in the next 7 days has no priest or staff assigned.' : ' in the next 7 days have no priest or staff assigned.',
        href: 'schedule',
        cta: 'Assign',
      });
    }

    res.json({
      stats: {
        toReview: r.to_review,
        awaitingPayment: r.awaiting_payment,
        ready: r.ready,
        releasedThisMonth: r.released_this_month,
        releasedLastMonth: r.released_last_month,
        intentionsThisWeek: intentions.rows.length,
        intentionsUnconfirmed,
        unassigned,
        pendingRecords: pendingRecords.rows[0].n,
        donationsThisMonth,
        donationsLastMonth,
      },
      attention,
      week,
      activity,
      access,
    });
  } catch (err) {
    sendRecordError(res, err);
  }
}

module.exports = { getDashboard };
