const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const pool = require('../config/db');
const { writeAudit } = require('../utils/audit');
const { frontendUrl } = require('../utils/frontendUrl');
const { loadRequest, toCertificateRequest, receiptNumberFor } = require('./certificateRequestController');
const { feeAmount } = require('../utils/serviceFee');
const { listBaptismAnnotations } = require('../utils/baptismAnnotation');
const { certificateRemarks } = require('../utils/certificateRemarks');
const { normalizePurpose, validUntilFor, manilaToday } = require('../constants/purposes');

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
  // B2: what the copy is for; a marriage copy is accepted for 6 months from today.
  const purpose = normalizePurpose(request.purpose);
  if (purpose) {
    fields.purpose = purpose;
    fields.validUntil = validUntilFor(purpose, manilaToday());
  }
  const dateKey = {
    baptism: 'baptismDate',
    confirmation: 'confirmationDate',
    marriage: 'marriageDate',
    death: 'deathDate',
  }[request.record_type];
  if (dateKey && details.sacramentDate) fields[dateKey] = details.sacramentDate;
  return fields;
}

function joinName(...parts) {
  return parts.map((p) => (p == null ? '' : String(p).trim())).filter(Boolean).join(' ') || null;
}

async function sponsorNames(client, recordType, recordId) {
  const result = await client.query(
    `SELECT s.first_name, s.middle_name, s.last_name
     FROM sacrament_sponsor_assignment a
     JOIN sponsor s ON s.id = a.sponsor_id
     WHERE a.sacrament_type = $1 AND a.sacrament_record_id = $2
     ORDER BY a.is_primary DESC, a.created_at, s.last_name`,
    [recordType, recordId]
  );
  return result.rows.map((r) => joinName(r.first_name, r.middle_name, r.last_name)).filter(Boolean);
}

/**
 * Everything the printed certificate shows, copied from the record when the certificate is
 * issued (see client/src/features/parish-admin/components/certificate/certificateData.ts).
 * Dates stay ISO; the template writes them out in full.
 */
async function printedRecord(client, recordType, record) {
  const register = {
    bookNo: record.book_number || null,
    pageNo: record.page_number || null,
    lineNo: record.entry_number || null,
  };
  if (recordType === 'baptism') {
    // Same wording as the preview: "Confirmed on 25 September 2026 at Santuario."
    const remarks = certificateRemarks(await listBaptismAnnotations(client, record.id));
    return {
      type: 'BAPTISM',
      childName: joinName(record.first_name, record.middle_name, record.last_name),
      fatherName: joinName(record.father_first_name, record.father_last_name),
      motherName: joinName(record.mother_first_name, record.mother_last_name),
      placeOfBirth: record.place_of_birth || null,
      dateOfBirth: dateStamp(record.date_of_birth) || null,
      dateOfBaptism: dateStamp(record.date_of_baptism) || null,
      minister: record.minister || null,
      sponsors: await sponsorNames(client, 'baptism', record.id),
      remarks,
      ...register,
    };
  }
  if (recordType === 'confirmation') {
    return {
      type: 'CONFIRMATION',
      personConfirmed: joinName(record.first_name, record.middle_name, record.last_name),
      address: record.address || null,
      placeOfBaptism: record.baptism_place || null,
      fatherName: joinName(record.father_first_name, record.father_last_name),
      motherName: joinName(record.mother_first_name, record.mother_last_name),
      sponsors: await sponsorNames(client, 'confirmation', record.id),
      minister: record.minister || null,
      dateConfirmed: dateStamp(record.date_of_confirmation) || null,
      ...register,
    };
  }
  if (recordType === 'death') {
    // Parents are kept only as free-text next-of-kin rows ("Father", "Mother").
    const kin = await client.query(
      `SELECT relation_to_deceased, first_name, last_name FROM death_kin WHERE death_id = $1`,
      [record.id]
    );
    const parent = (relation) => {
      const row = kin.rows.find((k) => String(k.relation_to_deceased || '').trim().toLowerCase() === relation);
      return row ? joinName(row.first_name, row.last_name) : null;
    };
    return {
      type: 'DEATH',
      nameOfDeceased: joinName(record.first_name, record.middle_name, record.last_name),
      ageYears: record.age == null ? null : record.age,
      ageMonths: record.age_months == null ? null : record.age_months,
      ageDays: record.age_days == null ? null : record.age_days,
      fatherName: parent('father'),
      motherName: parent('mother'),
      address: record.residence || null,
      dateOfDeath: dateStamp(record.date_of_death) || null,
      dateOfBurial: dateStamp(record.date_of_burial) || null,
      placeOfBurial: record.place_of_burial || null,
      minister: record.minister || null,
      ...register,
    };
  }
  if (recordType === 'marriage') {
    const parties = await client.query(
      `SELECT * FROM marriage_party WHERE marriage_id = $1`,
      [record.id]
    );
    const consents = await client.query(
      `SELECT c.* FROM marriage_consent_person c
       JOIN marriage_party p ON p.id = c.marriage_party_id
       WHERE p.marriage_id = $1`,
      [record.id]
    );
    const formName = (first, middle, last) => ({ first: first || null, middle: middle || null, last: last || null });
    // Stored as husband/wife (the client calls them Groom/Bride).
    const party = (...roles) => {
      const p = parties.rows.find((row) => roles.includes(String(row.role).toLowerCase()));
      if (!p) return { name: {}, father: {}, mother: {} };
      const consent = consents.rows.find((c) => c.marriage_party_id === p.id);
      return {
        name: formName(p.first_name, p.middle_name, p.last_name),
        dateOfBirth: dateStamp(p.date_of_birth) || null,
        placeOfBirth: p.birthplace || null,
        sex: p.sex || null,
        citizenship: p.citizenship || null,
        residence: p.address || null,
        religion: p.religion || null,
        civilStatus: p.civil_status || null,
        father: formName(p.father_first_name, p.father_middle_initial, p.father_last_name),
        fatherCitizenship: p.father_citizenship || null,
        mother: formName(p.mother_first_name, p.mother_middle_initial, p.mother_last_name),
        motherCitizenship: p.mother_citizenship || null,
        consent: consent
          ? {
              name: formName(consent.first_name, consent.middle_initial, consent.last_name),
              relationship: consent.relation || null,
              residence: consent.residence || null,
            }
          : null,
      };
    };
    return {
      type: 'MARRIAGE',
      husband: party('husband', 'groom'),
      wife: party('wife', 'bride'),
      placeOfMarriage: record.place_of_marriage || null,
      marriageAddress: record.marriage_address || null,
      dateOfMarriage: dateStamp(record.date_of_marriage) || null,
      timeOfMarriage: record.time_of_marriage ? String(record.time_of_marriage).slice(0, 5) : null,
      solemnizingOfficer: record.minister || null,
      officerReligion: 'Roman Catholic',
      witnesses: [record.witness_one, record.witness_two].filter(Boolean),
      ...register,
    };
  }
  return null;
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
      printed: snapshot.printed || undefined,
      issuedOn: dateStamp(row.issued_at) || undefined,
      purpose: snapshot.purpose || undefined,
      validUntil: snapshot.validUntil || undefined,
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

/** `printed`: a paper copy, left "not confirmed" until someone checks the printout (A3). */
async function issueCertificateRow(client, request, actorId, parishId, { printed = true } = {}) {
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
  // Counted per sacrament (not per prefix), so changing the prefix in Settings doesn't restart it.
  const count = await client.query('SELECT count_year, count_value FROM next_count($1, $2)', [
    parishId,
    `CERT-${PREFIXES[request.record_type]}`,
  ]);
  const { count_year: year, count_value: n } = count.rows[0];
  const code = `${prefix}-${year}-${String(n).padStart(6, '0')}`;
  const hash = crypto.randomBytes(16).toString('hex');
  const verifyUrl = `${frontendUrl()}/verify/${hash}`;
  const id = crypto.randomUUID();
  const holder = (request.subject_details && request.subject_details.subjectName) || 'Certificate subject';
  const snapshot = snapshotFrom(request, record, code, verifyUrl, config);
  snapshot.printed = await printedRecord(client, request.record_type, record);

  await client.query(
    `INSERT INTO certificate (
       id, record_type, record_id, parish_id, version, hash, previous_certificate_id,
       status, pdf_url, qr_code, issued_by, certificate_code, holder_name, snapshot,
       print_confirmed_at, print_confirmed_by
     )
     VALUES (
       $1, $2, $3, $4, $5, $6, $7,
       'valid', $8, $9, $10, $11, $12, $13::jsonb,
       CASE WHEN $14::boolean THEN NULL ELSE NOW() END,
       CASE WHEN $14::boolean THEN NULL ELSE $10::uuid END
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
      printed,
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
      // A digital copy is never printed, so there is nothing to confirm.
      issued = await issueCertificateRow(client, request, req.user.id, req.parishId, {
        printed: mode !== 'digital',
      });
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
      certificateId: issued.id,
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
              c.invalidation_reason, c.snapshot, c.qr_code, c.void_kind,
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
      purpose: snapshot.purpose || undefined,
      validUntil: snapshot.validUntil || undefined,
      expiredForMarriage: Boolean(snapshot.validUntil && snapshot.validUntil < manilaToday()),
      voidKind: row.status === 'invalid' ? row.void_kind || 'revoked' : undefined,
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
      ['Issued for', snapshot.purpose],
      ['Valid for marriage until', prettyDate(snapshot.validUntil)],
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
  try {
    const result = await pool.query(
      `SELECT c.id, c.certificate_code, c.status, c.issued_at, c.record_type, c.qr_code,
              NULLIF(trim(concat_ws(' ', u.first_name, u.last_name)), '') AS issued_by_name,
              (SELECT COUNT(*)::int FROM certificate_reprint rp WHERE rp.certificate_id = c.id) AS reprints,
              c.print_confirmed_at, c.void_kind,
              -- The paid receipt for this copy (A4), so the record and the receipt name each other.
              (SELECT p.receipt_number
               FROM certificate_request r
               JOIN payment p ON p.certificate_request_id = r.id AND p.status = 'paid'
               WHERE r.certificate_id = c.id
               ORDER BY p.paid_at DESC NULLS LAST
               LIMIT 1) AS receipt_number
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
      status: row.void_kind === 'spoiled' ? 'Spoiled' : labels[row.status] || 'Valid',
      code: row.certificate_code,
      verifyUrl: row.qr_code || undefined,
      reprints: row.reprints || 0,
      printConfirmed: Boolean(row.print_confirmed_at),
      receiptNumber: row.receipt_number || undefined,
    }));
  } catch (err) {
    if (err.code === '42703') return [];
    throw err;
  }
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
           void_kind = 'revoked',
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

const REPRINT_REASONS = new Set(['paper_jam', 'printer_error', 'print_quality', 'other']);

async function loadOfficeCertificate(client, id, parishId, lock = false) {
  if (!/^[0-9a-f-]{36}$/i.test(String(id))) return null;
  const result = await client.query(
    `SELECT c.*, r.id AS request_id, r.requested_by,
            -- Walk-ins are stored with delivery 'digital' too, so only online wallet copies count.
            (r.request_type = 'online' AND r.delivery_method = 'digital') AS digital_copy
     FROM certificate c
     LEFT JOIN certificate_request r ON r.certificate_id = c.id
     WHERE c.id = $1 AND c.parish_id = $2
     ${lock ? 'FOR UPDATE OF c' : ''}`,
    [id, parishId]
  );
  return result.rows[0] || null;
}

/** An issued copy as it was printed (from its snapshot), for the office to view or reprint. */
async function getOfficeCertificate(req, res) {
  try {
    const row = await loadOfficeCertificate(pool, req.params.id, req.parishId);
    if (!row) return res.status(404).json({ error: 'Certificate not found.' });
    return res.json({ certificate: toIssuedCertificate(row) });
  } catch (err) {
    return sendError(res, err);
  }
}

/**
 * Logs a reprint of a valid copy (who, when, why) before it is printed again. A reprint keeps
 * the copy's number and is not counted as a new copy.
 */
async function reprintCertificate(req, res) {
  const reason = String((req.body && req.body.reason) || '');
  const note = text(req.body && req.body.note, 500);
  if (!REPRINT_REASONS.has(reason)) {
    return res.status(400).json({ error: 'Choose why this copy is being reprinted.' });
  }
  if (reason === 'other' && !note) {
    return res.status(400).json({ error: 'Say why this copy is being reprinted.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const row = await loadOfficeCertificate(client, req.params.id, req.parishId, true);
    if (!row) throw httpError(404, 'Certificate not found.');
    if (row.status !== 'valid') {
      throw httpError(400, 'Only a valid copy can be reprinted. Issue a new copy instead.');
    }
    // The new printout needs checking again.
    await client.query(
      'UPDATE certificate SET print_confirmed_at = NULL, print_confirmed_by = NULL WHERE id = $1',
      [row.id]
    );
    const inserted = await client.query(
      `INSERT INTO certificate_reprint (certificate_id, parish_id, reason, note, printed_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, printed_at`,
      [row.id, req.parishId, reason, note || null, req.user.id]
    );
    const total = await client.query(
      'SELECT COUNT(*)::int AS n FROM certificate_reprint WHERE certificate_id = $1',
      [row.id]
    );
    await client.query('COMMIT');

    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'certificate.reprinted',
      entityType: 'certificate',
      entityId: row.id,
      metadata: { code: row.certificate_code, reason, note: note || null },
    });
    return res.status(201).json({
      reprint: { id: inserted.rows[0].id, reason, note: note || null },
      reprints: total.rows[0].n,
      certificate: toIssuedCertificate(row),
    });
  } catch (err) {
    await rollback(client);
    if (err.status) return res.status(err.status).json({ error: err.message });
    return sendError(res, err);
  } finally {
    client.release();
  }
}

/** "Yes, it printed correctly": the copy is confirmed by this person, now. */
async function confirmPrint(req, res) {
  try {
    const row = await loadOfficeCertificate(pool, req.params.id, req.parishId);
    if (!row) return res.status(404).json({ error: 'Certificate not found.' });
    if (row.status !== 'valid') {
      return res.status(400).json({ error: 'Only a valid copy can be confirmed.' });
    }
    if (!row.print_confirmed_at) {
      await pool.query(
        `UPDATE certificate SET print_confirmed_at = NOW(), print_confirmed_by = $1
         WHERE id = $2 AND print_confirmed_at IS NULL`,
        [req.user.id, row.id]
      );
      await writeAudit({
        parishId: req.parishId,
        actorId: req.user.id,
        action: 'certificate.print_confirmed',
        entityType: 'certificate',
        entityId: row.id,
        metadata: { code: row.certificate_code },
      });
    }
    return res.json({ id: row.id, printConfirmed: true });
  } catch (err) {
    return sendError(res, err);
  }
}

/**
 * The printout came out wrong and must not be used: the copy is voided as spoiled, with a reason.
 * Its number stays used (no gap) and its QR code shows it as void. A good copy is issued anew.
 */
async function spoilCertificate(req, res) {
  const reason = text(req.body && req.body.reason, 1000);
  if (reason.length < 5) {
    return res.status(400).json({ error: 'Say what was wrong with the printout.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const row = await loadOfficeCertificate(client, req.params.id, req.parishId, true);
    if (!row) throw httpError(404, 'Certificate not found.');
    if (row.status !== 'valid') throw httpError(400, 'Only a valid copy can be marked spoiled.');
    if (row.digital_copy) {
      throw httpError(400, "A digital certificate is never printed, so it can't be spoiled. Use Revoke to withdraw it.");
    }
    await client.query(
      `UPDATE certificate
       SET status = 'invalid', void_kind = 'spoiled',
           invalidated_by = $1, invalidated_at = NOW(), invalidation_reason = $2
       WHERE id = $3`,
      [req.user.id, reason, row.id]
    );
    await client.query('COMMIT');
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'certificate.spoiled',
      entityType: 'certificate',
      entityId: row.id,
      metadata: { code: row.certificate_code, reason },
    });
    return res.json({ id: row.id, status: 'Spoiled', reason });
  } catch (err) {
    await rollback(client);
    if (err.status) return res.status(err.status).json({ error: err.message });
    return sendError(res, err);
  } finally {
    client.release();
  }
}

const RECORD_PATHS = { baptism: 'baptismal', confirmation: 'confirmation', marriage: 'marriage', death: 'death' };

/** Valid printed copies nobody has confirmed yet, oldest first, for the dashboard. */
async function listUnconfirmed(req, res) {
  try {
    const result = await pool.query(
      `SELECT c.id, c.certificate_code, c.holder_name, c.record_type, c.record_id, c.issued_at,
              NULLIF(trim(concat_ws(' ', u.first_name, u.last_name)), '') AS issued_by_name
       FROM certificate c
       LEFT JOIN app_user u ON u.id = c.issued_by
       WHERE c.parish_id = $1 AND c.status = 'valid' AND c.print_confirmed_at IS NULL
       ORDER BY c.issued_at ASC
       LIMIT 50`,
      [req.parishId]
    );
    return res.json({
      certificates: result.rows.map((row) => ({
        id: row.id,
        code: row.certificate_code,
        holderName: row.holder_name,
        sacramentType: row.record_type,
        recordPath: `records/${RECORD_PATHS[row.record_type] || row.record_type}/${row.record_id}`,
        issuedAt: row.issued_at,
        issuedBy: row.issued_by_name || 'Parish office',
      })),
    });
  } catch (err) {
    return sendError(res, err);
  }
}

function holderFromRow(recordType, row) {
  if (recordType === 'marriage') return 'Marriage record';
  return [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(' ') || 'Certificate subject';
}

function issueFromRecord(recordType) {
  return async function issueFromRecordHandler(req, res) {
    const table = RECORD_TABLES[recordType];
    if (!table) return res.status(400).json({ error: 'Unknown record type.' });
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const found = await client.query(`SELECT * FROM ${table} WHERE id = $1 AND parish_id = $2`, [
        req.params.id,
        req.parishId,
      ]);
      const record = found.rows[0];
      if (!record) throw httpError(404, 'Record not found.');
      if (record.archived_at) throw httpError(400, 'Archived records cannot be issued from.');

      const purpose = normalizePurpose(req.body?.purpose);
      if (!purpose) throw httpError(400, 'Choose what the certificate is for.');
      const holder = holderFromRow(recordType, record);
      const details = { subjectName: holder };
      const created = await client.query(
        `INSERT INTO certificate_request (
           parish_id, request_type, record_type, record_id, purpose, copies,
           status, requested_by, processed_by, delivery_method, subject_details
         )
         VALUES ($1, 'walkin', $2, $3, $4, 1, 'processing', $5, $5, 'digital', $6::jsonb)
         RETURNING *`,
        [req.parishId, recordType, record.id, purpose, req.user.id, JSON.stringify(details)]
      );
      const request = created.rows[0];
      const amount = await feeAmount(client, req.parishId, recordType, 1);
      await client.query(
        `INSERT INTO payment (
           certificate_request_id, payment_type, amount_due, amount_tendered, change,
           status, collected_by, paid_at, receipt_number
         )
         VALUES ($1, 'cash', $2, $2, 0, 'paid', $3, NOW(), $4)`,
        [request.id, amount, req.user.id, receiptNumberFor(request.id)]
      );
      const issued = await issueCertificateRow(client, request, req.user.id, req.parishId);
      await client.query(
        `UPDATE certificate_request
         SET status = 'released', certificate_id = $1, updated_at = NOW()
         WHERE id = $2`,
        [issued.id, request.id]
      );
      await client.query('COMMIT');
      await writeAudit({
        parishId: req.parishId,
        actorId: req.user.id,
        action: 'certificate.issued',
        entityType: recordType,
        entityId: record.id,
        metadata: { source: 'register', purpose },
      });
      const certificates = await listRecordCertificates(req.parishId, recordType, record.id);
      return res.status(201).json({ certificates });
    } catch (err) {
      await rollback(client);
      if (err.status) return res.status(err.status).json({ error: err.message });
      return sendError(res, err);
    } finally {
      client.release();
    }
  };
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
  getOfficeCertificate,
  reprintCertificate,
  confirmPrint,
  spoilCertificate,
  listUnconfirmed,
  issueFromRecord,
};
