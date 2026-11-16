const pool = require('../config/db');
const { writeAudit } = require('../utils/audit');
const { optionalUuid } = require('../utils/recordFields');
const { feeAmount, FEE_NAMES, FEE_DEFAULTS } = require('../utils/serviceFee');
const { normalizePurpose } = require('../constants/purposes');
const { encryptJson, decryptJson } = require('../utils/fieldCrypto');
const { emailCertificateStatus } = require('../utils/statusEmail');
const { notifyOfficeArea } = require('../utils/notify');

const SACRAMENTS = ['baptism', 'confirmation', 'marriage', 'death'];
const DELIVERIES = ['pickup', 'digital'];
const RECORD_TABLES = {
  baptism: 'baptism',
  confirmation: 'confirmation',
  marriage: 'marriage',
  death: 'death',
};
const REQUEST_COLUMNS = `
  r.id, r.reference_no, r.parish_id, r.request_type, r.record_type, r.record_id, r.certificate_id,
  r.purpose, r.copies, r.status, r.rejection_reason, r.requested_by, r.processed_by,
  r.delivery_method, r.created_at, r.subject_details, r.pickup_ready,
  pay.status AS payment_status,
  pay.amount_due,
  pay.payment_type,
  pay.receipt_number,
  pay.receipt_url,
  pay.paid_at,
  pay.collected_by_name,
  cert.id AS issued_certificate_id,
  cert.certificate_code AS issued_certificate_code,
  cert.status AS issued_certificate_status,
  (SELECT sf.amount FROM service_fee sf
    WHERE sf.parish_id = r.parish_id
      AND sf.service_name = CASE r.record_type
        WHEN 'baptism' THEN '${FEE_NAMES.baptism}' WHEN 'confirmation' THEN '${FEE_NAMES.confirmation}'
        WHEN 'marriage' THEN '${FEE_NAMES.marriage}' WHEN 'death' THEN '${FEE_NAMES.death}' END
    LIMIT 1) AS fee_each
`;

const REQUEST_FROM = `
  FROM certificate_request r
  LEFT JOIN LATERAL (
    SELECT p.status, p.amount_due, p.payment_type, p.receipt_number, p.receipt_url, p.paid_at,
           -- Only office cash has a staff collector; for GCash, collected_by holds the paying parishioner.
           CASE WHEN p.payment_type = 'cash' THEN NULLIF(TRIM(CONCAT(u.first_name, ' ', u.last_name)), '') END
             AS collected_by_name
    FROM payment p
    LEFT JOIN app_user u ON u.id = p.collected_by
    WHERE p.certificate_request_id = r.id
    ORDER BY p.created_at DESC
    LIMIT 1
  ) pay ON true
  LEFT JOIN certificate cert ON cert.id = r.certificate_id
`;

function sendError(res, err) {
  console.error(err);
  return res.status(500).json({ error: 'Could not complete this request.' });
}

function text(value, max) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function dateValue(raw) {
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const [year, month, day] = raw.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return raw;
}

function dateStamp(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function cleanFields(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const out = {};
  for (const [key, value] of Object.entries(input)) {
    if (!/^[A-Za-z][A-Za-z0-9]{0,39}$/.test(key)) continue;
    if (typeof value !== 'string') continue;
    const trimmed = value.trim().slice(0, 255);
    if (trimmed) out[key] = trimmed;
  }
  return out;
}

function subjectName(sacrament, fields) {
  if (sacrament === 'marriage') {
    const groom = [fields.groomFirstName, fields.groomMiddleName, fields.groomLastName]
      .filter(Boolean)
      .join(' ');
    const bride = [fields.brideFirstName, fields.brideMiddleName, fields.brideMaidenLastName]
      .filter(Boolean)
      .join(' ');
    return [groom, bride].filter(Boolean).join(' & ');
  }
  return [fields.firstName, fields.middleName, fields.lastName].filter(Boolean).join(' ');
}

function validateIntake(body) {
  const sacrament = body && body.sacramentType;
  const delivery = body && body.deliveryMethod;
  if (!SACRAMENTS.includes(sacrament)) return 'Choose a sacrament.';
  if (!DELIVERIES.includes(delivery)) return 'Choose how the certificate should be delivered.';

  const purpose = normalizePurpose(body.purpose);
  if (!purpose) return 'Purpose is required.';

  const relationship = text(body.relationship, 80);
  if (!relationship) return 'Relationship to the subject is required.';

  // The date is optional: many people don't know the day they were baptised or confirmed.
  const hasDate = typeof body.sacramentDate === 'string' && body.sacramentDate.trim() !== '';
  const sacramentDate = hasDate ? dateValue(body.sacramentDate.trim()) : null;
  if (hasDate && !sacramentDate) return 'Enter a real date for the sacrament.';

  const fields = cleanFields(body.fields);
  if (sacrament === 'marriage') {
    if (!fields.groomFirstName || !fields.groomLastName) return 'Groom first and last name are required.';
    if (!fields.brideFirstName || !fields.brideMaidenLastName) return 'Bride first and last name are required.';
  } else if (!fields.firstName || !fields.lastName) {
    return 'First and last name are required.';
  }

  const name = subjectName(sacrament, fields);
  if (!name) return 'Subject name is required.';

  return {
    sacrament,
    delivery,
    purpose,
    relationship,
    sacramentDate,
    fields,
    name,
  };
}

function toDetails(sacrament, raw) {
  const fields = decryptJson(raw && typeof raw === 'object' ? raw : {}) || {};
  const details = { subjectName: fields.subjectName || 'Certificate subject' };
  const birthdate = fields.birthdate || fields.dateOfBirth;
  if (birthdate) details.birthdate = birthdate;
  if (fields.birthplace) details.birthplace = fields.birthplace;
  const mother = fields.mothersName || fields.motherName;
  const father = fields.fathersName || fields.fatherName;
  if (mother) details.motherName = mother;
  if (father) details.fatherName = father;
  const sponsor1 = fields.godmothersName || fields.sponsorName || fields.witness1;
  const sponsor2 = fields.godfathersName || fields.witness2;
  if (sponsor1) details.sponsor1 = sponsor1;
  if (sponsor2) details.sponsor2 = sponsor2;
  if (sacrament === 'baptism' && fields.sacramentDate) details.baptismDate = fields.sacramentDate;
  // Who asked: "Myself", or how they're related to the person on the certificate.
  if (fields.relationship) details.relationship = fields.relationship;
  return details;
}

function clientStatus(status) {
  if (status === 'pending' || status === 'processing' || status === 'released' || status === 'rejected') {
    return status;
  }
  return 'processing';
}

function toCertificateRequest(row) {
  const payment = row.payment_status
    ? {
        status: row.payment_status,
        amount: Number(row.amount_due),
        method: row.payment_type || undefined,
        receiptNumber: row.receipt_number || undefined,
        receiptUrl: row.receipt_url || undefined,
        paidAt: row.paid_at ? new Date(row.paid_at).toISOString() : undefined,
        /** Staff member who took a payment at the office; absent for GCash. */
        collectedBy: row.collected_by_name || undefined,
      }
    : null;

  return {
    id: row.id,
    referenceNo: row.reference_no,
    parishId: row.parish_id,
    requesterId: row.requested_by,
    sacramentType: row.record_type,
    status: clientStatus(row.status),
    origin: row.request_type === 'walkin' ? 'walkin' : 'online',
    deliveryMethod: row.delivery_method,
    payment,
    // What it costs: the amount due once there's a payment, otherwise the parish's fee for this certificate.
    fee: payment
      ? payment.amount
      : Math.round((row.fee_each != null ? Number(row.fee_each) : FEE_DEFAULTS[row.record_type] || 100) * Math.max(1, Number(row.copies) || 1) * 100) / 100,
    purpose: row.purpose,
    createdAt: dateStamp(row.created_at),
    copies: row.copies,
    details: toDetails(row.record_type, row.subject_details),
    linkedRecordId: row.record_id,
    rejectionReason: row.rejection_reason || undefined,
    pickupReady: Boolean(row.pickup_ready) || row.status === 'ready',
    issuedCertificate: row.issued_certificate_id
      ? {
          id: row.issued_certificate_id,
          code: row.issued_certificate_code,
          state: row.issued_certificate_status,
        }
      : null,
  };
}

async function loadRequest(id, parishId, requesterId) {
  const params = [id, parishId];
  let owner = '';
  if (requesterId) {
    params.push(requesterId);
    owner = ` AND r.requested_by = $${params.length}`;
  }
  const result = await pool.query(
    `SELECT ${REQUEST_COLUMNS} ${REQUEST_FROM} WHERE r.id = $1 AND r.parish_id = $2${owner}`,
    params
  );
  return result.rows[0] || null;
}

const SACRAMENT_WORDS = { baptism: 'baptismal', confirmation: 'confirmation', marriage: 'marriage', death: 'death' };

/**
 * Tells the office a parishioner asked for a certificate. Names the parishioner, not the person on the
 * certificate: request details are stored encrypted, notifications are not.
 */
async function notifyNewRequest(parishId, requesterId, sacrament, delivery) {
  const who = await pool.query(
    "SELECT NULLIF(trim(concat_ws(' ', first_name, last_name)), '') AS name FROM app_user WHERE id = $1",
    [requesterId]
  );
  const name = (who.rows[0] && who.rows[0].name) || 'A parishioner';
  await notifyOfficeArea(parishId, 'certificates', {
    kind: 'request',
    title: 'New certificate request',
    body: `${name} asked for a ${SACRAMENT_WORDS[sacrament] || sacrament} certificate (${delivery === 'digital' ? 'digital copy' : 'pickup at the office'}).`,
    href: 'requests',
  });
}

async function createRequest(req, res) {
  const parsed = validateIntake(req.body);
  if (typeof parsed === 'string') return res.status(400).json({ error: parsed });

  const details = {
    ...parsed.fields,
    relationship: parsed.relationship,
    sacramentDate: parsed.sacramentDate,
    subjectName: parsed.name,
  };

  try {
    const inserted = await pool.query(
      `INSERT INTO certificate_request (
         parish_id, request_type, record_type, record_id, purpose, copies,
         status, requested_by, delivery_method, subject_details
       )
       VALUES ($1, 'online', $2, NULL, $3, 1, 'pending', $4, $5, $6::jsonb)
       RETURNING id`,
      [
        req.parishId,
        parsed.sacrament,
        parsed.purpose,
        req.user.id,
        parsed.delivery,
        JSON.stringify(encryptJson(details)),
      ]
    );

    const row = await loadRequest(inserted.rows[0].id, req.parishId, req.user.id);
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'certificate_request.created',
      entityType: 'certificate_request',
      entityId: inserted.rows[0].id,
      metadata: { sacrament: parsed.sacrament, delivery: parsed.delivery },
    });
    await notifyNewRequest(req.parishId, req.user.id, parsed.sacrament, parsed.delivery);
    return res.status(201).json(toCertificateRequest(row));
  } catch (err) {
    return sendError(res, err);
  }
}

async function listMyRequests(req, res) {
  try {
    const result = await pool.query(
      `SELECT ${REQUEST_COLUMNS} ${REQUEST_FROM}
       WHERE r.parish_id = $1 AND r.requested_by = $2
       ORDER BY r.created_at DESC`,
      [req.parishId, req.user.id]
    );
    return res.json({ requests: result.rows.map(toCertificateRequest) });
  } catch (err) {
    return sendError(res, err);
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** What the parishioner typed into the request form, as they typed it (the office sees a matched record instead). */
function toSubmitted(raw) {
  const all = decryptJson(raw && typeof raw === 'object' ? raw : {}) || {};
  const { subjectName: _name, relationship, sacramentDate, ...fields } = all;
  return { relationship: relationship || null, sacramentDate: sacramentDate || null, fields };
}

/** One of the signed-in parishioner's own requests, with everything they sent. */
async function getMyRequest(req, res) {
  if (!UUID.test(req.params.id || '')) return res.status(404).json({ error: 'Request not found.' });
  try {
    const row = await loadRequest(req.params.id, req.parishId, req.user.id);
    if (!row) return res.status(404).json({ error: 'Request not found.' });
    return res.json({ request: toCertificateRequest(row), submitted: toSubmitted(row.subject_details) });
  } catch (err) {
    return sendError(res, err);
  }
}

function receiptNumberFor(requestId) {
  const compact = String(requestId).replace(/-/g, '').slice(0, 10).toUpperCase();
  return `HA-${compact}`;
}

async function rollback(client) {
  try {
    await client.query('ROLLBACK');
  } catch {
    /* the transaction may already be closed */
  }
}

async function listParishRequests(req, res) {
  try {
    const result = await pool.query(
      `SELECT ${REQUEST_COLUMNS} ${REQUEST_FROM}
       WHERE r.parish_id = $1
       ORDER BY r.created_at DESC`,
      [req.parishId]
    );
    return res.json({ requests: result.rows.map(toCertificateRequest) });
  } catch (err) {
    return sendError(res, err);
  }
}

async function getRequest(req, res) {
  try {
    const row = await loadRequest(req.params.id, req.parishId);
    if (!row) return res.status(404).json({ error: 'Request not found.' });
    return res.json(toCertificateRequest(row));
  } catch (err) {
    return sendError(res, err);
  }
}

async function linkRequest(req, res) {
  const recordId = optionalUuid(req.body && req.body.recordId);
  if (!recordId) return res.status(400).json({ error: 'Choose a record to link.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query(
      `SELECT id, status, record_type, copies
       FROM certificate_request
       WHERE id = $1 AND parish_id = $2
       FOR UPDATE`,
      [req.params.id, req.parishId]
    );
    const request = current.rows[0];
    if (!request) {
      await rollback(client);
      return res.status(404).json({ error: 'Request not found.' });
    }
    if (request.status !== 'pending') {
      await rollback(client);
      return res.status(400).json({ error: 'Only a pending request can be linked to a record.' });
    }

    const table = RECORD_TABLES[request.record_type];
    const record = await client.query(
      `SELECT id FROM ${table} WHERE id = $1 AND parish_id = $2`,
      [recordId, req.parishId]
    );
    if (!record.rows[0]) {
      await rollback(client);
      return res.status(400).json({
        error: `That record is not a ${request.record_type} entry in this parish.`,
      });
    }

    const amount = await feeAmount(client, req.parishId, request.record_type, request.copies);
    const existingPay = await client.query(
      'SELECT id FROM payment WHERE certificate_request_id = $1 LIMIT 1',
      [request.id]
    );
    if (!existingPay.rows[0]) {
      await client.query(
        `INSERT INTO payment (certificate_request_id, payment_type, amount_due, status)
         VALUES ($1, 'cash', $2, 'unpaid')`,
        [request.id, amount]
      );
    }

    await client.query(
      `UPDATE certificate_request
       SET record_id = $1, status = 'processing', processed_by = $2, updated_at = NOW()
       WHERE id = $3`,
      [recordId, req.user.id, request.id]
    );
    await client.query('COMMIT');

    const row = await loadRequest(request.id, req.parishId);
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'certificate_request.linked',
      entityType: 'certificate_request',
      entityId: request.id,
      metadata: { recordId, sacrament: request.record_type },
    });
    emailCertificateStatus(row, 'found');
    return res.json(toCertificateRequest(row));
  } catch (err) {
    await rollback(client);
    return sendError(res, err);
  } finally {
    client.release();
  }
}

async function rejectRequest(req, res) {
  const reason = text(req.body && req.body.reason, 1000);
  if (!reason) {
    return res.status(400).json({ error: 'Give the parishioner a reason for rejecting this request.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query(
      `SELECT id, status
       FROM certificate_request
       WHERE id = $1 AND parish_id = $2
       FOR UPDATE`,
      [req.params.id, req.parishId]
    );
    const request = current.rows[0];
    if (!request) {
      await rollback(client);
      return res.status(404).json({ error: 'Request not found.' });
    }
    if (request.status === 'rejected') {
      await rollback(client);
      return res.status(400).json({ error: 'This request is already rejected.' });
    }
    if (request.status === 'released' || request.status === 'ready') {
      await rollback(client);
      return res.status(400).json({ error: 'A released certificate cannot be rejected.' });
    }

    const paid = await client.query(
      `SELECT id FROM payment
       WHERE certificate_request_id = $1 AND status = 'paid'
       LIMIT 1`,
      [request.id]
    );
    if (paid.rows[0]) {
      await rollback(client);
      return res.status(400).json({
        error: 'Paid requests cannot be rejected. Handle as a refund instead.',
      });
    }

    await client.query(
      `UPDATE certificate_request
       SET status = 'rejected', rejection_reason = $1, processed_by = $2, updated_at = NOW()
       WHERE id = $3`,
      [reason, req.user.id, request.id]
    );
    await client.query('COMMIT');

    const row = await loadRequest(request.id, req.parishId);
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'certificate_request.rejected',
      entityType: 'certificate_request',
      entityId: request.id,
      metadata: { reason },
    });
    emailCertificateStatus(row, 'rejected', { reason });
    return res.json(toCertificateRequest(row));
  } catch (err) {
    await rollback(client);
    return sendError(res, err);
  } finally {
    client.release();
  }
}

async function confirmPayment(req, res) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query(
      `SELECT id, status
       FROM certificate_request
       WHERE id = $1 AND parish_id = $2
       FOR UPDATE`,
      [req.params.id, req.parishId]
    );
    const request = current.rows[0];
    if (!request) {
      await rollback(client);
      return res.status(404).json({ error: 'Request not found.' });
    }
    if (request.status !== 'processing') {
      await rollback(client);
      return res.status(400).json({ error: 'Link a record before recording payment.' });
    }

    const payment = await client.query(
      `SELECT id, amount_due, status
       FROM payment
       WHERE certificate_request_id = $1
       ORDER BY created_at DESC
       LIMIT 1
       FOR UPDATE`,
      [request.id]
    );
    const row = payment.rows[0];
    if (!row) {
      await rollback(client);
      return res.status(400).json({ error: 'This request has no fee to collect.' });
    }
    if (row.status === 'paid') {
      await rollback(client);
      return res.status(400).json({ error: 'Payment is already recorded.' });
    }

    await client.query(
      `UPDATE payment
       SET status = 'paid',
           payment_type = 'cash',
           amount_tendered = amount_due,
           change = 0,
           collected_by = $1,
           paid_at = NOW(),
           receipt_number = COALESCE(receipt_number, $3)
       WHERE id = $2`,
      [req.user.id, row.id, receiptNumberFor(request.id)]
    );
    await client.query('COMMIT');

    const updated = await loadRequest(request.id, req.parishId);
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'certificate_request.payment_recorded',
      entityType: 'certificate_request',
      entityId: request.id,
      metadata: { amount: Number(row.amount_due), method: 'cash' },
    });
    emailCertificateStatus(updated, 'paid');
    return res.json(toCertificateRequest(updated));
  } catch (err) {
    await rollback(client);
    return sendError(res, err);
  } finally {
    client.release();
  }
}

module.exports = {
  createRequest,
  listMyRequests,
  getMyRequest,
  listParishRequests,
  getRequest,
  linkRequest,
  rejectRequest,
  confirmPayment,
  toCertificateRequest,
  loadRequest,
  receiptNumberFor,
};
