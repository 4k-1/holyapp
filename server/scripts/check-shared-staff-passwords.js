// Finds parish office accounts still on the password every staff account used to get ("password123"), from before
// accounts were set up with an emailed link. Read-only unless --fix is given.
//
//   node scripts/check-shared-staff-passwords.js --env .env.uat           lists them
//   node scripts/check-shared-staff-passwords.js --env .env.uat --fix     also locks each one with a random password
//                                                                         and emails its owner a link to set their own
//
// --env  the env file of the server to check (its DATABASE_URL and DATABASE_SSL; for --fix, its email settings).

const path = require('path');

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? null : process.argv[i + 1];
}

const envFile = arg('env');
if (!envFile) {
  console.error('Say which server to check: --env <its env file>.');
  process.exit(1);
}
require('dotenv').config({ path: path.resolve(envFile), override: true, quiet: true });

const crypto = require('crypto');
const pool = require('../src/config/db');
const { comparePassword, hashPassword } = require('../src/utils/password');
const { sendSetPasswordLink } = require('../src/utils/setPasswordLink');
const { smtpConfigured } = require('../src/utils/mailer');

const OLD_SHARED_PASSWORD = 'password123';
const fix = process.argv.includes('--fix');

async function main() {
  // --fix emails real people, so it needs real mail: not the debug mode that only prints emails (and their links)
  // to this console, and links to the server's own site rather than localhost.
  if (fix && (!smtpConfigured() || !process.env.FRONTEND_URL)) {
    throw new Error(
      '--fix needs that server\'s mail settings (BREVO_API_KEY and SMTP_FROM) and FRONTEND_URL in the --env file. Nothing was changed.'
    );
  }
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.role, u.status, u.password_hash, p.name AS parish_name
     FROM app_user u JOIN parish p ON p.id = u.parish_id
     WHERE u.role IN ('parish_admin', 'parish_staff')
     ORDER BY p.name, u.email`
  );
  const exposed = [];
  for (const row of rows) {
    if (await comparePassword(OLD_SHARED_PASSWORD, row.password_hash)) exposed.push(row);
  }
  console.log(`${rows.length} office accounts checked; ${exposed.length} still on the old shared password.`);
  for (const row of exposed) {
    let done = '';
    if (fix) {
      await pool.query('UPDATE app_user SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
        await hashPassword(crypto.randomBytes(32).toString('base64url')),
        row.id,
      ]);
      await pool.query('UPDATE refresh_token SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL', [row.id]);
      done = ' → locked';
      if (row.status === 'active') {
        try {
          await sendSetPasswordLink(row, { parishName: row.parish_name, invited: true });
          done += ', link emailed';
        } catch (err) {
          done += `, email failed (${err.message}); send it from Staff Accounts`;
        }
      }
    }
    console.log(`  ${row.parish_name}: ${row.email} (${row.role}, ${row.status})${done}`);
  }
  if (exposed.length && !fix) console.log('Run again with --fix to lock them and email each owner a link.');
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
