// Sends HolyApp's emails. Two ways, picked by what is set in the env:
//   - BREVO_API_KEY: Brevo's HTTPS email API (brevo.com, free up to 300 emails a day). Use this on
//     hosts that block outgoing SMTP, such as Railway below the Pro plan.
//   - SMTP_USER + SMTP_PASS: plain SMTP, e.g. Gmail with an App Password (local development).
// Brevo wins when both are set. The sender is SMTP_FROM ("HolyApp <you@gmail.com>"); with Brevo
// that address must be a verified sender in your Brevo account.

const nodemailer = require('nodemailer');

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

let transporter;

function brevoConfigured() {
  return Boolean(String(process.env.BREVO_API_KEY || '').trim());
}

function smtpConfigured() {
  return brevoConfigured() || Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function debugEnabled() {
  return process.env.AUTH_DEBUG === 'true';
}

function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.SMTP_USER;
  const pass = String(process.env.SMTP_PASS || '').replace(/\s+/g, '');
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 587;

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465 || process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });

  return transporter;
}

function fromAddress() {
  return process.env.SMTP_FROM || `HolyApp <${process.env.SMTP_USER}>`;
}

/** "HolyApp <a@b.com>" → { name: 'HolyApp', email: 'a@b.com' }; "a@b.com" → { name: 'HolyApp', email: 'a@b.com' }. */
function parseAddress(value) {
  const raw = String(value || '').trim();
  const match = /^(.*?)\s*<\s*([^<>\s]+@[^<>\s]+)\s*>$/.exec(raw);
  if (match) return { name: match[1].replace(/^"|"$/g, '').trim() || 'HolyApp', email: match[2] };
  return { name: 'HolyApp', email: raw };
}

async function sendWithBrevo({ to, subject, text, html, replyTo }) {
  const sender = parseAddress(process.env.SMTP_FROM || process.env.SMTP_USER);
  if (!sender.email || !sender.email.includes('@')) {
    throw new Error('SMTP_FROM must hold the sender address verified in Brevo, e.g. HolyApp <you@gmail.com>');
  }
  const res = await fetch(BREVO_URL, {
    method: 'POST',
    headers: {
      'api-key': String(process.env.BREVO_API_KEY).trim(),
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender,
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html,
      ...(replyTo ? { replyTo: { email: replyTo } } : {}),
    }),
    signal: AbortSignal.timeout(15000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Brevo answered ${res.status}: ${body.message || body.code || res.statusText}`);
  }
  return { messageId: body.messageId };
}

async function sendMail({ to, subject, text, html, replyTo }) {
  if (!smtpConfigured()) {
    if (debugEnabled()) {
      console.log(`[mail:debug] to=${to} subject="${subject}"\n${text}`);
      return { messageId: 'auth-debug' };
    }
    const err = new Error(
      'Email sending is not configured. Set BREVO_API_KEY, or SMTP_USER and SMTP_PASS (Gmail App Password), in server/.env'
    );
    err.code = 'MAIL_NOT_CONFIGURED';
    throw err;
  }

  const content = { to, subject, text, html: html || text.replace(/\n/g, '<br>'), replyTo };
  const viaBrevo = brevoConfigured();
  try {
    const info = viaBrevo
      ? await sendWithBrevo(content)
      : await getTransporter().sendMail({
          from: fromAddress(),
          to,
          subject,
          text,
          html: content.html,
          ...(replyTo ? { replyTo } : {}),
        });
    console.log(`[mail] sent to ${to} via ${viaBrevo ? 'Brevo' : 'SMTP'} subject="${subject}" id=${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`[mail] failed to send to ${to} via ${viaBrevo ? 'Brevo' : 'SMTP'}:`, err.message);
    const wrapped = new Error(
      viaBrevo
        ? 'Could not send email. Check BREVO_API_KEY and that the SMTP_FROM address is a verified sender in Brevo.'
        : 'Could not send email. Check that SMTP_USER is your Gmail address and SMTP_PASS is a Gmail App Password.'
    );
    wrapped.code = 'MAIL_SEND_FAILED';
    wrapped.cause = err;
    throw wrapped;
  }
}

function verificationEmail(code) {
  const text = `Your HolyApp verification code is ${code}.\n\nIt expires in 10 minutes. If you didn't create this account, you can ignore this email.`;
  const html = `
    <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <p style="font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; color: #5c6b63;">HolyApp</p>
      <h1 style="font-size: 22px; font-weight: 600;">Your verification code</h1>
      <p>Use this code to verify your parishioner account. It expires in 10 minutes.</p>
      <p style="font-size: 32px; letter-spacing: 0.35em; font-weight: 700; text-align: center; background: #f4f1ea; padding: 16px 0; border-radius: 8px;">${code}</p>
      <p style="font-size: 13px; color: #5c6b63;">If you didn't create this account, you can ignore this email.</p>
    </div>
  `;
  return { text, html };
}

function twoFactorEmail(code) {
  const text = `Your HolyApp sign-in code is ${code}.\n\nIt expires in 10 minutes. If you didn't try to sign in, reset your password.`;
  const html = `
    <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <p style="font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; color: #5c6b63;">HolyApp</p>
      <h1 style="font-size: 22px; font-weight: 600;">Your sign-in code</h1>
      <p>Use this code to finish signing in from a new device. It expires in 10 minutes.</p>
      <p style="font-size: 32px; letter-spacing: 0.35em; font-weight: 700; text-align: center; background: #f4f1ea; padding: 16px 0; border-radius: 8px;">${code}</p>
      <p style="font-size: 13px; color: #5c6b63;">If you didn't try to sign in, reset your password.</p>
    </div>
  `;
  return { text, html };
}

/** True for a link to this computer or the local network (development), where the phone needs the same Wi-Fi. */
function isLocalLink(url) {
  try {
    const host = new URL(url).hostname;
    return (
      host === 'localhost' ||
      host.endsWith('.local') ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    );
  } catch {
    return false;
  }
}

function passwordResetEmail(resetUrl) {
  const local = isLocalLink(resetUrl);
  const openLine = local ? 'Stay on the same Wi-Fi as the computer running HolyApp, then open:' : 'Open this link to set a new password:';
  const tapLine = local
    ? 'This link expires in 30 minutes. Stay on the same Wi-Fi as the computer running HolyApp, then tap the button.'
    : 'This link expires in 30 minutes. Tap the button to set a new password.';
  const text = `Reset your HolyApp password (expires in 30 minutes).\n\n${openLine}\n${resetUrl}\n\nIf the button in the email does not work, copy the address above and paste it into your browser.\n\nIf you didn't ask for this, you can ignore this email.`;
  const html = `
    <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <p style="font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; color: #5c6b63;">HolyApp</p>
      <h1 style="font-size: 22px; font-weight: 600;">Reset your password</h1>
      <p>${tapLine}</p>
      <p><a href="${resetUrl}" style="display: inline-block; background: #1a3d2b; color: #fff; text-decoration: none; padding: 12px 18px; border-radius: 6px;">Set a new password</a></p>
      <p style="font-size: 13px; color: #5c6b63; word-break: break-all;">If the button doesn't work, copy this address into your browser:<br>${resetUrl}</p>
    </div>
  `;
  return { text, html };
}

module.exports = {
  sendMail,
  debugEnabled,
  smtpConfigured,
  brevoConfigured,
  parseAddress,
  verificationEmail,
  twoFactorEmail,
  passwordResetEmail,
};
