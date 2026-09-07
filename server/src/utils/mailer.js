const nodemailer = require('nodemailer');

let transporter;

function smtpConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
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

async function sendMail({ to, subject, text, html }) {
  if (!smtpConfigured()) {
    const err = new Error(
      'Email sending is not configured. Set SMTP_USER and SMTP_PASS (Gmail App Password) in server/.env'
    );
    err.code = 'MAIL_NOT_CONFIGURED';
    throw err;
  }

  try {
    const info = await getTransporter().sendMail({
      from: fromAddress(),
      to,
      subject,
      text,
      html: html || text.replace(/\n/g, '<br>'),
    });
    console.log(`[mail] sent to ${to} subject="${subject}" id=${info.messageId}`);
  } catch (err) {
    console.error(`[mail] failed to send to ${to}:`, err.message);
    const wrapped = new Error(
      'Could not send email. Check that SMTP_USER is your Gmail address and SMTP_PASS is a Gmail App Password.'
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

function passwordResetEmail(resetUrl) {
  const text = `Reset your HolyApp password (expires in 30 minutes).\n\nStay on the same Wi-Fi as the computer running HolyApp, then open:\n${resetUrl}\n\nIf the button in the email does not work, copy the address above and paste it into your browser.\n\nIf you didn't ask for this, you can ignore this email.`;
  const html = `
    <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <p style="font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; color: #5c6b63;">HolyApp</p>
      <h1 style="font-size: 22px; font-weight: 600;">Reset your password</h1>
      <p>This link expires in 30 minutes. Stay on the same Wi-Fi as the computer running HolyApp, then tap the button.</p>
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
  verificationEmail,
  passwordResetEmail,
};
