// Parishioner sign-up in three calls, email first:
//   POST /auth/signup/start   { email, parishId }          → emails a 4-digit code
//   POST /auth/signup/verify  { email, code }               → { signupToken } when the code is right
//   POST /auth/signup/finish  { email, signupToken, firstName, middleName?, lastName, birthday, password }
//                                                           → creates the account and signs it in
// The state lives in signup_verification, one row per email (see migration 044), and the row is
// deleted when the account is made. Answers never say whether an email already has an account:
// that email gets a "you already have an account" message instead of a code.

const crypto = require('crypto');
const pool = require('../config/db');
const { ROLES } = require('../constants/roles');
const { hashPassword } = require('../utils/password');
const { sendMail, verificationEmail, accountExistsEmail } = require('../utils/mailer');
const { writeAudit } = require('../utils/audit');
const { generateOtpCode, hashRefreshToken } = require('../utils/tokens');
const { frontendUrl } = require('../utils/frontendUrl');
const { issueSession, findUserById, findUserByEmail, mailStatus } = require('./authController');

const CODE_MINUTES = 10; // a code works this long after it is sent
const TOKEN_MINUTES = 30; // time to fill in name, birthday and password after the code
const MAX_GUESSES = 5; // wrong codes allowed per code sent
const RESEND_SECONDS = 60; // wait between codes
const MAX_SENDS = 5; // codes per email per hour

const WRONG_CODE = "That code isn't right. Codes last 10 minutes; if yours is older, ask for a new one.";
const EXPIRED = 'Your sign-up has expired. Start again with your email.';

function normalEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

function sameHash(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function cleanName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 100);
}

/** 'YYYY-MM-DD', a real date, not in the future and not before 1900; otherwise null. */
function validBirthday(value) {
  const iso = String(value || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso) return null;
  if (date > new Date() || date.getUTCFullYear() < 1900) return null;
  return iso;
}

async function start(req, res) {
  const email = normalEmail(req.body.email);
  const parishId = req.body.parishId || req.body.parish_id;
  if (!email) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (!parishId) return res.status(400).json({ error: 'Choose your parish first.' });

  try {
    const parish = await pool.query('SELECT name, slug FROM parish WHERE id = $1', [parishId]);
    if (!parish.rows[0]) return res.status(400).json({ error: 'Parish not found' });
    await pool.query('DELETE FROM signup_verification WHERE expires_at < NOW()');

    const existing = await findUserByEmail(email);
    // An unverified parishioner is a sign-up from the old flow that never finished: it may start over.
    if (existing && !(existing.role === ROLES.PARISHIONER && !existing.email_verified_at)) {
      const message = accountExistsEmail({
        signInUrl: `${frontendUrl()}/${parish.rows[0].slug}/login`,
        resetUrl: `${frontendUrl()}/forgot-password?email=${encodeURIComponent(email)}`,
      });
      await sendMail({ to: email, subject: 'You already have a HolyApp account', ...message });
      return res.json({ ok: true, email });
    }

    const otp = generateOtpCode();
    const saved = await pool.query(
      `INSERT INTO signup_verification (email, parish_id, code_hash, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '1 hour')
       ON CONFLICT (email) DO UPDATE SET
         parish_id = EXCLUDED.parish_id,
         code_hash = EXCLUDED.code_hash,
         token_hash = NULL,
         attempts = 0,
         sends = signup_verification.sends + 1,
         last_sent_at = NOW(),
         expires_at = GREATEST(signup_verification.first_sent_at + INTERVAL '1 hour', NOW() + INTERVAL '${CODE_MINUTES} minutes')
       WHERE signup_verification.last_sent_at < NOW() - INTERVAL '${RESEND_SECONDS} seconds'
         AND signup_verification.sends < ${MAX_SENDS}
       RETURNING sends`,
      [email, parishId, otp.codeHash]
    );
    if (!saved.rows[0]) {
      const { rows } = await pool.query(
        `SELECT sends,
                CEIL(EXTRACT(EPOCH FROM (last_sent_at + INTERVAL '${RESEND_SECONDS} seconds' - NOW())))::int AS wait_s,
                CEIL(EXTRACT(EPOCH FROM (first_sent_at + INTERVAL '1 hour' - NOW())) / 60)::int AS wait_m
         FROM signup_verification WHERE email = $1`,
        [email]
      );
      const row = rows[0] || {};
      const tooMany = row.sends >= MAX_SENDS;
      return res.status(429).json({
        error: tooMany
          ? `You've asked for ${MAX_SENDS} codes. Try again in ${Math.max(1, row.wait_m)} minutes.`
          : `Wait ${Math.max(1, row.wait_s)} seconds before asking for another code.`,
      });
    }

    const message = verificationEmail(otp.code);
    try {
      await sendMail({ to: email, subject: 'Your HolyApp verification code', text: message.text, html: message.html });
    } catch (err) {
      // Not sent: don't count it, and let them try again straight away.
      await pool.query(
        `UPDATE signup_verification
         SET sends = GREATEST(sends - 1, 0), last_sent_at = last_sent_at - INTERVAL '${RESEND_SECONDS} seconds'
         WHERE email = $1`,
        [email]
      );
      throw err;
    }
    res.json({ ok: true, email });
  } catch (err) {
    res.status(mailStatus(err)).json({ error: err.message });
  }
}

async function verify(req, res) {
  const email = normalEmail(req.body.email);
  const code = String(req.body.code || '').trim();
  if (!email || !/^\d{4}$/.test(code)) return res.status(400).json({ error: 'Enter the 4-digit code from the email.' });

  try {
    // Count the guess before checking it, in one statement, so parallel guesses can't skip the limit.
    const counted = await pool.query(
      `UPDATE signup_verification SET attempts = attempts + 1
       WHERE email = $1 AND code_hash IS NOT NULL AND attempts < ${MAX_GUESSES}
         AND last_sent_at > NOW() - INTERVAL '${CODE_MINUTES} minutes' AND expires_at > NOW()
       RETURNING code_hash`,
      [email]
    );
    const row = counted.rows[0];
    if (!row) {
      const used = await pool.query(
        `SELECT 1 FROM signup_verification WHERE email = $1 AND code_hash IS NOT NULL AND attempts >= ${MAX_GUESSES}`,
        [email]
      );
      if (used.rows[0]) return res.status(429).json({ error: 'Too many wrong codes. Ask for a new code.' });
      return res.status(400).json({ error: WRONG_CODE });
    }
    if (!sameHash(row.code_hash, hashRefreshToken(code))) return res.status(400).json({ error: WRONG_CODE });

    const token = crypto.randomBytes(32).toString('base64url');
    await pool.query(
      `UPDATE signup_verification
       SET code_hash = NULL, attempts = 0, token_hash = $2, expires_at = NOW() + INTERVAL '${TOKEN_MINUTES} minutes'
       WHERE email = $1`,
      [email, hashRefreshToken(token)]
    );
    res.json({ ok: true, signupToken: token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function finish(req, res) {
  const email = normalEmail(req.body.email);
  const token = String(req.body.signupToken || req.body.signup_token || '');
  const firstName = cleanName(req.body.firstName);
  const middleName = cleanName(req.body.middleName);
  const lastName = cleanName(req.body.lastName);
  const birthday = validBirthday(req.body.birthday);
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!email || !token) return res.status(400).json({ error: EXPIRED });
  if (!firstName || !lastName) return res.status(400).json({ error: 'Enter your first and last name.' });
  if (!birthday) return res.status(400).json({ error: 'Enter a real birthday that is not in the future.' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (password.length > 200) return res.status(400).json({ error: 'Use a password of 200 characters or fewer.' });

  const passwordHash = await hashPassword(password);
  const client = await pool.connect();
  let userId;
  try {
    await client.query('BEGIN');
    const pending = await client.query(
      `DELETE FROM signup_verification
       WHERE email = $1 AND token_hash = $2 AND expires_at > NOW()
       RETURNING parish_id`,
      [email, hashRefreshToken(token)]
    );
    if (!pending.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: EXPIRED });
    }
    const values = [pending.rows[0].parish_id, ROLES.PARISHIONER, email, passwordHash, firstName, middleName || null, lastName, birthday];
    // A never-finished sign-up from the old flow is taken over in place (the audit log may point at it,
    // so it can't simply be deleted). Otherwise the account is new.
    const reused = await client.query(
      `UPDATE app_user
       SET parish_id = $1, email = $3, password_hash = $4, status = 'active', first_name = $5, middle_name = $6,
           last_name = $7, birthday = $8, address = NULL, email_verified_at = NOW(), updated_at = NOW()
       WHERE lower(email) = $3 AND role = $2 AND email_verified_at IS NULL
       RETURNING id`,
      values
    );
    const saved =
      reused.rows[0] ||
      (
        await client.query(
          `INSERT INTO app_user (parish_id, role, email, password_hash, status, first_name, middle_name, last_name, birthday, email_verified_at)
           VALUES ($1, $2, $3, $4, 'active', $5, $6, $7, $8, NOW())
           RETURNING id`,
          values
        )
      ).rows[0];
    userId = saved.id;
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') return res.status(409).json({ error: 'An account with this email already exists. Sign in instead.' });
    return res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }

  try {
    const user = await findUserById(userId);
    await writeAudit({
      parishId: user.parish_id,
      actorId: user.id,
      action: 'auth.signup',
      entityType: 'app_user',
      entityId: user.id,
      metadata: { email: user.email },
    });
    res.status(201).json(await issueSession(user, req));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { start, verify, finish, validBirthday };
