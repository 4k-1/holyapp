// A4: what the office did on one day, for the whole office or one staff member. Read-only: every
// figure is worked out from the records each time, so nothing here is saved.

const pool = require('../config/db');
const { decrypt } = require('../utils/fieldCrypto');
const { sendRecordError } = require('../utils/recordFields');

const RECORD_PATHS = { baptism: 'baptismal', confirmation: 'confirmation', marriage: 'marriage', death: 'death' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The Philippine day a stored (UTC) timestamp falls on. */
const localDay = (column) => `((${column} AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Manila')::date`;
const fullName = (alias) => `NULLIF(trim(concat_ws(' ', ${alias}.first_name, ${alias}.last_name)), '')`;

function dayParam(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

/** "Cash", "GCash", or anything else an office gift can be paid with (cheque, bank transfer). */
function methodBucket(method) {
  const m = String(method || '').toLowerCase();
  if (m === 'cash') return 'cash';
  if (m === 'gcash') return 'gcash';
  return 'other';
}

const amountOf = (value) => (value == null ? null : Number(value));

async function getDaySummary(req, res) {
  try {
    const parishId = req.parishId;
    const day =
      dayParam(req.query.date) ||
      (await pool.query(`SELECT to_char((NOW() AT TIME ZONE 'Asia/Manila')::date, 'YYYY-MM-DD') AS d`)).rows[0].d;
    const staffId = typeof req.query.staffId === 'string' && UUID.test(req.query.staffId) ? req.query.staffId : null;

    const staff = await pool.query(
      `SELECT id, ${fullName('u')} AS name, role
       FROM app_user u
       WHERE parish_id = $1 AND role IN ('parish_admin', 'parish_staff')
       ORDER BY first_name, last_name`,
      [parishId]
    );
    if (staffId && !staff.rows.some((row) => row.id === staffId)) {
      return res.status(404).json({ error: 'That staff member is not in this parish.' });
    }

    const [copies, reprints, spoiled, payments, gifts] = await Promise.all([
      pool.query(
        `SELECT c.id, c.certificate_code, c.holder_name, c.record_type, c.record_id, c.issued_at,
                c.status::text AS status, c.void_kind, c.print_confirmed_at,
                ${fullName('u')} AS issued_by_name,
                r.request_type::text AS request_type, r.delivery_method,
                p.payment_type::text AS payment_type, p.status::text AS payment_status,
                p.amount_due, p.receipt_number
         FROM certificate c
         LEFT JOIN app_user u ON u.id = c.issued_by
         LEFT JOIN LATERAL (
           SELECT * FROM certificate_request WHERE certificate_id = c.id ORDER BY created_at DESC LIMIT 1
         ) r ON TRUE
         LEFT JOIN LATERAL (
           SELECT * FROM payment WHERE certificate_request_id = r.id ORDER BY created_at DESC LIMIT 1
         ) p ON TRUE
         WHERE c.parish_id = $1 AND ${localDay('c.issued_at')} = $2::date
           AND ($3::uuid IS NULL OR c.issued_by = $3)
         ORDER BY c.issued_at`,
        [parishId, day, staffId]
      ),
      pool.query(
        `SELECT cr.id, cr.reason, cr.note, cr.printed_at, c.certificate_code, c.holder_name,
                ${fullName('u')} AS by_name
         FROM certificate_reprint cr
         JOIN certificate c ON c.id = cr.certificate_id
         LEFT JOIN app_user u ON u.id = cr.printed_by
         WHERE cr.parish_id = $1 AND ${localDay('cr.printed_at')} = $2::date
           AND ($3::uuid IS NULL OR cr.printed_by = $3)
         ORDER BY cr.printed_at`,
        [parishId, day, staffId]
      ),
      pool.query(
        `SELECT c.id, c.certificate_code, c.holder_name, c.invalidated_at, c.invalidation_reason,
                ${fullName('u')} AS by_name
         FROM certificate c
         LEFT JOIN app_user u ON u.id = c.invalidated_by
         WHERE c.parish_id = $1 AND c.void_kind = 'spoiled' AND ${localDay('c.invalidated_at')} = $2::date
           AND ($3::uuid IS NULL OR c.invalidated_by = $3)
         ORDER BY c.invalidated_at`,
        [parishId, day, staffId]
      ),
      // Paid certificate fees, Mass offerings and online gifts. Only office cash has a staff collector;
      // for GCash, collected_by holds the paying parishioner, so a staff filter leaves GCash out.
      pool.query(
        `SELECT p.id, p.payment_type::text AS method, p.amount_due, p.paid_at,
                CASE WHEN r.id IS NOT NULL THEN 'certificate'
                     WHEN mi.id IS NOT NULL THEN 'intention'
                     ELSE 'donation' END AS kind,
                COALESCE(p.receipt_number, mi.reference_no, d.receipt_no) AS receipt,
                c.certificate_code,
                COALESCE(c.holder_name, r.subject_details->>'subjectName', mi.requester_name, d.donor_name) AS name,
                CASE WHEN p.payment_type = 'cash' THEN ${fullName('u')} END AS by_name
         FROM payment p
         LEFT JOIN certificate_request r ON r.id = p.certificate_request_id
         LEFT JOIN certificate c ON c.id = r.certificate_id
         LEFT JOIN mass_intention mi ON mi.id = p.mass_intention_id
         LEFT JOIN donation d ON d.id = p.donation_id
         LEFT JOIN app_user u ON u.id = p.collected_by
         WHERE p.status = 'paid'
           AND COALESCE(r.parish_id, mi.parish_id, d.parish_id) = $1
           AND ${localDay('p.paid_at')} = $2::date
           AND (d.id IS NULL OR d.voided_at IS NULL)
           AND ($3::uuid IS NULL OR (p.payment_type = 'cash' AND p.collected_by = $3))
         ORDER BY p.paid_at`,
        [parishId, day, staffId]
      ),
      // Gifts written down at the office (no online payment), by the day they were entered.
      pool.query(
        `SELECT d.id, d.donation_type AS method, d.amount, d.created_at, d.receipt_no, d.donor_name,
                d.clearing_status, d.reference,
                ${fullName('u')} AS by_name
         FROM donation d
         LEFT JOIN app_user u ON u.id = d.recorded_by
         WHERE d.parish_id = $1 AND d.voided_at IS NULL
           AND NOT EXISTS (SELECT 1 FROM payment p WHERE p.donation_id = d.id)
           AND ${localDay('d.created_at')} = $2::date
           AND ($3::uuid IS NULL OR d.recorded_by = $3)
         ORDER BY d.created_at`,
        [parishId, day, staffId]
      ),
    ]);

    const receipts = [
      ...payments.rows.map((row) => ({
        id: row.id,
        at: row.paid_at,
        kind: row.kind,
        receipt: row.receipt,
        certificateCode: row.certificate_code,
        name: decrypt(row.name) || null,
        method: methodBucket(row.method),
        amount: amountOf(row.amount_due),
        by: row.by_name || (row.method === 'gcash' ? 'Paid online' : 'Parish office'),
        clearing: 'cleared',
        reference: null,
      })),
      ...gifts.rows.map((row) => ({
        id: row.id,
        at: row.created_at,
        kind: 'donation',
        receipt: row.receipt_no,
        certificateCode: null,
        name: decrypt(row.donor_name) || 'Anonymous',
        method: methodBucket(row.method),
        amount: amountOf(row.amount),
        by: row.by_name || 'Parish office',
        // D4: a cheque or transfer counts once the bank clears it.
        clearing: row.clearing_status,
        reference: row.reference || null,
      })),
    ].sort((a, b) => new Date(a.at) - new Date(b.at));

    const money = { cash: 0, gcash: 0, other: 0, total: 0, pending: 0 };
    const byKind = {};
    for (const r of receipts) {
      if (r.clearing === 'pending') money.pending += r.amount;
      if (r.clearing !== 'cleared') continue;
      money[r.method] += r.amount;
      money.total += r.amount;
      byKind[r.kind] = byKind[r.kind] || { kind: r.kind, count: 0, cash: 0, gcash: 0, other: 0, total: 0 };
      byKind[r.kind].count += 1;
      byKind[r.kind][r.method] += r.amount;
      byKind[r.kind].total += r.amount;
    }

    const copyRows = copies.rows.map((row) => ({
      id: row.id,
      code: row.certificate_code,
      holderName: row.holder_name,
      sacramentType: row.record_type,
      recordPath: `records/${RECORD_PATHS[row.record_type] || row.record_type}/${row.record_id}`,
      issuedAt: row.issued_at,
      issuedBy: row.issued_by_name || 'Parish office',
      channel: row.request_type === 'online' ? (row.delivery_method === 'digital' ? 'digital' : 'pickup') : 'walkin',
      status: row.void_kind === 'spoiled' ? 'spoiled' : row.status,
      printConfirmed: row.print_confirmed_at != null,
      receiptNumber: row.receipt_number || null,
      paid: row.payment_status === 'paid',
      paymentMethod: row.payment_type || null,
      amount: amountOf(row.amount_due),
    }));

    // Things to look at before going home. A walk-in copy is paid in the same step it is issued,
    // so an unpaid one means something went wrong.
    const warnings = [];
    for (const copy of copyRows) {
      if (copy.channel === 'walkin' && !copy.paid) {
        warnings.push({ kind: 'unpaid', certificateId: copy.id, message: `${copy.code} has no paid receipt.` });
      }
      if (copy.status === 'valid' && !copy.printConfirmed) {
        warnings.push({
          kind: 'unconfirmed',
          certificateId: copy.id,
          message: `${copy.code} was printed, but nobody said whether it came out right.`,
        });
      }
    }

    return res.json({
      date: day,
      staffId,
      staff: staff.rows.map((row) => ({ id: row.id, name: row.name || 'Staff', role: row.role })),
      certificates: {
        issued: copyRows.length,
        reprinted: reprints.rows.length,
        spoiled: spoiled.rows.length,
        copies: copyRows,
        reprints: reprints.rows.map((row) => ({
          id: row.id,
          code: row.certificate_code,
          holderName: row.holder_name,
          reason: row.reason,
          note: row.note,
          at: row.printed_at,
          by: row.by_name || 'Parish office',
        })),
        spoiledCopies: spoiled.rows.map((row) => ({
          id: row.id,
          code: row.certificate_code,
          holderName: row.holder_name,
          reason: row.invalidation_reason,
          at: row.invalidated_at,
          by: row.by_name || 'Parish office',
        })),
      },
      money: { ...money, byKind: ['certificate', 'intention', 'donation'].map((k) => byKind[k]).filter(Boolean) },
      receipts,
      warnings,
    });
  } catch (err) {
    return sendRecordError(res, err);
  }
}

module.exports = { getDaySummary };
