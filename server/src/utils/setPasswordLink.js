// One-time links for parish office accounts to set their own password. They use the password_reset table and the
// /reset-password page, like "Forgot password?", only longer-lived: a new account's invitation lasts 3 days, a link
// an admin sends later 1 day. Sending a new link cancels any earlier one.

const pool = require('../config/db');
const { generateResetToken, minutesFromNow } = require('./tokens');
const { sendMail, setPasswordEmail } = require('./mailer');
const { frontendUrl } = require('./frontendUrl');

const INVITE_HOURS = 72;
const RESET_HOURS = 24;

/** Emails `user` a link to set their password. Throws the mailer's error if the email can't be sent. */
async function sendSetPasswordLink(user, { parishName, invited }) {
  const hours = invited ? INVITE_HOURS : RESET_HOURS;
  const link = generateResetToken();
  await pool.query('UPDATE password_reset SET consumed_at = NOW() WHERE user_id = $1 AND consumed_at IS NULL', [user.id]);
  await pool.query('INSERT INTO password_reset (user_id, token_hash, expires_at) VALUES ($1, $2, $3)', [
    user.id,
    link.tokenHash,
    minutesFromNow(hours * 60),
  ]);
  const message = setPasswordEmail({ url: `${frontendUrl()}/reset-password/${link.token}`, parishName, invited, hours });
  await sendMail({
    to: user.email,
    subject: invited ? `Set up your HolyApp account for ${parishName}` : 'Set a new HolyApp password',
    text: message.text,
    html: message.html,
  });
}

module.exports = { sendSetPasswordLink, INVITE_HOURS, RESET_HOURS };
