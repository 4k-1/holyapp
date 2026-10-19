const crypto = require('crypto');

const PAYMONGO_HOST = 'https://api.paymongo.com';

function secretKey() {
  return String(process.env.PAYMONGO_SECRET_KEY || '').trim();
}

function webhookSecret() {
  return String(process.env.PAYMONGO_WEBHOOK_SECRET || '').trim();
}

function configured() {
  return Boolean(secretKey());
}

async function paymongoFetch(path, { method = 'GET', body } = {}) {
  const key = secretKey();
  if (!key) {
    const err = new Error('GCash payments are not configured.');
    err.status = 503;
    throw err;
  }

  const response = await fetch(`${PAYMONGO_HOST}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let json = {};
  try {
    json = await response.json();
  } catch {
    json = {};
  }

  if (!response.ok) {
    const detail =
      (json.errors && json.errors[0] && json.errors[0].detail) ||
      json.error ||
      'PayMongo could not complete this payment.';
    const err = new Error(detail);
    err.status = response.status >= 400 && response.status < 500 ? 400 : 502;
    throw err;
  }
  return json;
}

function checkoutUrlFrom(session) {
  const attrs = session && session.data && session.data.attributes;
  return (attrs && (attrs.checkout_url || attrs.checkoutUrl)) || null;
}

function checkoutIdFrom(session) {
  return (session && session.data && session.data.id) || null;
}

function checkoutStatus(session) {
  const attrs = session && session.data && session.data.attributes;
  return (attrs && attrs.status) || '';
}

function paidPaymentFromSession(session) {
  const attrs = (session && session.data && session.data.attributes) || {};
  const payments = Array.isArray(attrs.payments) ? attrs.payments : [];
  return payments.find((item) => {
    const status = (item && item.attributes && item.attributes.status) || item.status;
    return status === 'paid';
  }) || null;
}

function sessionIsPaid(session) {
  if (paidPaymentFromSession(session)) return true;
  const intent = session && session.data && session.data.attributes && session.data.attributes.payment_intent;
  const intentStatus = intent && intent.attributes && intent.attributes.status;
  return intentStatus === 'succeeded';
}

async function createGcashCheckout({
  amountCentavos,
  description,
  referenceNumber,
  successUrl,
  cancelUrl,
  metadata,
  billing,
}) {
  if (!Number.isInteger(amountCentavos) || amountCentavos < 100) {
    const err = new Error('Certificate fee is too small to collect through GCash.');
    err.status = 400;
    throw err;
  }

  return paymongoFetch('/v2/checkout_sessions', {
    method: 'POST',
    body: {
      data: {
        attributes: {
          line_items: [
            {
              name: description,
              amount: amountCentavos,
              currency: 'PHP',
              quantity: 1,
            },
          ],
          payment_method_types: ['gcash'],
          success_url: successUrl,
          cancel_url: cancelUrl,
          reference_number: String(referenceNumber).slice(0, 255),
          send_email_receipt: true,
          description: String(description).slice(0, 255),
          metadata: metadata || {},
          billing: billing || undefined,
        },
      },
    },
  });
}

async function retrieveCheckout(checkoutId) {
  const id = encodeURIComponent(checkoutId);
  try {
    return await paymongoFetch(`/v2/checkout_sessions/${id}`);
  } catch (err) {
    if (err.status === 400 || err.status === 404) {
      return paymongoFetch(`/v1/checkout_sessions/${id}`);
    }
    throw err;
  }
}

function timingSafeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function expectedHmac(secret, payload) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function verifyWebhookSignature(rawBody, signatureHeader) {
  const secret = webhookSecret();
  if (!secret) return false;
  const raw = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody || '');
  const header = String(signatureHeader || '').trim();
  if (!header) return false;

  const parts = {};
  for (const piece of header.split(',')) {
    const [key, ...rest] = piece.split('=');
    if (key && rest.length) parts[key.trim()] = rest.join('=').trim();
  }

  if (parts.t && (parts.te || parts.li)) {
    const signed = `${parts.t}.${raw}`;
    const test = parts.te && timingSafeEqual(expectedHmac(secret, signed), parts.te);
    const live = parts.li && timingSafeEqual(expectedHmac(secret, signed), parts.li);
    return Boolean(test || live);
  }

  return timingSafeEqual(expectedHmac(secret, raw), header);
}

function eventType(payload) {
  if (!payload || typeof payload !== 'object') return '';
  return (
    (payload.data && payload.data.attributes && payload.data.attributes.type) ||
    (payload.data && payload.data.type) ||
    payload.type ||
    ''
  );
}

function eventId(payload) {
  if (!payload || typeof payload !== 'object') return '';
  return (payload.data && payload.data.id) || payload.id || '';
}

function checkoutFromWebhook(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const nested = payload.data && payload.data.attributes && payload.data.attributes.data;
  if (nested && nested.id) return nested;
  if (payload.data && payload.data.id && payload.data.type === 'checkout_session') return payload.data;
  if (payload.data && payload.data.data && payload.data.data.id) return payload.data.data;
  return null;
}

module.exports = {
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
};
