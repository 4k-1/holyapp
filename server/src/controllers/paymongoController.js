const pool = require('../config/db');
const { writeAudit } = require('../utils/audit');
const { createNotification } = require('../utils/notify');
const { feeCentavos, feeLabel } = require('../utils/serviceFee');
const { frontendUrl } = require('../utils/frontendUrl');
const {
  configured,
  createGcashCheckout,
  retrieveCheckout,
  checkoutUrlFrom,
  checkoutIdFrom,
  checkoutStatus,
  sessionIsPaid,
  paidPaymentFromSession,
  verifyWebhookSignature,
  eventType,
  eventId,
  checkoutFromWebhook,
} = require('../utils/paymongo');
const {
  loadRequest,
  toCertificateRequest,
  receiptNumberFor,
} = require('./certificateRequestController');
const { markIntentionDonationPaid, announceDonation } = require('./intentionController');
const { markDonationPaid, announceGift } = require('./donationController');

function sendError(res, err) {
  console.error(err);
  return res.status(500).json({ error: 'Could not complete this payment.' });
}

async function rollback(client) {
  try {
    await client.query('ROLLBACK');
  } catch {
    /* the transaction may already be closed */
  }
}

async function parishSlug(parishId) {
  const result = await pool.query('SELECT slug, name FROM parish WHERE id = $1', [parishId]);
  return result.rows[0] || { slug: '', name: '' };
}

async function notifyOfficePaid(parishId, requestId, subjectName, amount) {
  try {
    const admins = await pool.query(
      `SELECT id FROM app_user
       WHERE parish_id = $1 AND role IN ('parish_admin', 'parish_staff') AND status = 'active'`,
      [parishId]
    );
    for (const row of admins.rows) {
      await createNotification({
        parishId,
        recipientId: row.id,
        kind: 'payment',
        title: 'GCash payment received',
        body: `${subjectName || 'A parishioner'} paid ₱${Number(amount).toFixed(2)} for a certificate request.`,
        href: 'requests',
      });
    }
  } catch (err) {
    console.error('notifyOfficePaid failed:', err.message);
  }
}

async function applyPaid(client, { requestId, parishId, method, reference, receiptUrl, actorId }) {
  const payment = await client.query(
    `SELECT id, status, amount_due, receipt_number
     FROM payment
     WHERE certificate_request_id = $1
     ORDER BY created_at DESC
     LIMIT 1
     FOR UPDATE`,
    [requestId]
  );
  const row = payment.rows[0];
  if (!row) {
    const err = new Error('This request has no fee to collect.');
    err.status = 400;
    throw err;
  }
  if (row.status === 'paid') {
    return { alreadyPaid: true, amount: Number(row.amount_due), receiptNumber: row.receipt_number };
  }

  const number = row.receipt_number || receiptNumberFor(requestId);
  await client.query(
    `UPDATE payment
     SET status = 'paid',
         payment_type = $1,
         amount_tendered = amount_due,
         change = 0,
         collected_by = $2,
         paid_at = NOW(),
         paymongo_reference = COALESCE($3, paymongo_reference),
         receipt_url = COALESCE($4, receipt_url),
         receipt_number = $5
     WHERE id = $6`,
    [method, actorId || null, reference || null, receiptUrl || null, number, row.id]
  );
  return { alreadyPaid: false, amount: Number(row.amount_due), receiptNumber: number };
}

async function startGcashCheckout(req, res) {
  if (!configured()) {
    return res.status(503).json({ error: 'GCash payments are not configured.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query(
      `SELECT r.id, r.parish_id, r.status, r.record_id, r.record_type, r.requested_by,
              r.subject_details, p.id AS payment_id, p.status AS payment_status,
              p.amount_due, p.paymongo_reference, p.checkout_url
       FROM certificate_request r
       LEFT JOIN LATERAL (
         SELECT id, status, amount_due, paymongo_reference, checkout_url
         FROM payment
         WHERE certificate_request_id = r.id
         ORDER BY created_at DESC
         LIMIT 1
       ) p ON true
       WHERE r.id = $1 AND r.parish_id = $2 AND r.requested_by = $3
       FOR UPDATE OF r`,
      [req.params.id, req.parishId, req.user.id]
    );
    const request = current.rows[0];
    if (!request) {
      await rollback(client);
      return res.status(404).json({ error: 'Request not found.' });
    }
    if (request.status !== 'processing' || !request.record_id) {
      await rollback(client);
      return res.status(400).json({ error: 'Staff must match this request to a register entry before you can pay.' });
    }
    if (!request.payment_id) {
      await rollback(client);
      return res.status(400).json({ error: 'This request has no fee to collect.' });
    }
    if (request.payment_status === 'paid') {
      await client.query('COMMIT');
      return res.json({ paid: true, request: toCertificateRequest(await loadRequest(request.id, req.parishId, req.user.id)) });
    }

    if (request.paymongo_reference) {
      try {
        const existing = await retrieveCheckout(request.paymongo_reference);
        if (sessionIsPaid(existing)) {
          const paidPay = paidPaymentFromSession(existing);
          const receiptUrl =
            paidPay && paidPay.attributes && (paidPay.attributes.receipt_url || paidPay.attributes.invoice_url);
          const marked = await applyPaid(client, {
            requestId: request.id,
            parishId: req.parishId,
            method: 'gcash',
            reference: checkoutIdFrom(existing) || request.paymongo_reference,
            receiptUrl,
            actorId: req.user.id,
          });
          await client.query('COMMIT');
          if (!marked.alreadyPaid) {
            const details = request.subject_details || {};
            await notifyOfficePaid(req.parishId, request.id, details.subjectName, marked.amount);
            await writeAudit({
              parishId: req.parishId,
              actorId: req.user.id,
              action: 'certificate_request.payment_recorded',
              entityType: 'certificate_request',
              entityId: request.id,
              metadata: { amount: marked.amount, method: 'gcash' },
            });
          }
          return res.json({
            paid: true,
            request: toCertificateRequest(await loadRequest(request.id, req.parishId, req.user.id)),
          });
        }
        const stillOpen = checkoutStatus(existing) !== 'expired' && checkoutUrlFrom(existing);
        if (stillOpen) {
          await client.query('COMMIT');
          return res.json({ checkoutUrl: checkoutUrlFrom(existing), paid: false });
        }
      } catch (err) {
        console.error('Could not reuse PayMongo checkout:', err.message);
      }
    }

    const parish = await parishSlug(req.parishId);
    const origin = frontendUrl();
    const successUrl = `${origin}/${parish.slug}/portal/requests?paid=1&request=${request.id}`;
    const cancelUrl = `${origin}/${parish.slug}/portal/requests?paid=0&request=${request.id}`;
    const payer = await client.query(
      'SELECT first_name, last_name, email FROM app_user WHERE id = $1',
      [req.user.id]
    );
    const person = payer.rows[0] || {};
    const session = await createGcashCheckout({
      amountCentavos: feeCentavos(request.amount_due),
      description: feeLabel(request.record_type),
      referenceNumber: request.id,
      successUrl,
      cancelUrl,
      metadata: {
        request_id: request.id,
        parish_id: req.parishId,
        payment_id: request.payment_id,
      },
      billing: person.email
        ? {
            name: [person.first_name, person.last_name].filter(Boolean).join(' ') || person.email,
            email: person.email,
          }
        : undefined,
    });
    const checkoutId = checkoutIdFrom(session);
    const checkoutUrl = checkoutUrlFrom(session);
    if (!checkoutId || !checkoutUrl) {
      await rollback(client);
      return res.status(502).json({ error: 'PayMongo did not return a checkout page.' });
    }

    await client.query(
      `UPDATE payment
       SET payment_type = 'gcash',
           paymongo_reference = $1,
           checkout_url = $2
       WHERE id = $3`,
      [checkoutId, checkoutUrl, request.payment_id]
    );
    await client.query('COMMIT');
    return res.json({ checkoutUrl, paid: false });
  } catch (err) {
    await rollback(client);
    if (err.status) return res.status(err.status).json({ error: err.message });
    return sendError(res, err);
  } finally {
    client.release();
  }
}

async function syncGcashPayment(req, res) {
  try {
    const row = await loadRequest(req.params.id, req.parishId, req.user.id);
    if (!row) return res.status(404).json({ error: 'Request not found.' });
    if (row.payment_status === 'paid') {
      return res.json({ paid: true, request: toCertificateRequest(row) });
    }

    const payment = await pool.query(
      `SELECT paymongo_reference, amount_due
       FROM payment
       WHERE certificate_request_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [req.params.id]
    );
    const ref = payment.rows[0] && payment.rows[0].paymongo_reference;
    if (!ref) {
      return res.json({ paid: false, request: toCertificateRequest(row) });
    }

    const session = await retrieveCheckout(ref);
    if (!sessionIsPaid(session)) {
      return res.json({ paid: false, request: toCertificateRequest(row) });
    }

    const paidPay = paidPaymentFromSession(session);
    const paidAmount = paidPay && paidPay.attributes && paidPay.attributes.amount;
    const expected = feeCentavos(payment.rows[0].amount_due);
    if (Number.isFinite(Number(paidAmount)) && Number(paidAmount) < expected) {
      return res.status(400).json({ error: 'Paid amount does not match the certificate fee.' });
    }

    const client = await pool.connect();
    let marked;
    try {
      await client.query('BEGIN');
      marked = await applyPaid(client, {
        requestId: req.params.id,
        parishId: req.parishId,
        method: 'gcash',
        reference: checkoutIdFrom(session) || ref,
        receiptUrl: paidPay && paidPay.attributes && (paidPay.attributes.receipt_url || paidPay.attributes.invoice_url),
        actorId: req.user.id,
      });
      await client.query('COMMIT');
    } catch (err) {
      await rollback(client);
      throw err;
    } finally {
      client.release();
    }

    if (!marked.alreadyPaid) {
      const details = row.subject_details || {};
      await notifyOfficePaid(req.parishId, req.params.id, details.subjectName, marked.amount);
      await writeAudit({
        parishId: req.parishId,
        actorId: req.user.id,
        action: 'certificate_request.payment_recorded',
        entityType: 'certificate_request',
        entityId: req.params.id,
        metadata: { amount: marked.amount, method: 'gcash' },
      });
    }
    return res.json({
      paid: true,
      request: toCertificateRequest(await loadRequest(req.params.id, req.parishId, req.user.id)),
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return sendError(res, err);
  }
}

async function getReceipt(req, res) {
  try {
    const ownerOnly = req.user.role === 'parishioner' ? req.user.id : null;
    const row = await loadRequest(req.params.id, req.parishId, ownerOnly);
    if (!row) return res.status(404).json({ error: 'Request not found.' });
    if (row.payment_status !== 'paid') {
      return res.status(400).json({ error: 'This request has not been paid yet.' });
    }
    const parish = await parishSlug(req.parishId);
    const details = row.subject_details || {};
    return res.json({
      receipt: {
        number: row.receipt_number || receiptNumberFor(row.id),
        requestId: row.id,
        parishName: parish.name,
        subjectName: details.subjectName || 'Certificate subject',
        sacramentType: row.record_type,
        amount: Number(row.amount_due),
        method: row.payment_type,
        paidAt: row.paid_at ? new Date(row.paid_at).toISOString() : null,
        paymongoUrl: row.receipt_url || undefined,
      },
    });
  } catch (err) {
    return sendError(res, err);
  }
}

/** Webhook branch for optional Mass intention donations (metadata.intention_id). */
async function handleIntentionDonation(res, { session, checkoutId, intentionId, evtId, type }) {
  if (!sessionIsPaid({ data: session }) && type !== 'payment.paid') {
    return res.json({ ok: true, ignored: true });
  }
  const paidPay = paidPaymentFromSession({ data: session });
  const client = await pool.connect();
  let marked;
  try {
    await client.query('BEGIN');
    marked = await markIntentionDonationPaid(client, {
      intentionId,
      reference: checkoutId,
      receiptUrl: paidPay && paidPay.attributes && (paidPay.attributes.receipt_url || paidPay.attributes.invoice_url),
    });
    if (evtId) {
      await client.query('INSERT INTO paymongo_event (id) VALUES ($1) ON CONFLICT (id) DO NOTHING', [evtId]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await rollback(client);
    return sendError(res, err);
  } finally {
    client.release();
  }
  if (!marked.row) return res.json({ ok: true, ignored: true });
  if (!marked.alreadyPaid) await announceDonation(marked.row, marked.amount, null, 'paymongo');
  return res.json({ ok: true, paid: true });
}

/** Webhook branch for online parish donations (metadata.donation_id). */
async function handleParishDonation(res, { session, checkoutId, donationId, evtId, type }) {
  if (!sessionIsPaid({ data: session }) && type !== 'payment.paid') {
    return res.json({ ok: true, ignored: true });
  }
  const paidPay = paidPaymentFromSession({ data: session });
  const client = await pool.connect();
  let marked;
  try {
    await client.query('BEGIN');
    marked = await markDonationPaid(client, {
      donationId,
      reference: checkoutId,
      receiptUrl: paidPay && paidPay.attributes && (paidPay.attributes.receipt_url || paidPay.attributes.invoice_url),
    });
    if (evtId) {
      await client.query('INSERT INTO paymongo_event (id) VALUES ($1) ON CONFLICT (id) DO NOTHING', [evtId]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await rollback(client);
    return sendError(res, err);
  } finally {
    client.release();
  }
  if (!marked.row) return res.json({ ok: true, ignored: true });
  if (!marked.alreadyPaid) await announceGift(marked.row, marked.amount, null, 'paymongo');
  return res.json({ ok: true, paid: true });
}

async function handlePaymongoWebhook(req, res) {
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
  if (!verifyWebhookSignature(raw, req.headers['paymongo-signature'])) {
    return res.status(400).json({ error: 'Invalid PayMongo signature.' });
  }

  let payload;
  try {
    payload = JSON.parse(raw.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid webhook body.' });
  }

  const type = eventType(payload);
  if (type && type !== 'checkout_session.payment.paid' && type !== 'payment.paid') {
    return res.json({ ok: true, ignored: true });
  }

  const evtId = String(eventId(payload) || '').slice(0, 80);
  if (evtId) {
    const seen = await pool.query('SELECT id FROM paymongo_event WHERE id = $1', [evtId]);
    if (seen.rows[0]) return res.json({ ok: true, duplicate: true });
  }

  const session = checkoutFromWebhook(payload) || payload.data;
  const checkoutId = session && session.id;
  const attrs = (session && session.attributes) || {};
  const intentionId = attrs.metadata && attrs.metadata.intention_id;
  if (intentionId) return handleIntentionDonation(res, { session, checkoutId, intentionId, evtId, type });
  const donationId = attrs.metadata && attrs.metadata.donation_id;
  if (donationId) return handleParishDonation(res, { session, checkoutId, donationId, evtId, type });

  const requestId = (attrs.metadata && attrs.metadata.request_id) || attrs.reference_number;
  if (!requestId) return res.json({ ok: true, ignored: true });

  const lookup = await pool.query(
    `SELECT r.id, r.parish_id, r.subject_details, p.status AS payment_status, p.amount_due
     FROM certificate_request r
     JOIN payment p ON p.certificate_request_id = r.id
     WHERE r.id = $1
        OR p.paymongo_reference = $2
     ORDER BY p.created_at DESC
     LIMIT 1`,
    [requestId, checkoutId || '']
  );
  const found = lookup.rows[0];
  if (!found) return res.json({ ok: true, ignored: true });

  if (!sessionIsPaid({ data: session }) && type !== 'payment.paid') {
    return res.json({ ok: true, ignored: true });
  }

  const paidPay = paidPaymentFromSession({ data: session });
  const client = await pool.connect();
  let marked;
  try {
    await client.query('BEGIN');
    marked = await applyPaid(client, {
      requestId: found.id,
      parishId: found.parish_id,
      method: 'gcash',
      reference: checkoutId,
      receiptUrl: paidPay && paidPay.attributes && (paidPay.attributes.receipt_url || paidPay.attributes.invoice_url),
      actorId: null,
    });
    if (evtId) {
      await client.query('INSERT INTO paymongo_event (id) VALUES ($1) ON CONFLICT (id) DO NOTHING', [evtId]);
    }
    await client.query('COMMIT');
  } catch (err) {
    await rollback(client);
    return sendError(res, err);
  } finally {
    client.release();
  }

  if (!marked.alreadyPaid) {
    const details = found.subject_details || {};
    await notifyOfficePaid(found.parish_id, found.id, details.subjectName, marked.amount);
    await writeAudit({
      parishId: found.parish_id,
      actorId: null,
      action: 'certificate_request.payment_recorded',
      entityType: 'certificate_request',
      entityId: found.id,
      metadata: { amount: marked.amount, method: 'gcash', source: 'paymongo' },
    });
  }

  return res.json({ ok: true, paid: true });
}

module.exports = {
  startGcashCheckout,
  syncGcashPayment,
  getReceipt,
  handlePaymongoWebhook,
};
