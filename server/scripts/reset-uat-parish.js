// UAT only: empties one parish so a test session starts from a clean slate, then
// seed-uat-santuario.js puts back the made-up records the test plan uses.
// Never run this on a database with real parish data.
//
//   node scripts/reset-uat-parish.js --env .env.uat --config scripts/uat-config.json            (shows what it would delete)
//   node scripts/reset-uat-parish.js --env .env.uat --config scripts/uat-config.json --yes santuario   (deletes it)
//   add --keep-parishioners to keep every parishioner account (their requests, payments and test
//   guide progress still go, so they start fresh too)
//
// It deletes, for the parish in the config's santuarioSlug only:
//   records (baptism, confirmation, marriage, death) with their godparents, annotations and ledger
//   photos; certificate requests, their documents and certificates; payments, donations and Mass
//   intentions; schedule events and changes; marriage applications; personnel; notifications; the
//   activity log; reference-number counters; and every account except the three office sign-ins
//   (holyapp.uat+admin1/2/3@…).
// It keeps the parish itself (name, logo, photo), its settings, certificate and payment settings,
// fees, marriage requirements and the weekly Mass schedule. Other parishes are not touched.
//
// The three office sign-ins are kept (or made) active, with two-step sign-in off, and given the
// passwords in the config's adminPasswords ({ "admin1": "…", "admin2": "…", "admin3": "…" }).

const fs = require('fs');
const path = require('path');

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

const envFile = arg('env');
if (!envFile) {
  console.error('Say which server to reset: --env <its env file>. See the top of this script.');
  process.exit(1);
}
require('dotenv').config({ path: path.resolve(envFile), override: true, quiet: true });

const configPath = arg('config') || path.join(__dirname, 'uat-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const pool = require('../src/config/db');
const { hashPassword } = require('../src/utils/password');
const { ADMINS, officeEmail } = require('./uat-santuario-data');

const confirm = arg('yes');
const keepParishioners = process.argv.includes('--keep-parishioners');

// Each step: what it is, and the SQL. $1 is the parish id, $2 the ids of the accounts that go.
const RECORDS = `(SELECT id FROM baptism WHERE parish_id = $1 UNION ALL SELECT id FROM confirmation WHERE parish_id = $1
  UNION ALL SELECT id FROM marriage WHERE parish_id = $1 UNION ALL SELECT id FROM death WHERE parish_id = $1)`;
const STEPS = [
  ['godparent and sponsor links', `DELETE FROM sacrament_sponsor_assignment WHERE sacrament_record_id IN ${RECORDS}`],
  ['annotations', `DELETE FROM annotation WHERE baptism_id IN (SELECT id FROM baptism WHERE parish_id = $1)`],
  ['payments', `DELETE FROM payment WHERE certificate_request_id IN (SELECT id FROM certificate_request WHERE parish_id = $1)
     OR donation_id IN (SELECT id FROM donation WHERE parish_id = $1)
     OR mass_intention_id IN (SELECT id FROM mass_intention WHERE parish_id = $1)
     OR collected_by = ANY($2)`],
  ['request documents', `DELETE FROM certificate_request_document WHERE parish_id = $1`],
  ['reprints', `DELETE FROM certificate_reprint WHERE parish_id = $1`],
  ['(wedding dates on applications)', `UPDATE marriage_application SET wedding_event_id = NULL WHERE parish_id = $1 AND wedding_event_id IS NOT NULL`],
  ['schedule events', `DELETE FROM event WHERE parish_id = $1`],
  ['schedule changes', `DELETE FROM parish_schedule_override WHERE parish_id = $1`],
  ['certificate requests', `DELETE FROM certificate_request WHERE parish_id = $1`],
  ['certificates', `DELETE FROM certificate WHERE parish_id = $1`],
  ['confirmations', `DELETE FROM confirmation WHERE parish_id = $1`],
  ['marriage consent', `DELETE FROM marriage_consent_person WHERE marriage_party_id IN (SELECT id FROM marriage_party
     WHERE marriage_id IN (SELECT id FROM marriage WHERE parish_id = $1) OR baptismal_record_id IN (SELECT id FROM baptism WHERE parish_id = $1))`],
  ['marriage parties', `DELETE FROM marriage_party WHERE marriage_id IN (SELECT id FROM marriage WHERE parish_id = $1)
     OR baptismal_record_id IN (SELECT id FROM baptism WHERE parish_id = $1)`],
  ['marriages', `DELETE FROM marriage WHERE parish_id = $1`],
  ['death kin', `DELETE FROM death_kin WHERE death_id IN (SELECT id FROM death WHERE parish_id = $1)`],
  ['death sacraments', `DELETE FROM death_sacrament_received WHERE death_id IN (SELECT id FROM death WHERE parish_id = $1)`],
  ['deaths', `DELETE FROM death WHERE parish_id = $1`],
  ['baptisms', `DELETE FROM baptism WHERE parish_id = $1`],
  ['marriage application checklists', `DELETE FROM marriage_application_requirement WHERE marriage_application_id IN
     (SELECT id FROM marriage_application WHERE parish_id = $1)`],
  ['marriage applications', `DELETE FROM marriage_application WHERE parish_id = $1`],
  ['Mass intentions', `DELETE FROM mass_intention WHERE parish_id = $1`],
  ['donations', `DELETE FROM donation WHERE parish_id = $1`],
  ['ledger pages', `DELETE FROM ledger_page WHERE parish_id = $1`],
  ['ledger books', `DELETE FROM ledger_book WHERE parish_id = $1`],
  ['digitized ledger entries', `DELETE FROM digitized_ledger_entries WHERE parish_id = $1`],
  ['notifications', `DELETE FROM app_notification WHERE parish_id = $1 OR recipient_id = ANY($2)`],
  ['activity log', `DELETE FROM audit_log WHERE parish_id = $1 OR actor_id = ANY($2)`],
  ['reference-number counters', `DELETE FROM reference_counter WHERE parish_id = $1`],
  ['sign-up codes', `DELETE FROM signup_verification WHERE parish_id = $1`],
  ['personnel', `DELETE FROM parish_personnel WHERE parish_id = $1 OR user_id = ANY($2)`],
  ['test guide progress', `DELETE FROM test_guide_step WHERE user_id IN (SELECT id FROM app_user WHERE parish_id = $1)`],
  ['godparents left without a record', `DELETE FROM sponsor s WHERE NOT EXISTS
     (SELECT 1 FROM sacrament_sponsor_assignment a WHERE a.sponsor_id = s.id)`],
];

// Settings the parish keeps, last changed by an account that goes: credit them to admin1.
const KEPT_BY = [
  ['service_fee', 'updated_by'],
  ['payment_configuration', 'updated_by'],
  ['parish_settings', 'updated_by'],
  ['certificate_configuration', 'updated_by'],
  ['marriage_requirement_type', 'created_by'],
  ['parish_recurring_commitment', 'created_by'],
];

async function main() {
  const slug = config.santuarioSlug;
  const parish = (await pool.query('SELECT id, name FROM parish WHERE slug = $1', [slug])).rows[0];
  if (!parish) throw new Error(`No parish "${slug}" on this database.`);

  const passwords = config.adminPasswords || {};
  if (confirm) {
    for (const a of ADMINS) if (!passwords[a.tag]) throw new Error(`${configPath} needs adminPasswords.${a.tag}.`);
  }

  const keepEmails = ADMINS.map((a) => officeEmail(config, a.tag));
  const { rows: going } = await pool.query(
    `SELECT id, email, role FROM app_user WHERE parish_id = $1 AND lower(email) <> ALL($2)
       AND NOT ($3 AND role = 'parishioner') ORDER BY role, email`,
    [parish.id, keepEmails, keepParishioners]
  );
  const goingIds = going.map((u) => u.id);

  console.log(`${parish.name} (${slug}) on ${new URL(process.env.DATABASE_URL).host}`);
  console.log(`\nAccounts kept: ${keepEmails.join(', ')}`);
  if (keepParishioners) console.log('Parishioner accounts kept (their activity is cleared).');
  console.log(`Accounts removed (${going.length}):`);
  for (const u of going) console.log(`  ${u.role.padEnd(14)} ${u.email}`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('\nRows removed:');
    for (const [label, sql] of STEPS) {
      // Tables from features not deployed on this server yet.
      const table = sql.match(/DELETE FROM (\w+)/)?.[1];
      if (table && !(await client.query('SELECT to_regclass($1) AS t', [table])).rows[0].t) continue;
      const params = sql.includes('$2') ? [parish.id, goingIds] : [parish.id];
      const res = await client.query(sql, sql.includes('$1') ? params : []);
      if (res.rowCount) console.log(`  ${label.padEnd(34)} ${res.rowCount}`);
    }

    // The three office sign-ins: kept, or made if missing, with their simple test passwords.
    const admins = {};
    for (const a of ADMINS) {
      const email = officeEmail(config, a.tag);
      const hash = await hashPassword(passwords[a.tag] || require('crypto').randomBytes(16).toString('hex'));
      const { rows } = await client.query(
        `INSERT INTO app_user (parish_id, role, email, password_hash, status, first_name, last_name, email_verified_at, two_factor_enabled)
         VALUES ($1, 'parish_admin', $2, $3, 'active', $4, $5, NOW(), FALSE)
         ON CONFLICT (email) DO UPDATE SET parish_id = $1, role = 'parish_admin', password_hash = $3, status = 'active',
           first_name = $4, last_name = $5, email_verified_at = COALESCE(app_user.email_verified_at, NOW()),
           two_factor_enabled = FALSE, updated_at = NOW()
         RETURNING id`,
        [parish.id, email, hash, a.first, a.last]
      );
      admins[a.tag] = rows[0].id;
      await client.query('DELETE FROM trusted_device WHERE user_id = $1', [rows[0].id]);
      await client.query('DELETE FROM refresh_token WHERE user_id = $1', [rows[0].id]);
    }

    for (const [table, column] of KEPT_BY) {
      await client.query(`UPDATE ${table} SET ${column} = $1 WHERE ${column} = ANY($2)`, [admins.admin1, goingIds]);
    }
    const removed = await client.query('DELETE FROM app_user WHERE id = ANY($1)', [goingIds]);
    console.log(`  ${'accounts'.padEnd(34)} ${removed.rowCount}`);

    if (confirm === slug) {
      await client.query('COMMIT');
      console.log('\nDone. Now run seed-uat-santuario.js.');
    } else {
      await client.query('ROLLBACK');
      console.log(`\nNothing was changed. To delete all this, run again with --yes ${slug}`);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

main()
  .catch((err) => {
    console.error(`\nStopped: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
