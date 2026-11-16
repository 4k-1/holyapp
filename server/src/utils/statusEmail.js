// Emails a parishioner when the parish office changes the status of one of their requests
// (certificate requests, marriage applications, Mass intentions).
//
// Sent after the change is saved, in the background: a mail failure is logged and never
// undoes or fails the status change. Uses the same SMTP settings as the sign-in emails
// (SMTP_* in server/.env). Set STATUS_EMAILS=false to stop these emails.

const pool = require('../config/db');
const mailer = require('./mailer');
const { frontendUrl } = require('./frontendUrl');
const { createNotification } = require('./notify');

const TEAL = '#16798C';
const DEEP_TEAL = '#0E3B46';
const INK = '#15323A';
const MUTED = '#55707A';
const TINT = '#E8F5F5';

const pending = new Set();

function enabled() {
  return String(process.env.STATUS_EMAILS || '').trim().toLowerCase() !== 'false';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** The parishioner's email and first name, with their parish's name and link; null for anyone else. */
async function loadRecipient(userId, parishId) {
  if (!userId || !parishId) return null;
  const result = await pool.query(
    `SELECT u.email, u.first_name, p.name AS parish_name, p.slug AS parish_slug
     FROM app_user u
     JOIN parish p ON p.id = $2
     WHERE u.id = $1 AND u.role = 'parishioner'`,
    [userId, parishId]
  );
  const row = result.rows[0];
  return row && row.email ? row : null;
}

function portalLink(slug, path) {
  const base = frontendUrl();
  const tail = String(path || '').replace(/^\/+/, '');
  return slug ? `${base}/${slug}/portal/${tail}` : `${base}/login`;
}

/**
 * Builds the email. `headline` is one sentence ("Your baptism certificate is ready for pickup"),
 * `status` the short new status, `reason` any rejection reason and `nextStep` what to do now.
 */
function buildStatusEmail({ parishName, firstName, requestLabel, status, headline, reason, nextStep, link }) {
  const greeting = firstName ? `Hi ${firstName},` : 'Hello,';
  const lines = [
    greeting,
    '',
    `${headline}.`,
    '',
    `Parish: ${parishName}`,
    `Request: ${requestLabel}`,
    `New status: ${status}`,
  ];
  if (reason) lines.push(`Reason from the parish office: ${reason}`);
  if (nextStep) lines.push('', `What's next: ${nextStep}`);
  lines.push('', `See your request: ${link}`, '', `${parishName}`, 'Sent by HolyApp');
  const text = lines.join('\n');

  const row = (label, value) => `
        <tr>
          <td style="padding: 6px 12px 6px 0; color: ${MUTED}; font-size: 14px; vertical-align: top; white-space: nowrap;">${label}</td>
          <td style="padding: 6px 0; color: ${INK}; font-size: 14px;">${escapeHtml(value)}</td>
        </tr>`;

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 520px; margin: 0 auto; color: ${INK};">
      <div style="border-top: 4px solid ${TEAL}; padding: 24px 4px 8px;">
        <p style="margin: 0 0 4px; font-size: 14px; color: ${MUTED};">${escapeHtml(parishName)}</p>
        <h1 style="margin: 0 0 16px; font-size: 21px; line-height: 1.3; font-weight: 600; color: ${DEEP_TEAL};">${escapeHtml(headline)}</h1>
        <p style="margin: 0 0 16px; font-size: 15px;">${escapeHtml(greeting)}</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background: ${TINT}; border-radius: 8px; padding: 10px 14px; margin: 0 0 16px;">
          ${row('Request', requestLabel)}
          ${row('New status', status)}
          ${reason ? row('Reason', reason) : ''}
        </table>
        ${nextStep ? `<p style="margin: 0 0 20px; font-size: 15px; line-height: 1.5;">${escapeHtml(nextStep)}</p>` : ''}
        <p style="margin: 0 0 20px;">
          <a href="${escapeHtml(link)}" style="display: inline-block; background: ${TEAL}; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-size: 15px;">See your request</a>
        </p>
        <p style="margin: 0; font-size: 13px; color: ${MUTED}; word-break: break-all;">If the button doesn't work, copy this address into your browser:<br>${escapeHtml(link)}</p>
        <p style="margin: 24px 0 0; font-size: 13px; color: ${MUTED};">Sent by HolyApp for ${escapeHtml(parishName)}.</p>
      </div>
    </div>
  `;

  return { subject: headline, text, html };
}

async function deliver({ parishId, recipientId, path, ...content }) {
  let to;
  try {
    const recipient = await loadRecipient(recipientId, parishId);
    if (!recipient) return;
    to = recipient.email;
    const mail = buildStatusEmail({
      ...content,
      parishName: recipient.parish_name,
      firstName: recipient.first_name,
      link: portalLink(recipient.parish_slug, path),
    });
    await mailer.sendMail({ to, ...mail });
  } catch (err) {
    if (err.code === 'MAIL_NOT_CONFIGURED') {
      if (process.env.NODE_ENV !== 'test') {
        console.log(`[mail] status email to ${to} not sent: SMTP is not set up in server/.env`);
      }
      return;
    }
    console.error(`[mail] status email to ${to || 'parishioner'} failed:`, err.message);
  }
}

/**
 * Emails the parishioner about a status change, in the background. Never throws.
 * { parishId, recipientId, requestLabel, status, headline, reason?, nextStep?, path }
 * `path` is the portal page to link to, e.g. 'requests/<id>', 'marriage', 'intentions'.
 */
function emailStatusChange(args) {
  if (!enabled() || !args || !args.recipientId) return Promise.resolve();
  const job = deliver(args).finally(() => pending.delete(job));
  pending.add(job);
  return job;
}

/** Waits for every status email still being sent (for tests). */
async function settled() {
  await Promise.all([...pending]);
}

const SACRAMENT_NAMES = {
  baptism: 'Baptism',
  confirmation: 'Confirmation',
  marriage: 'Marriage',
  death: 'Death',
};

function certificateLabel(row) {
  const name = SACRAMENT_NAMES[row.record_type] || 'Certificate';
  return `${name} certificate${row.reference_no ? ` (${row.reference_no})` : ''}`;
}

function peso(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) return '';
  return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Certificate request emails. `row` is a certificate_request row (with amount_due when known);
 * `change` is one of: found, rejected, paid, issued, ready, released.
 */
function emailCertificateStatus(row, change, extra = {}) {
  if (!row || row.request_type === 'walkin') return Promise.resolve();
  const sacrament = (SACRAMENT_NAMES[row.record_type] || 'certificate').toLowerCase();
  const fee = peso(row.amount_due);
  const pickup = row.delivery_method === 'pickup';
  const byChange = {
    found: {
      status: 'Record found, waiting for payment',
      headline: `We found the record for your ${sacrament} certificate`,
      nextStep: `Pay the certificate fee${fee ? ` of ${fee}` : ''} in HolyApp with GCash or at the parish office, and we'll start preparing it.`,
    },
    rejected: {
      status: 'Rejected',
      headline: `Your ${sacrament} certificate request was not approved`,
      reason: row.rejection_reason || extra.reason,
      nextStep:
        'If you think something is missing or wrong, you can send a new request with the corrected details or contact the parish office.',
    },
    paid: {
      status: 'Paid, being prepared',
      headline: `We received your payment for your ${sacrament} certificate`,
      nextStep: pickup
        ? "Staff are printing and sealing your certificate. We'll email you when it's ready to pick up."
        : "Staff are preparing your certificate. We'll email you when it's in your certificate wallet.",
    },
    issued: {
      status: 'Released',
      headline: `Your ${sacrament} certificate is ready`,
      nextStep: 'Open your certificate wallet in HolyApp to view or download it.',
    },
    ready: {
      status: 'Ready for pickup',
      headline: `Your ${sacrament} certificate is ready for pickup`,
      nextStep: 'Bring a valid ID to the parish office to claim it.',
    },
    released: {
      status: 'Released',
      headline: `Your ${sacrament} certificate has been claimed`,
      nextStep: `It was released at the parish office${extra.releasedTo ? ` to ${extra.releasedTo}` : ''}. A copy is also in your certificate wallet.`,
    },
  };
  const content = byChange[change];
  if (!content) return Promise.resolve();
  // The same update in the portal's notifications, whether or not status emails are on.
  if (row.requested_by) {
    const note = createNotification({
      parishId: row.parish_id,
      recipientId: row.requested_by,
      kind: 'request',
      title: content.headline,
      body: [content.reason ? `Reason: ${content.reason}` : '', content.nextStep].filter(Boolean).join(' '),
      href: `requests/${row.id}`,
    }).finally(() => pending.delete(note));
    pending.add(note);
  }
  return emailStatusChange({
    parishId: row.parish_id,
    recipientId: row.requested_by,
    requestLabel: certificateLabel(row),
    path: `requests/${row.id}`,
    ...content,
  });
}

/** "2026-11-22" → "Sunday, November 22, 2026". */
function longDate(value) {
  const iso = String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return String(value || '');
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-PH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** "14:30" or "14:30:00" → "2:30 PM". */
function clockTime(value) {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value || ''));
  if (!match) return String(value || '');
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]} ${hour < 12 ? 'AM' : 'PM'}`;
}

function marriageLabel(row) {
  return `Marriage application${row.reference_no ? ` (${row.reference_no})` : ''}`;
}

/**
 * Marriage application emails. `row` is the marriage_application row after the change; `change` is one of:
 * filed, linked, requirements_complete, dispensation_granted, dispensation_denied, banns_scheduled,
 * banns_announced, banns_received, banns_complete, date_reserved, date_confirmed, rejected.
 */
function emailMarriageStatus(row, change, extra = {}) {
  if (!row || !row.parishioner_id) return Promise.resolve();
  const wedding = row.preferred_wedding_date
    ? `${longDate(row.preferred_wedding_date)}${row.preferred_wedding_start ? ` at ${clockTime(row.preferred_wedding_start)}` : ''}`
    : '';
  const dates = (list) => (list || []).map(longDate).join('; ');
  const byChange = {
    filed: {
      status: 'Pending',
      headline: 'The parish office opened a marriage application for you',
      nextStep: 'Bring the documents on your checklist to the parish office. You can follow each step in HolyApp.',
    },
    linked: {
      status: 'Linked to your account',
      headline: 'Your marriage application is now in your HolyApp account',
      nextStep: 'You can follow its status and your checklist of documents in HolyApp.',
    },
    requirements_complete: {
      status: 'Checking requirements',
      headline: 'All your required documents are in',
      nextStep: "The parish office is checking them. We'll email you when your wedding date is confirmed.",
    },
    dispensation_granted: {
      status: 'Dispensation granted',
      headline: 'Your dispensation was granted',
      nextStep: 'The parish office can now go on with your application.',
    },
    dispensation_denied: {
      status: 'Dispensation denied',
      headline: 'Your dispensation was not granted',
      nextStep: 'Please contact the parish office to talk about what happens next.',
    },
    banns_scheduled: {
      status: 'Banns scheduled',
      headline: 'Your banns dates are set',
      nextStep: `Your names will be announced at Mass on ${dates(extra.sundays)}.`,
    },
    banns_announced: {
      status: `Banns announced (${extra.count || 0} of ${extra.total || 3})`,
      headline: 'Your banns were announced at Mass',
      nextStep: `Announced on ${dates(extra.dates)}.${
        extra.count < (extra.total || 3) ? " We'll email you again after the next announcement." : ''
      }`,
    },
    banns_received: {
      status: 'Banns form received',
      headline: 'We received a signed banns form',
      nextStep: `The parish office received the banns form from ${extra.from || 'the other parish'}.`,
    },
    banns_complete: {
      status: extra.dispensed ? 'Banns dispensed' : 'Banns complete',
      headline: extra.dispensed ? 'Your banns were dispensed' : 'Your banns are complete',
      nextStep: extra.dispensed
        ? 'The bishop waived the banns, so this step is done.'
        : 'All your banns announcements are done.',
    },
    date_reserved: {
      status: 'Wedding date reserved',
      headline: 'Your wedding date is reserved',
      nextStep: `${wedding ? `We reserved ${wedding}. ` : ''}The parish will confirm it once all your requirements are complete.`,
    },
    date_confirmed: {
      status: 'Approved',
      headline: 'Your wedding date is confirmed',
      nextStep: wedding ? `Your wedding is on ${wedding}.` : 'Your wedding date is confirmed.',
    },
    rejected: {
      status: 'Rejected',
      headline: 'Your marriage application was not approved',
      reason: extra.reason,
      nextStep: 'Please contact the parish office if you have questions.',
    },
  };
  const content = byChange[change];
  if (!content) return Promise.resolve();
  return emailStatusChange({
    parishId: row.parish_id,
    recipientId: row.parishioner_id,
    requestLabel: marriageLabel(row),
    path: 'marriage',
    ...content,
  });
}

/** Mass intention emails. `intentionFor` is the decrypted intention text; `change` is confirmed or said. */
function emailIntentionStatus(row, change, { intentionFor } = {}) {
  if (!row || !row.requester_id) return Promise.resolve();
  const when = `${longDate(row.schedule_date)}${row.schedule_time ? ` at ${clockTime(row.schedule_time)}` : ''}`;
  const label = `Mass intention${intentionFor ? ` for ${intentionFor}` : ''}${
    row.reference_no ? ` (${row.reference_no})` : ''
  }`;
  const byChange = {
    confirmed: {
      status: 'Scheduled',
      headline: 'Your Mass intention is confirmed',
      nextStep: `It will be offered at the Mass on ${when}.`,
    },
    said: {
      status: 'Said',
      headline: 'Your Mass intention was offered',
      nextStep: `It was offered at the Mass on ${when}. Thank you for your offering.`,
    },
  };
  const content = byChange[change];
  if (!content) return Promise.resolve();
  return emailStatusChange({
    parishId: row.parish_id,
    recipientId: row.requester_id,
    requestLabel: label,
    path: 'intentions',
    ...content,
  });
}

module.exports = {
  emailStatusChange,
  emailCertificateStatus,
  emailMarriageStatus,
  emailIntentionStatus,
  buildStatusEmail,
  settled,
};
