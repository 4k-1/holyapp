const pool = require('../config/db');
const { writeAudit } = require('../utils/audit');
const { voidEntry, correctEntry } = require('../utils/voidEntry');
const { createNotification } = require('../utils/notify');
const { requiredText, optionalText, dateValue, dateOnly, sendRecordError } = require('../utils/recordFields');
const { frontendUrl } = require('../utils/frontendUrl');
const { findFund, normalizePurpose } = require('../constants/funds');
const { encrypt, decryptRow } = require('../utils/fieldCrypto');
const {
  configured: gcashConfigured,
  createGcashCheckout,
  retrieveCheckout,
  checkoutUrlFrom,
  checkoutIdFrom,
  sessionIsPaid,
  paidPaymentFromSession,
} = require('../utils/paymongo');

/** Upper bound for a single donation, to catch typos like an extra zero. */
const MAX_DONATION = 1000000;
const OFFICE_TYPES = ['Cash', 'GCash', 'Check', 'Bank Transfer'];
/** Paid in a way the bank has to clear before the money counts (D4). */
const CLEARING_TYPES = ['Check', 'Bank Transfer'];

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function parseAmount(value, { min = 1 } = {}) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < min) throw httpError(400, `Enter an amount of at least ₱${min}.`);
  if (amount > MAX_DONATION) throw httpError(400, 'Donation amount is too large.');
  return Math.round(amount * 100) / 100;
}

async function rollback(client) {
  try {
    await client.query('ROLLBACK');
  } catch {
    // nothing to roll back
  }
}

function personName(first, last) {
  return [first, last].filter(Boolean).join(' ').trim();
}

/**
 * Every donation the parish has received: gifts recorded at the office, online GCash gifts that went through,
 * and paid Mass intention donations. Online gifts still waiting on GCash are left out.
 * Voided gifts are listed (marked voided) so the history stays visible; totals must leave them out.
 */
async function listParishDonations(req, res) {
  try {
    const result = await pool.query(
      `SELECT d.id, d.parish_id, d.donor_name, d.donation_type, d.amount, d.donation_date, d.purpose, d.remarks,
              d.created_at, u.first_name, u.last_name,
              CASE WHEN p.id IS NULL THEN 'office' ELSE 'online' END AS source,
              d.receipt_no, d.voided_at, d.void_reason, d.replaces_id,
              NULLIF(TRIM(CONCAT(v.first_name, ' ', v.last_name)), '') AS voided_by_name,
              d.reference, d.bank, d.clearing_status, d.clearing_changed_at, d.bounce_reason,
              NULLIF(TRIM(CONCAT(cb.first_name, ' ', cb.last_name)), '') AS clearing_by_name
       FROM donation d
       LEFT JOIN app_user u ON u.id = d.recorded_by
       LEFT JOIN app_user v ON v.id = d.voided_by
       LEFT JOIN app_user cb ON cb.id = d.clearing_changed_by
       LEFT JOIN payment p ON p.donation_id = d.id
       WHERE d.parish_id = $1 AND (p.id IS NULL OR p.status = 'paid')
       UNION ALL
       SELECT p.id, i.parish_id, i.requester_name, 'GCash', p.amount_due, COALESCE(p.paid_at, p.created_at)::date,
              'Mass intention', 'For ' || i.intention_for, p.created_at, NULL, NULL, 'mass_intention',
              p.receipt_number, NULL, NULL, NULL, NULL,
              NULL, NULL, 'cleared', NULL, NULL, NULL
       FROM payment p
       JOIN mass_intention i ON i.id = p.mass_intention_id
       WHERE i.parish_id = $1 AND p.status = 'paid'
       ORDER BY donation_date DESC, created_at DESC`,
      [req.parishId]
    );
    res.json({ donations: result.rows.map(toParishDonation) });
  } catch (err) {
    sendRecordError(res, err);
  }
}

function toParishDonation(row) {
  row = decryptRow(row, ['donor_name', 'remarks']);
  return {
    id: row.id,
    parishId: row.parish_id,
    donorName: row.donor_name || undefined,
    donationType: row.donation_type,
    amount: Number(row.amount),
    donationDate: dateOnly(row.donation_date),
    purpose: row.purpose || undefined,
    remarks: row.remarks || undefined,
    recordedBy:
      row.source === 'office' ? personName(row.first_name, row.last_name) || 'Parish office' : 'Online (GCash)',
    source: row.source,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    receiptNo: row.receipt_no || undefined,
    voided: row.voided_at
      ? {
          at: new Date(row.voided_at).toISOString(),
          by: row.voided_by_name || 'Parish office',
          reason: row.void_reason,
        }
      : undefined,
    replacesId: row.replaces_id || undefined,
    reference: row.reference || undefined,
    bank: row.bank || undefined,
    clearing: {
      status: row.clearing_status || 'cleared',
      at: row.clearing_changed_at ? new Date(row.clearing_changed_at).toISOString() : undefined,
      by: row.clearing_by_name || undefined,
      reason: row.bounce_reason || undefined,
    },
  };
}

/** The fields staff enter for an office gift, checked. Shared by recording and correcting. */
function officeGiftFields(body) {
  const amount = parseAmount(body?.amount);
  const type = requiredText(body?.donationType, 'Donation type');
  if (!OFFICE_TYPES.includes(type)) throw httpError(400, 'Donation type is not valid.');
  // D4: a cheque needs its number; a transfer may carry its reference. Neither is money in hand
  // until the bank clears it, so both start pending.
  const reference = CLEARING_TYPES.includes(type) ? optionalText(body?.reference) : null;
  if (type === 'Check' && !reference) throw httpError(400, 'Enter the cheque number.');
  if (reference && reference.length > 60) throw httpError(400, 'Keep the reference under 60 characters.');
  const bank = type === 'Check' ? optionalText(body?.bank) : null;
  if (bank && bank.length > 80) throw httpError(400, 'Keep the bank name under 80 characters.');
  return {
    reference,
    bank,
    clearingStatus: CLEARING_TYPES.includes(type) ? 'pending' : 'cleared',
    amount,
    type,
    date: dateValue(body?.donationDate, 'Donation date'),
    donorName: optionalText(body?.donorName),
    purpose: normalizePurpose(optionalText(body?.purpose)),
    remarks: optionalText(body?.remarks),
  };
}

/** Saves an office gift with the next receipt number. `replacesId` links a correction to the gift it replaces. */
async function insertOfficeGift(db, { parishId, userId, fields, replacesId = null }) {
  const inserted = await db.query(
    `INSERT INTO donation (parish_id, donor_name, donation_type, amount, donation_date, purpose, remarks, recorded_by,
                           receipt_no, replaces_id, reference, bank, clearing_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, next_number($1, 'DON'), $9, $10, $11, $12)
     RETURNING *`,
    [
      parishId,
      encrypt(fields.donorName),
      fields.type,
      fields.amount,
      fields.date,
      fields.purpose,
      encrypt(fields.remarks),
      userId,
      replacesId,
      fields.reference,
      fields.bank,
      fields.clearingStatus,
    ]
  );
  return inserted.rows[0];
}

async function recordDonation(req, res) {
  try {
    const fields = officeGiftFields(req.body);
    const row = await insertOfficeGift(pool, { parishId: req.parishId, userId: req.user.id, fields });
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'donation.recorded',
      entityType: 'donation',
      entityId: row.id,
      metadata: { amount: fields.amount, type: fields.type, receiptNo: row.receipt_no },
    });
    res.status(201).json({ id: row.id, receiptNo: row.receipt_no });
  } catch (err) {
    sendRecordError(res, err);
  }
}

async function inTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await rollback(client);
    throw err;
  } finally {
    client.release();
  }
}

/** Voids a gift: it stays on record, marked voided with the reason, and drops out of totals. Admins only. */
async function voidDonation(req, res) {
  try {
    const row = await inTransaction((db) =>
      voidEntry(db, {
        table: 'donation',
        id: req.params.id,
        parishId: req.parishId,
        actorId: req.user.id,
        reason: req.body?.reason,
      })
    );
    res.json({ id: row.id, receiptNo: row.receipt_no, voidedAt: new Date(row.voided_at).toISOString() });
  } catch (err) {
    sendRecordError(res, err);
  }
}

/**
 * Marks a pending cheque or transfer cleared or bounced (D4). Admins only. Once set it stays set;
 * a mistake is fixed with void or correct. Bounced needs a reason and never counts in totals.
 */
function settleDonation(outcome) {
  return async function settle(req, res) {
    try {
      const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';
      if (outcome === 'bounced' && reason.length < 5) {
        throw httpError(400, 'Say why it bounced (at least a few words).');
      }
      if (reason.length > 500) throw httpError(400, 'Keep the reason under 500 characters.');
      if (!/^[0-9a-f-]{36}$/i.test(String(req.params.id))) throw httpError(404, 'Donation not found.');
      const row = await inTransaction(async (db) => {
        const found = await db.query('SELECT * FROM donation WHERE id = $1 AND parish_id = $2 FOR UPDATE', [
          req.params.id,
          req.parishId,
        ]);
        const gift = found.rows[0];
        if (!gift) throw httpError(404, 'Donation not found.');
        if (gift.voided_at) throw httpError(400, 'This donation has been voided.');
        if (gift.clearing_status !== 'pending') {
          throw httpError(409, `This donation is already marked ${gift.clearing_status}.`);
        }
        const updated = await db.query(
          `UPDATE donation
           SET clearing_status = $2, clearing_changed_at = NOW(), clearing_changed_by = $3, bounce_reason = $4
           WHERE id = $1
           RETURNING *`,
          [gift.id, outcome, req.user.id, outcome === 'bounced' ? reason : null]
        );
        await db.query(
          `INSERT INTO audit_log (parish_id, actor_id, action, entity_type, entity_id, metadata)
           VALUES ($1, $2, $3, 'donation', $4, $5)`,
          [
            req.parishId,
            req.user.id,
            `donation.${outcome}`,
            gift.id,
            JSON.stringify({ receiptNo: gift.receipt_no, amount: Number(gift.amount), reason: reason || undefined }),
          ]
        );
        return updated.rows[0];
      });
      res.json({ id: row.id, status: row.clearing_status });
    } catch (err) {
      sendRecordError(res, err);
    }
  };
}

const clearDonation = settleDonation('cleared');
const bounceDonation = settleDonation('bounced');

/** Corrects an office gift: voids it and saves the corrected gift, with a new receipt number. Admins only. */
async function correctDonation(req, res) {
  try {
    const fields = officeGiftFields(req.body);
    const { original, replacement } = await inTransaction(async (db) => {
      const online = await db.query('SELECT 1 FROM payment WHERE donation_id = $1', [req.params.id]);
      if (online.rowCount > 0) {
        throw httpError(400, "Online gifts can't be corrected, because GCash set the amount. Void it if it was refunded.");
      }
      return correctEntry(db, {
        table: 'donation',
        id: req.params.id,
        parishId: req.parishId,
        actorId: req.user.id,
        reason: req.body?.reason,
        insertReplacement: (tx, old) =>
          insertOfficeGift(tx, { parishId: req.parishId, userId: req.user.id, fields, replacesId: old.id }),
      });
    });
    res.status(201).json({
      id: replacement.id,
      receiptNo: replacement.receipt_no,
      replaces: { id: original.id, receiptNo: original.receipt_no },
    });
  } catch (err) {
    sendRecordError(res, err);
  }
}

function toMyDonation(row) {
  row = decryptRow(row, ['donor_name']);
  return {
    id: row.id,
    amount: Number(row.amount),
    purpose: row.purpose || undefined,
    donorName: row.donor_name || undefined,
    donationDate: dateOnly(row.donation_date),
    status: row.payment_status === 'paid' ? 'paid' : 'pending',
    receiptUrl: row.receipt_url || undefined,
  };
}

/** A parishioner's own online gifts, newest first. Gifts the office voided (e.g. refunded) are left out. */
async function listMyDonations(req, res) {
  try {
    const result = await pool.query(
      `SELECT d.*, p.status AS payment_status, p.receipt_url
       FROM donation d
       JOIN payment p ON p.donation_id = d.id
       WHERE d.parish_id = $1 AND d.recorded_by = $2 AND d.voided_at IS NULL
       ORDER BY d.created_at DESC
       LIMIT 50`,
      [req.parishId, req.user.id]
    );
    res.json({ donations: result.rows.map(toMyDonation), gcashDonations: gcashConfigured() });
  } catch (err) {
    sendRecordError(res, err);
  }
}

/** Starts an online gift: saves it as pending and hands back the GCash checkout page. */
async function giveDonation(req, res) {
  if (!gcashConfigured()) {
    return res.status(503).json({ error: 'Online GCash giving is not available yet. You can give at the parish office.' });
  }
  const client = await pool.connect();
  try {
    const amount = parseAmount(req.body?.amount, { min: 20 });
    // Online gifts go only to a listed fund; staff can type others at the office.
    const fund = findFund(requiredText(req.body?.purpose, 'Purpose'));
    if (!fund) throw httpError(400, 'Choose one of the parish funds.');
    const purpose = fund.name;
    const donorName = optionalText(req.body?.donorName);
    const message = optionalText(req.body?.message);
    const guest = !req.user;
    const guestEmail = optionalText(req.body?.email);
    if (guestEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) throw httpError(400, 'Enter a valid email address.');

    await client.query('BEGIN');
    const inserted = await client.query(
      `INSERT INTO donation (parish_id, donor_name, donation_type, amount, donation_date, purpose, remarks, recorded_by)
       VALUES ($1, $2, 'GCash', $3, CURRENT_DATE, $4, $5, $6)
       RETURNING *`,
      [req.parishId, encrypt(donorName), amount, purpose, encrypt(message), req.user?.id || null]
    );
    const donation = inserted.rows[0];
    const payment = await client.query(
      `INSERT INTO payment (payment_type, amount_due, status, donation_id)
       VALUES ('gcash', $1, 'unpaid', $2)
       RETURNING id`,
      [amount, donation.id]
    );
    const slug = await client.query('SELECT slug FROM parish WHERE id = $1', [req.parishId]);
    const person = guest
      ? { first_name: donorName, email: guestEmail }
      : (await client.query('SELECT first_name, last_name, email FROM app_user WHERE id = $1', [req.user.id])).rows[0] || {};
    const back = guest
      ? `${frontendUrl()}/give/${slug.rows[0].slug}/donate`
      : `${frontendUrl()}/${slug.rows[0].slug}/portal/donate`;
    const session = await createGcashCheckout({
      amountCentavos: Math.round(amount * 100),
      description: `Donation: ${purpose}`,
      referenceNumber: donation.id,
      successUrl: `${back}?donation=done&id=${donation.id}`,
      cancelUrl: `${back}?donation=cancelled&id=${donation.id}`,
      metadata: { donation_id: donation.id, parish_id: req.parishId },
      billing: person.email
        ? { name: personName(person.first_name, person.last_name) || person.email, email: person.email }
        : undefined,
    });
    const checkoutUrl = checkoutUrlFrom(session);
    if (!checkoutUrl) throw httpError(502, 'GCash did not return a checkout page. Please try again.');
    await client.query('UPDATE payment SET paymongo_reference = $1, checkout_url = $2 WHERE id = $3', [
      checkoutIdFrom(session),
      checkoutUrl,
      payment.rows[0].id,
    ]);
    await client.query('COMMIT');
    res.status(201).json({ donation: toMyDonation({ ...donation, payment_status: 'unpaid' }), checkoutUrl });
  } catch (err) {
    await rollback(client);
    sendRecordError(res, err);
  } finally {
    client.release();
  }
}

/** Marks an online gift paid. Shared by the return-from-GCash sync and the PayMongo webhook. */
async function markDonationPaid(client, { donationId, reference, receiptUrl }) {
  const payment = await client.query(
    `UPDATE payment
     SET status = 'paid', paid_at = NOW(), paymongo_reference = COALESCE($2, paymongo_reference),
         receipt_url = COALESCE($3, receipt_url)
     WHERE donation_id = $1 AND status = 'unpaid'
     RETURNING amount_due`,
    [donationId, reference || null, receiptUrl || null]
  );
  if (payment.rowCount > 0) {
    // The receipt number is given when the gift is paid, so abandoned checkouts leave no gaps.
    await client.query(
      `UPDATE donation
       SET donation_date = CURRENT_DATE, receipt_no = COALESCE(receipt_no, next_number(parish_id, 'DON'))
       WHERE id = $1`,
      [donationId]
    );
  }
  const row = await client.query('SELECT * FROM donation WHERE id = $1', [donationId]);
  return {
    alreadyPaid: payment.rowCount === 0,
    amount: payment.rows[0] ? Number(payment.rows[0].amount_due) : 0,
    row: row.rows[0] || null,
  };
}

async function announceGift(row, amount, actorId, source) {
  try {
    const office = await pool.query(
      `SELECT id FROM app_user
       WHERE parish_id = $1 AND role IN ('parish_admin', 'parish_staff') AND status = 'active'`,
      [row.parish_id]
    );
    for (const person of office.rows) {
      await createNotification({
        parishId: row.parish_id,
        recipientId: person.id,
        kind: 'payment',
        title: 'Online donation received',
        body: `${row.donor_name || 'An anonymous parishioner'} gave ₱${amount.toLocaleString('en-PH')} through GCash for ${row.purpose || 'the parish'}.`,
        href: 'donations',
      });
    }
  } catch (err) {
    console.error('announceGift failed:', err.message);
  }
  await writeAudit({
    parishId: row.parish_id,
    actorId,
    action: 'donation.received',
    entityType: 'donation',
    entityId: row.id,
    metadata: { amount, method: 'gcash', source },
  });
}

/** After returning from GCash: ask PayMongo whether the gift went through. */
async function syncMyDonation(req, res) {
  const client = await pool.connect();
  try {
    const found = await client.query(
      `SELECT d.*, p.paymongo_reference, p.status AS payment_status, p.receipt_url
       FROM donation d
       JOIN payment p ON p.donation_id = d.id
       WHERE d.id = $1 AND d.parish_id = $2 AND d.recorded_by IS NOT DISTINCT FROM $3`,
      [req.params.id, req.parishId, req.user?.id || null]
    );
    const row = found.rows[0];
    if (!row) return res.status(404).json({ error: 'Donation not found.' });
    if (row.payment_status === 'paid' || !row.paymongo_reference || !gcashConfigured()) {
      return res.json({ donation: toMyDonation(row), paid: row.payment_status === 'paid' });
    }
    const session = await retrieveCheckout(row.paymongo_reference);
    if (!sessionIsPaid(session)) return res.json({ donation: toMyDonation(row), paid: false });

    const paidPay = paidPaymentFromSession(session);
    await client.query('BEGIN');
    const marked = await markDonationPaid(client, {
      donationId: row.id,
      reference: checkoutIdFrom(session),
      receiptUrl: paidPay?.attributes?.receipt_url || paidPay?.attributes?.invoice_url,
    });
    await client.query('COMMIT');
    if (!marked.alreadyPaid) await announceGift(marked.row, marked.amount, req.user?.id || null, 'sync');
    res.json({ donation: toMyDonation({ ...marked.row, payment_status: 'paid' }), paid: true });
  } catch (err) {
    await rollback(client);
    sendRecordError(res, err);
  } finally {
    client.release();
  }
}

module.exports = {
  clearDonation,
  bounceDonation,
  listParishDonations,
  recordDonation,
  voidDonation,
  correctDonation,
  listMyDonations,
  giveDonation,
  syncMyDonation,
  markDonationPaid,
  announceGift,
};
