const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const pool = require('../config/db');
const { writeAudit } = require('../utils/audit');
const { frontendUrl } = require('../utils/frontendUrl');
const { loadRequest, toCertificateRequest } = require('./certificateRequestController');

const RECORD_TABLES = {
  baptism: 'baptism',
  confirmation: 'confirmation',
  marriage: 'marriage',
  death: 'death',
};

const PREFIXES = {
  baptism: 'BAP',
  confirmation: 'CFM',
  marriage: 'MRG',
  death: 'DTH',
};

const TITLES = {
  baptism: 'Certificate of Baptism',
  confirmation: 'Certificate of Confirmation',
  marriage: 'Certificate of Marriage',
  death: 'Certificate of Death',
};

const VERIFY_STATES = new Set(['valid', 'superseded', 'invalid']);
const VERIFY_HASH = /^[a-f0-9]{32}$/;

function sendError(res, err) {
  console.error(err);
  return res.status(500).json({ error: 'Could not complete this certificate.' });
}

function text(value, max) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function dateStamp(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function prettyDate(value) {
  const iso = dateStamp(value);
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value ? String(value) : '';
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

async function rollback(client) {
  try {
    await client.query('ROLLBACK');
  } catch {
    /* the transaction may already be closed */
  }
}

function registerRef(record) {
  if (!record || record.book_number == null) return '—';
  return `${record.book_number}:${record.page_number}:${record.entry_number}`;
}

function snapshotFrom(request, record, code, verifyUrl, config) {
  const details = request.subject_details && typeof request.subject_details === 'object'
    ? request.subject_details
    : {};
  const fields = {
    requestId: request.id,
    registerRef: registerRef(record),
    subjectName: details.subjectName || null,
    birthdate: details.birthdate || details.dateOfBirth || null,
    birthplace: details.birthplace || null,
    motherName: details.mothersName || details.motherName || null,
    fatherName: details.fathersName || details.fatherName || null,
    certCode: code,
    verifyUrl,
    signatoryName: config.signatory_name || null,
    signatoryTitle: config.signatory_title || null,
    footerText: config.footer_text || null,
  };
  const dateKey = {
    baptism: 'baptismDate',
    confirmation: 'confirmationDate',
    marriage: 'marriageDate',
    death: 'deathDate',
  }[request.record_type];
  if (dateKey && details.sacramentDate) fields[dateKey] = details.sacramentDate;
  return fields;
}

function toIssuedCertificate(row) {
  const snapshot = row.snapshot && typeof row.snapshot === 'object' ? row.snapshot : {};
  return {
    id: row.id,
    requestId: row.request_id,
    parishId: row.parish_id,
    ownerId: row.requested_by,
    sacramentType: row.record_type,
    holderName: row.holder_name || snapshot.subjectName || 'Certificate subject',
    issuedAt: dateStamp(row.issued_at),
    state: row.status,
    certCode: row.certificate_code,
    fields: {
      requestId: snapshot.requestId || row.request_id,
      registerRef: snapshot.registerRef || '—',
      birthdate: snapshot.birthdate || undefined,
      birthplace: snapshot.birthplace || undefined,
      baptismDate: snapshot.baptismDate || undefined,
      confirmationDate: snapshot.confirmationDate || undefined,
      marriageDate: snapshot.marriageDate || undefined,
      deathDate: snapshot.deathDate || undefined,
      motherName: snapshot.motherName || undefined,
      fatherName: snapshot.fatherName || undefined,
      notations: Array.isArray(snapshot.notations) ? snapshot.notations : undefined,
      certCode: row.certificate_code || undefined,
      verifyUrl: row.qr_code || undefined,
    },
  };
}

async function paidRow(client, requestId) {
  const payment = await client.query(
    `SELECT status FROM payment
     WHERE certificate_request_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [requestId]
  );
  return payment.rows[0] || null;
}

async function issueCertificateRow(client, request, actorId, parishId) {
  const table = RECORD_TABLES[request.record_type];
  const recordResult = await client.query(
    `SELECT * FROM ${table} WHERE id = $1 AND parish_id = $2`,
    [request.record_id, parishId]
  );
  const record = recordResult.rows[0];
  if (!record) {
    const error = new Error(`That record is not a ${request.record_type} entry in this parish.`);
    error.status = 400;
    throw error;
  }

  const configResult = await client.query(
    `SELECT numbering_prefix, signatory_name, signatory_title, footer_text
     FROM certificate_configuration
     WHERE parish_id = $1 AND certificate_type = $2`,
    [parishId, request.record_type]
  );
  const config = configResult.rows[0] || {
    numbering_prefix: PREFIXES[request.record_type],
    signatory_name: null,
    signatory_title: 'Parish Priest',
    footer_text: null,
  };

  const prior = await client.query(
    `SELECT id, version
     FROM certificate
     WHERE parish_id = $1 AND record_type = $2 AND record_id = $3 AND status = 'valid'
     ORDER BY version DESC
     FOR UPDATE`,
    [parishId, request.record_type, request.record_id]
  );
  const maxVersion = await client.query(
    `SELECT COALESCE(MAX(version), 0)::int AS version
     FROM certificate
     WHERE parish_id = $1 AND record_type = $2 AND record_id = $3`,
    [parishId, request.record_type, request.record_id]
  );
  const count = await client.query(
    `SELECT COUNT(*)::int AS n FROM certificate WHERE parish_id = $1 AND record_type = $2`,
    [parishId, request.record_type]
  );

  if (prior.rows.length > 0) {
    await client.query(
      `UPDATE certificate
       SET status = 'superseded'
       WHERE parish_id = $1 AND record_type = $2 AND record_id = $3 AND status = 'valid'`,
      [parishId, request.record_type, request.record_id]
    );
  }

  const prefix = String(config.numbering_prefix || PREFIXES[request.record_type] || 'CERT')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 5) || 'CERT';
  const code = `CF-${prefix}-${String(count.rows[0].n + 1).padStart(4, '0')}-01`;
  const hash = crypto.randomBytes(16).toString('hex');
  const verifyUrl = `${frontendUrl()}/verify/${hash}`;
  const id = crypto.randomUUID();
  const holder = (request.subject_details && request.subject_details.subjectName) || 'Certificate subject';
  const snapshot = snapshotFrom(request, record, code, verifyUrl, config);

  await client.query(
    `INSERT INTO certificate (
       id, record_type, record_id, parish_id, version, hash, previous_certificate_id,
       status, pdf_url, qr_code, issued_by, certificate_code, holder_name, snapshot
     )
     VALUES (
       $1, $2, $3, $4, $5, $6, $7,
       'valid', $8, $9, $10, $11, $12, $13::jsonb
     )`,
    [
      id,
      request.record_type,
      request.record_id,
      parishId,
      maxVersion.rows[0].version + 1,
      hash,
      prior.rows[0] ? prior.rows[0].id : null,
      `/certificates/${id}/pdf`,
      verifyUrl,
      actorId,
      code,
      holder.slice(0, 255),
      JSON.stringify(snapshot),
    ]
  );

  return { id, code, verifyUrl, hash };
}

async function lockRequest(client, id, parishId) {
  const current = await client.query(
    `SELECT *
     FROM certificate_request
     WHERE id = $1 AND parish_id = $2
     FOR UPDATE`,
    [id, parishId]
  );
  return current.rows[0] || null;
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function finishIssue(req, res, mode) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const request = await lockRequest(client, req.params.id, req.parishId);
    if (!request) throw httpError(404, 'Request not found.');
    if (mode === 'digital' && request.status === 'released') {
      throw httpError(400, 'This certificate has already been issued.');
    }
    if (request.status !== 'processing') {
      throw httpError(400, 'This request is not ready to issue.');
    }
    if (!request.record_id) throw httpError(400, 'Link a sacramental record before issuing.');
    if (mode === 'digital' && request.delivery_method !== 'digital') {
      throw httpError(400, 'Use mark ready for pickup requests.');
    }
    if (mode === 'pickup' && request.delivery_method !== 'pickup') {
      throw httpError(400, 'Use issue for digital requests.');
    }

    const payment = await paidRow(client, request.id);
    if (!payment || payment.status !== 'paid') {
      throw httpError(400, 'Payment must be confirmed before issuing.');
    }

    let issued;
    if (request.certificate_id) {
      if (mode === 'digital') throw httpError(400, 'This certificate has already been issued.');
      const existing = await client.query(
        'SELECT certificate_code, qr_code FROM certificate WHERE id = $1',
        [request.certificate_id]
      );
      issued = {
        id: request.certificate_id,
        code: existing.rows[0] && existing.rows[0].certificate_code,
        verifyUrl: existing.rows[0] && existing.rows[0].qr_code,
      };
    } else {
      issued = await issueCertificateRow(client, request, req.user.id, req.parishId);
    }

    if (mode === 'digital') {
      await client.query(
        `UPDATE certificate_request
         SET status = 'released', certificate_id = $1, processed_by = $2, updated_at = NOW()
         WHERE id = $3`,
        [issued.id, req.user.id, request.id]
      );
    } else {
      await client.query(
        `UPDATE certificate_request
         SET pickup_ready = true, certificate_id = $1, processed_by = $2, updated_at = NOW()
         WHERE id = $3`,
        [issued.id, req.user.id, request.id]
      );
    }
    await client.query('COMMIT');

    const row = await loadRequest(request.id, req.parishId);
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: mode === 'digital' ? 'certificate.issued' : 'certificate.ready',
      entityType: 'certificate',
      entityId: issued.id,
      metadata: { requestId: request.id, code: issued.code },
    });
    return res.json({
      request: toCertificateRequest(row),
      certificateCode: issued.code,
      verifyUrl: issued.verifyUrl,
    });
  } catch (err) {
    await rollback(client);
    if (err.status) return res.status(err.status).json({ error: err.message });
    return sendError(res, err);
  } finally {
    client.release();
  }
}

async function issueDigital(req, res) {
  return finishIssue(req, res, 'digital');
}

async function markReady(req, res) {
  return finishIssue(req, res, 'pickup');
}

async function releasePickup(req, res) {
  const releasedTo = text(req.body && req.body.releasedTo, 255);
  const validId = text(req.body && req.body.validId, 80);
  if (!releasedTo) return res.status(400).json({ error: 'Who received the certificate?' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const request = await lockRequest(client, req.params.id, req.parishId);
    if (!request) throw httpError(404, 'Request not found.');
    if (request.delivery_method !== 'pickup') {
      throw httpError(400, 'Only pickup requests can be released at the office.');
    }
    if (!request.pickup_ready) {
      throw httpError(400, 'Certificate must be marked ready for pickup first.');
    }
    if (request.status === 'released') {
      throw httpError(400, 'This certificate has already been released.');
    }
    if (request.status !== 'processing') {
      throw httpError(400, 'This request cannot be released.');
    }

    await client.query(
      `UPDATE certificate_request
       SET status = 'released', processed_by = $1, updated_at = NOW()
       WHERE id = $2`,
      [req.user.id, request.id]
    );
    await client.query('COMMIT');

    const row = await loadRequest(request.id, req.parishId);
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'certificate.released',
      entityType: 'certificate_request',
      entityId: request.id,
      metadata: { releasedTo, validId: validId || null, certificateId: request.certificate_id },
    });
    return res.json(toCertificateRequest(row));
  } catch (err) {
    await rollback(client);
    if (err.status) return res.status(err.status).json({ error: err.message });
    return sendError(res, err);
  } finally {
    client.release();
  }
}

async function listMyCertificates(req, res) {
  try {
    const result = await pool.query(
      `SELECT c.*, r.id AS request_id, r.requested_by
       FROM certificate c
       JOIN certificate_request r ON r.certificate_id = c.id
       WHERE r.requested_by = $1 AND c.parish_id = $2 AND r.status = 'released'
       ORDER BY c.issued_at DESC`,
      [req.user.id, req.parishId]
    );
    return res.json({ certificates: result.rows.map(toIssuedCertificate) });
  } catch (err) {
    return sendError(res, err);
  }
}

async function verifyCertificate(req, res) {
  const hash = String(req.params.hash || '').trim().toLowerCase();
  if (!VERIFY_HASH.test(hash)) {
    return res.status(404).json({ error: 'No certificate matches this code.' });
  }

  try {
    const result = await pool.query(
      `SELECT c.status, c.certificate_code, c.holder_name, c.record_type, c.issued_at,
              c.invalidation_reason, c.snapshot, c.qr_code,
              p.name AS parish_name, p.address AS parish_address, p.slug AS parish_slug
       FROM certificate c
       JOIN parish p ON p.id = c.parish_id
       WHERE c.hash = $1`,
      [hash]
    );
    if (result.rowCount !== 1) {
      return res.status(404).json({ error: 'No certificate matches this code.' });
    }
    const row = result.rows[0];
    if (!VERIFY_STATES.has(row.status)) {
      return res.status(503).json({ error: 'This certificate could not be checked.' });
    }
    const snapshot = row.snapshot && typeof row.snapshot === 'object' ? row.snapshot : {};
    return res.json({
      status: row.status,
      code: row.certificate_code,
      holderName: row.holder_name,
      sacramentType: row.record_type,
      issuedAt: dateStamp(row.issued_at),
      parishName: row.parish_name,
      parishAddress: row.parish_address || '',
      parishSlug: row.parish_slug || '',
      signatoryName: snapshot.signatoryName || '',
      signatoryTitle: snapshot.signatoryTitle || '',
      footerText: snapshot.footerText || '',
      reason: row.status === 'invalid' ? row.invalidation_reason : undefined,
      fields: {
        requestId: snapshot.requestId || '',
        registerRef: snapshot.registerRef || '—',
        birthdate: snapshot.birthdate || undefined,
        birthplace: snapshot.birthplace || undefined,
        baptismDate: snapshot.baptismDate || undefined,
        confirmationDate: snapshot.confirmationDate || undefined,
        marriageDate: snapshot.marriageDate || undefined,
        deathDate: snapshot.deathDate || undefined,
        motherName: snapshot.motherName || undefined,
        fatherName: snapshot.fatherName || undefined,
        certCode: row.certificate_code || undefined,
        verifyUrl: row.qr_code || undefined,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(503).json({ error: 'This certificate could not be checked.' });
  }
}

async function loadOwnedCertificate(req) {
  const result = await pool.query(
    `SELECT c.*, p.name AS parish_name, r.requested_by, r.id AS request_id
     FROM certificate c
     JOIN parish p ON p.id = c.parish_id
     LEFT JOIN certificate_request r ON r.certificate_id = c.id
     WHERE c.id = $1`,
    [req.params.id]
  );
  const row = result.rows[0];
  if (!row) return null;
  const office = req.user.role === 'parish_admin' || req.user.role === 'parish_staff';
  if (office && row.parish_id === req.parishId) return row;
  if (req.user.role === 'parishioner' && row.requested_by === req.user.id) return row;
  return null;
}

async function downloadPdf(req, res) {
  try {
    const row = await loadOwnedCertificate(req);
    if (!row) return res.status(404).json({ error: 'Certificate not found.' });
    const snapshot = row.snapshot && typeof row.snapshot === 'object' ? row.snapshot : {};
    const png = await QRCode.toBuffer(row.qr_code, { width: 180, margin: 1 });
    const doc = new PDFDocument({ size: 'A4', margin: 64 });
    const safeName = String(row.certificate_code || 'certificate').replace(/[^\w.-]+/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`);
    doc.pipe(res);
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    doc.font('Times-Bold').fontSize(16).text(row.parish_name, { align: 'center', width });
    doc.moveDown(0.35);
    doc.font('Times-Bold').fontSize(14).text(TITLES[row.record_type] || 'Certificate', { align: 'center', width });
    doc.moveDown(0.8);
    doc.font('Times-Roman').fontSize(12).text(`This certifies the sacramental record of ${row.holder_name}.`, { width });
    doc.moveDown(0.6);
    const sacramentDate = snapshot.baptismDate || snapshot.confirmationDate || snapshot.marriageDate || snapshot.deathDate;
    const lines = [
      ['Certificate No.', row.certificate_code],
      ['Register', snapshot.registerRef],
      ['Birthdate', prettyDate(snapshot.birthdate)],
      ['Birthplace', snapshot.birthplace],
      ['Date', prettyDate(sacramentDate)],
      ['Mother', snapshot.motherName],
      ['Father', snapshot.fatherName],
      ['Issued', prettyDate(row.issued_at)],
      ['Status', row.status],
    ];
    for (const [label, value] of lines) {
      if (!value) continue;
      doc.font('Times-Bold').fontSize(12).text(`${label}: `, { continued: true, width });
      doc.font('Times-Roman').fontSize(12).text(String(value), { width });
    }
    doc.moveDown(1);
    const qrSize = 96;
    const qrX = doc.page.margins.left;
    const qrY = doc.y;
    doc.image(png, qrX, qrY, { width: qrSize });
    doc.x = qrX;
    doc.y = qrY + qrSize + 14;
    doc.font('Times-Roman').fontSize(10).text('Scan to verify this certificate', { width });
    doc.moveDown(0.25);
    doc.fontSize(8).text(row.qr_code, { width });
    if (snapshot.footerText) {
      doc.moveDown(0.8);
      doc.font('Times-Italic').fontSize(10).text(snapshot.footerText, { width });
    }
    doc.end();
  } catch (err) {
    if (!res.headersSent) return sendError(res, err);
    res.end();
  }
}

async function listRecordCertificates(parishId, recordType, recordId) {
  const result = await pool.query(
    `SELECT c.id, c.certificate_code, c.status, c.issued_at, c.record_type,
            NULLIF(trim(concat_ws(' ', u.first_name, u.last_name)), '') AS issued_by_name
     FROM certificate c
     LEFT JOIN app_user u ON u.id = c.issued_by
     WHERE c.parish_id = $1 AND c.record_type = $2 AND c.record_id = $3
     ORDER BY c.version DESC`,
    [parishId, recordType, recordId]
  );
  const labels = { valid: 'Valid', superseded: 'Superseded', invalid: 'Invalid' };
  return result.rows.map((row) => ({
    id: row.id,
    type: TITLES[row.record_type] || 'Certificate',
    date: dateStamp(row.issued_at),
    by: row.issued_by_name || 'Parish office',
    status: labels[row.status] || 'Valid',
    code: row.certificate_code,
  }));
}

async function revokeCertificate(req, res) {
  const reason = text(req.body && req.body.reason, 1000);
  if (!reason) return res.status(400).json({ error: 'A reason is required to revoke a certificate.' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query(
      `SELECT id, status, parish_id
       FROM certificate
       WHERE id = $1 AND parish_id = $2
       FOR UPDATE`,
      [req.params.id, req.parishId]
    );
    const certificate = current.rows[0];
    if (!certificate) throw httpError(404, 'Certificate not found.');
    if (certificate.status === 'invalid') throw httpError(400, 'This certificate is already revoked.');
    if (certificate.status !== 'valid') {
      throw httpError(400, 'Only the current valid certificate can be revoked.');
    }

    await client.query(
      `UPDATE certificate
       SET status = 'invalid',
           invalidated_by = $1,
           invalidated_at = NOW(),
           invalidation_reason = $2
       WHERE id = $3`,
      [req.user.id, reason, certificate.id]
    );
    await client.query('COMMIT');

    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'certificate.revoked',
      entityType: 'certificate',
      entityId: certificate.id,
      metadata: { reason },
    });
    return res.json({ id: certificate.id, state: 'invalid', reason });
  } catch (err) {
    await rollback(client);
    if (err.status) return res.status(err.status).json({ error: err.message });
    return sendError(res, err);
  } finally {
    client.release();
  }
}

module.exports = {
  issueDigital,
  markReady,
  releasePickup,
  listMyCertificates,
  verifyCertificate,
  downloadPdf,
  revokeCertificate,
  listRecordCertificates,
  toIssuedCertificate,
};
