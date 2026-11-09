// A7: the register of issued certificates, one row per copy, for Reports → Certificates. Replaces
// the paper "certificates issued" logbook. Read-only, built from the copies, their requests and
// receipts, and the reprint log.

const pool = require('../config/db');
const { sendRecordError } = require('../utils/recordFields');
const { normalizePurpose } = require('../constants/purposes');

const RECORD_PATHS = { baptism: 'baptismal', confirmation: 'confirmation', marriage: 'marriage', death: 'death' };
/** A long range stops here; the page asks for narrower dates. */
const MAX_ROWS = 2000;

function dateParam(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

/** The Philippine day a stored (UTC) timestamp falls on. */
const localDay = (column) => `((${column} AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Manila')::date`;

function statusOf(row) {
  if (row.void_kind === 'spoiled') return 'spoiled';
  if (row.status === 'invalid') return 'revoked';
  if (row.status === 'superseded') return 'replaced';
  if (row.delivery_method === 'pickup' && row.request_status && row.request_status !== 'released') return 'waiting';
  return 'valid';
}

function channelOf(row) {
  if (!row.request_type) return null;
  if (row.request_type === 'walkin') return 'walkin';
  return row.delivery_method === 'digital' ? 'digital' : 'pickup';
}

async function listIssuedCopies(req, res) {
  try {
    const from = dateParam(req.query.from);
    const to = dateParam(req.query.to);
    const result = await pool.query(
      `SELECT c.id, c.certificate_code, c.record_type, c.record_id, c.holder_name, c.issued_at,
              c.status::text AS status, c.void_kind, c.invalidation_reason,
              NULLIF(trim(concat_ws(' ', u.first_name, u.last_name)), '') AS issued_by_name,
              r.request_type::text AS request_type, r.delivery_method, r.status::text AS request_status, r.purpose,
              p.receipt_number,
              (SELECT COUNT(*)::int FROM certificate_reprint rp WHERE rp.certificate_id = c.id) AS reprints
       FROM certificate c
       LEFT JOIN app_user u ON u.id = c.issued_by
       LEFT JOIN LATERAL (
         SELECT * FROM certificate_request WHERE certificate_id = c.id ORDER BY created_at DESC LIMIT 1
       ) r ON TRUE
       LEFT JOIN LATERAL (
         SELECT receipt_number FROM payment
         WHERE certificate_request_id = r.id AND status = 'paid'
         ORDER BY paid_at DESC NULLS LAST LIMIT 1
       ) p ON TRUE
       WHERE c.parish_id = $1
         AND ($2::date IS NULL OR ${localDay('c.issued_at')} >= $2::date)
         AND ($3::date IS NULL OR ${localDay('c.issued_at')} <= $3::date)
       ORDER BY c.issued_at DESC
       LIMIT ${MAX_ROWS + 1}`,
      [req.parishId, from, to]
    );
    const truncated = result.rows.length > MAX_ROWS;
    const copies = result.rows.slice(0, MAX_ROWS).map((row) => {
      const channel = channelOf(row);
      return {
        id: row.id,
        code: row.certificate_code,
        sacramentType: row.record_type,
        holderName: row.holder_name,
        recordPath: `records/${RECORD_PATHS[row.record_type] || row.record_type}/${row.record_id}`,
        issuedAt: row.issued_at,
        issuedBy: row.issued_by_name || 'Parish office',
        channel,
        // Walk-ins before B2 were saved as "Walk-in issuance", with no real purpose.
        purpose: normalizePurpose(row.purpose),
        receiptNumber: row.receipt_number || null,
        status: statusOf(row),
        voidReason: row.void_kind ? row.invalidation_reason : null,
        // A digital copy is never printed by the office.
        timesPrinted: channel === 'digital' ? null : 1 + (row.reprints || 0),
      };
    });
    res.json({ copies, truncated, limit: MAX_ROWS });
  } catch (err) {
    sendRecordError(res, err);
  }
}

module.exports = { listIssuedCopies };
