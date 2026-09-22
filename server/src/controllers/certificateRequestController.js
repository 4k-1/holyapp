const pool = require('../config/db');
const { writeAudit } = require('../utils/audit');

const SACRAMENTS = ['baptism', 'confirmation', 'marriage', 'death'];
const DELIVERIES = ['pickup', 'digital'];

const REQUEST_COLUMNS = `
  r.id, r.parish_id, r.request_type, r.record_type, r.record_id, r.certificate_id,
  r.purpose, r.copies, r.status, r.rejection_reason, r.requested_by, r.processed_by,
  r.delivery_method, r.created_at, r.subject_details, r.pickup_ready,
  pay.status AS payment_status,
  pay.amount_due,
  pay.payment_type
`;

const REQUEST_FROM = `
  FROM certificate_request r
  LEFT JOIN LATERAL (
    SELECT status, amount_due, payment_type
    FROM payment
    WHERE certificate_request_id = r.id
    ORDER BY created_at DESC
    LIMIT 1
  ) pay ON true
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

  const purpose = text(body.purpose, 255);
  if (!purpose) return 'Purpose is required.';

  const relationship = text(body.relationship, 80);
  if (!relationship) return 'Relationship to the subject is required.';

  const sacramentDate = dateValue(body.sacramentDate);
  if (!sacramentDate) return 'Sacrament date is required.';

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
  const fields = raw && typeof raw === 'object' ? raw : {};
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
      }
    : null;

  return {
    id: row.id,
    parishId: row.parish_id,
    requesterId: row.requested_by,
    sacramentType: row.record_type,
    status: clientStatus(row.status),
    origin: row.request_type === 'walkin' ? 'walkin' : 'online',
    deliveryMethod: row.delivery_method,
    payment,
    purpose: row.purpose,
    createdAt: dateStamp(row.created_at),
    copies: row.copies,
    details: toDetails(row.record_type, row.subject_details),
    linkedRecordId: row.record_id,
    rejectionReason: row.rejection_reason || undefined,
    pickupReady: Boolean(row.pickup_ready) || row.status === 'ready',
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
        JSON.stringify(details),
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

module.exports = {
  createRequest,
  listMyRequests,
  toCertificateRequest,
  loadRequest,
};
