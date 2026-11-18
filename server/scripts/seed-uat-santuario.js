// UAT only: puts the made-up records from uat-santuario-data.js into the Santuario, after
// reset-uat-parish.js has emptied it. Every name, date and record is invented.
//
//   node scripts/reset-uat-parish.js   --env .env.uat --config scripts/uat-config.json --yes santuario
//   node scripts/seed-uat-santuario.js --env .env.uat --config scripts/uat-config.json
//
// --env must be the hosted server's env file: records are encrypted with its DATA_ENCRYPTION_KEY.
// It adds: the parish priest and the three office sign-ins to Personnel (and the priest to the
// weekly Masses that have no one assigned), the baptism records, and the requester's waiting
// certificate requests. It stops if the parish already has records, so run the reset first.

const fs = require('fs');
const path = require('path');

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

const envFile = arg('env');
if (!envFile) {
  console.error('Say which server to seed: --env <its env file>. See the top of this script.');
  process.exit(1);
}
require('dotenv').config({ path: path.resolve(envFile), override: true, quiet: true });
// The API runs in this process; skip its attempt limits and keep its errors readable.
process.env.NODE_ENV = 'test';

const configPath = arg('config') || path.join(__dirname, 'uat-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const { signAccessToken } = require('../src/utils/tokens');
const { hashPassword } = require('../src/utils/password');
const data = require('./uat-santuario-data');

const splitName = (full) => {
  const parts = full.split(' ');
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
};

async function signedIn(email) {
  const { rows } = await pool.query('SELECT id, parish_id, role, email FROM app_user WHERE email = $1', [email]);
  if (!rows[0]) throw new Error(`No account ${email} on this database.`);
  return { ...rows[0], token: signAccessToken(rows[0]) };
}

/** Calls the API as `user` and stops with a clear message if it refuses. */
async function call(user, method, url, body) {
  let req = request(app)[method](url).set('Authorization', `Bearer ${user.token}`);
  if (body) req = req.send(body);
  const res = await req;
  if (![200, 201].includes(res.status)) throw new Error(`${method.toUpperCase()} ${url} → ${res.status} ${JSON.stringify(res.body)}`);
  return res.body;
}

async function main() {
  const parish = (await pool.query('SELECT id, name FROM parish WHERE slug = $1', [config.santuarioSlug])).rows[0];
  if (!parish) throw new Error(`No parish "${config.santuarioSlug}".`);
  const { rows: had } = await pool.query(
    `SELECT (SELECT count(*) FROM baptism WHERE parish_id = $1)::int AS records,
            (SELECT count(*) FROM certificate_request WHERE parish_id = $1)::int AS requests`,
    [parish.id]
  );
  if (had[0].records || had[0].requests) {
    throw new Error(`The parish already has ${had[0].records} record(s) and ${had[0].requests} request(s). Run reset-uat-parish.js first.`);
  }

  const admins = [];
  for (const a of data.ADMINS) admins.push({ ...a, user: await signedIn(data.officeEmail(config, a.tag)) });
  const admin = admins[0].user;

  console.log('Personnel…');
  const priest = await call(admin, 'post', '/personnel', {
    name: data.PRIEST.name,
    honorific: data.PRIEST.honorific,
    titles: [{ title: data.PRIEST.title }],
  });
  const priestId = priest.person?.id || priest.id;
  for (const a of admins) {
    await pool.query(
      `INSERT INTO parish_personnel (parish_id, full_name, role_title, contact_info, user_id, status)
       VALUES ($1, $2, 'Admin Staff', NULL, $3, 'active')`,
      [parish.id, `${a.first} ${a.last}`, a.user.id]
    );
  }
  if (priestId) {
    await pool.query('UPDATE parish_recurring_commitment SET assigned_to = $1 WHERE parish_id = $2 AND assigned_to IS NULL', [priestId, parish.id]);
  }

  // The staff sign-in with limited access. The reset removes it, so it's made fresh each time.
  if (!config.staffPassword) throw new Error(`${configPath} needs staffPassword.`);
  const s = data.STAFF;
  const staffEmail = data.officeEmail(config, s.tag);
  const { rows: staffRows } = await pool.query(
    `INSERT INTO app_user (parish_id, role, email, password_hash, status, first_name, last_name, email_verified_at, staff_access)
     VALUES ($1, 'parish_staff', $2, $3, 'active', $4, $5, NOW(), $6::jsonb)
     ON CONFLICT (email) DO UPDATE SET parish_id = $1, role = 'parish_staff', password_hash = $3, status = 'active',
       first_name = $4, last_name = $5, staff_access = $6::jsonb, two_factor_enabled = FALSE
     RETURNING id`,
    [parish.id, staffEmail, await hashPassword(config.staffPassword), s.first, s.last, JSON.stringify(s.access)]
  );
  await pool.query(
    `INSERT INTO parish_personnel (parish_id, full_name, role_title, contact_info, user_id, status)
     VALUES ($1, $2, 'Admin Staff', NULL, $3, 'active')`,
    [parish.id, `${s.first} ${s.last}`, staffRows[0].id]
  );
  console.log(`  Staff sign-in: ${staffEmail}`);

  console.log('Baptism records…');
  const recordIds = {};
  for (const [first, middle, last, sex, born, baptized, father, mother, godparents, book, page, entry] of data.BAPTISMS) {
    const f = splitName(father);
    const m = splitName(mother);
    const made = await call(admin, 'post', '/records/baptism', {
      firstName: first,
      middleName: middle,
      lastName: last,
      sex,
      dateOfBirth: born,
      dateOfBaptism: baptized,
      placeOfBirth: 'Cebu City',
      placeOfBaptism: data.PARISH_NAME,
      legitimacyStatus: 'Legitimate',
      minister: data.PRIEST_FULL,
      fatherFirstName: f.firstName,
      fatherLastName: f.lastName,
      motherFirstName: m.firstName,
      motherLastName: m.lastName,
      godparents: godparents.map(splitName),
      bookNumber: book,
      pageNumber: page,
      entryNumber: entry,
      remarks: 'UAT test record. Not a real person.',
    });
    recordIds[last] = made.record.id;
    console.log(`  ${first} ${middle} ${last}  Book ${book}, Page ${page}, Entry ${entry}`);
  }

  console.log('Certificate requests…');
  // Tester 1's own account, so the requests can be paid for with GCash by signing in as them.
  const requester = await signedIn(data.officeEmail(config, data.REQUESTER.tag));
  if (requester.role !== 'parishioner' || requester.parish_id !== parish.id) {
    throw new Error(`${requester.email} is not a parishioner of this parish.`);
  }
  for (const q of data.REQUESTS) {
    const [first, middle, last, born, baptized] = q.person;
    const made = await call(requester, 'post', '/requests', {
      sacramentType: 'baptism',
      deliveryMethod: q.delivery,
      purpose: q.purpose,
      relationship: q.relationship,
      sacramentDate: baptized,
      fields: { firstName: first, middleName: middle, lastName: last, birthdate: born, birthplace: 'Cebu City' },
    });
    console.log(`  ${made.referenceNo}  ${first} ${middle} ${last} (${q.delivery})`);
  }

  console.log('Donations…');
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' });
  for (const d of data.DONATIONS) {
    await call(admin, 'post', '/donations', { ...d, donationDate: today });
    console.log(`  ${d.donorName}  ₱${d.amount}`);
  }

  console.log('Certificates…');
  for (const c of data.CERTIFICATES) {
    const recordId = recordIds[c.lastName];
    if (!recordId) throw new Error(`No seeded record with last name ${c.lastName}.`);
    await call(admin, 'post', `/records/baptism/${recordId}/certificates`, { purpose: c.purpose });
    const cert = (await pool.query('SELECT hash, certificate_code FROM certificate WHERE record_id = $1 ORDER BY version DESC LIMIT 1', [recordId])).rows[0];
    console.log(`  ${cert.certificate_code}  ${data.SITE_URL}/verify/${cert.hash}`);
  }

  console.log(`\nDone. ${parish.name} is ready for a test session.`);
  console.log(`Office sign-ins: ${admins.map((a) => data.officeEmail(config, a.tag)).join(', ')} (passwords in ${configPath}).`);
}

main()
  .catch((err) => {
    console.error(`\nStopped: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
