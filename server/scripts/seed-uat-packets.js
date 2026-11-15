// Adds the testers' accounts and the data the three UAT packets use, on top of seed-uat.js.
// Every name, date and record here is invented. Never run this on a database with real parish data.
//
//   node scripts/seed-uat.js         --env .env.uat --config scripts/uat-config.json   (first, once)
//   node scripts/seed-uat-packets.js --env .env.uat --config scripts/uat-config.json --out uat-packet-data.txt
//
// It adds, all in the Santuario (the Sto. Niño Test Parish from seed-uat.js is the other parish
// for the cross-parish checks):
//   - 3 Parish Admin sign-ins (A1, A2, A3), one per office respondent, and 1 Parish Staff sign-in
//     the office respondents share for the staff-access checks. All use the config's password.
//   - 1 requester account that sent the office's test requests and Mass intentions
//   - for each office respondent: a pickup request, a digital request and a request with no record,
//     the records they match, a record to annotate, edit and archive, a pending Mass intention
//     and a donation to void
//   - a baptism record for each parishioner tester (P01–P10) to request, and two certificates to
//     verify (one Superseded, one Revoked)
// It writes the reference numbers and verify links the facilitator copies onto tester cards to --out.
//
// Parishioner testers sign up with their own email during the test. Once a tester's account is
// verified (UAT-02), give them their three ready-made requests (A released, B awaiting payment,
// C rejected) with:
//
//   node scripts/seed-uat-packets.js --env .env.uat --config scripts/uat-config.json --give P01=their@email.com
//
// --give takes several at once, comma-separated: --give P01=a@x.com,P02=b@y.com
// The references are printed and added to the --out file.
//
// Office emails are plus-addresses of the config's testerEmailBase (default: parishAdminEmail),
// e.g. holyapp.uat+admin1@gmail.com, so their emails land in the one UAT inbox.

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
process.env.NODE_ENV = 'test';

const configPath = arg('config') || path.join(__dirname, 'uat-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
for (const key of ['santuarioSlug', 'password', 'parishAdminEmail']) {
  if (!config[key]) {
    console.error(`${configPath} is missing "${key}".`);
    process.exit(1);
  }
}
const outPath = arg('out') || 'uat-packet-data.txt';

const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const { signAccessToken } = require('../src/utils/tokens');
const { hashPassword } = require('../src/utils/password');

const PRIEST = 'Rev. Fr. Antonio Mercado Cañete';
const SANTUARIO_NAME = 'Santuario Arquidiocesano de Nuestra Señora del Carmen, la Limpia';
const REJECT_REASON = 'We could not find this baptism in Book 1 to Book 50. Please check the date of baptism.';

/** holyapp.uat@gmail.com + "admin1" → holyapp.uat+admin1@gmail.com */
function testerEmail(tag) {
  const [local, domain] = String(config.testerEmailBase || config.parishAdminEmail).split('@');
  return `${local.split('+')[0]}+${tag}@${domain}`.toLowerCase();
}

// ---- Who --------------------------------------------------------------------------------

const ADMINS = [
  { code: 'A1', tag: 'admin1', first: 'Josefina', last: 'Dela Cerna' },
  { code: 'A2', tag: 'admin2', first: 'Ricardo', last: 'Bastes' },
  { code: 'A3', tag: 'admin3', first: 'Maricris', last: 'Tecson' },
];

// The one staff sign-in. Marriage is Off and Schedule is View so the staff checks have something
// to refuse; edit, archive, void, fees and the Activity log are admin-only whatever the access.
const STAFF_ACCESS = {
  registers: 'manage',
  certificates: 'manage',
  donations: 'manage',
  intentions: 'manage',
  schedule: 'view',
  marriage: 'off',
};
const STAFF = { tag: 'staff', first: 'Teresa', last: 'Abellana' };
const REQUESTER = { tag: 'requester', first: 'Gloria', last: 'Cuyos' };

// Each parishioner tester requests the person on one of these records (Book 50, page = their number).
const PARISHIONERS = [
  ['Liza Mae', 'Capuno', 'Taneo', 'Female', '1998-03-14', '1998-05-10', 'Rosa'],
  ['Rodel', 'Ybañez', 'Sumalpong', 'Male', '1995-07-22', '1995-09-03', 'Jun'],
  ['Jocelyn', 'Rama', 'Cabatingan', 'Female', '2000-01-09', '2000-02-20', 'Mila'],
  ['Mark Anthony', 'Lapitan', 'Ouano', 'Male', '1997-11-30', '1998-01-11', 'Joy'],
  ['Kristel Ann', 'Belarmino', 'Go', 'Female', '2001-06-05', '2001-07-15', 'Paul'],
  ['Jerome Paul', 'Tabanao', 'Lim', 'Male', '1996-04-18', '1996-06-02', 'Grace'],
  ['Rhea Mae', 'Villacora', 'Sy', 'Female', '1999-09-25', '1999-11-07', 'Dennis'],
  ['Carlo Miguel', 'Abellanosa', 'Uy', 'Male', '2002-02-12', '2002-03-24', 'Bea'],
  ['Diane Grace', 'Pepito', 'Alcoseba', 'Female', '1994-08-08', '1994-09-18', 'Noel'],
  ['Neil Patrick', 'Gabutero', 'Seno', 'Male', '2003-12-01', '2004-01-18', 'Tina'],
].map(([first, middle, last, sex, born, baptized, sibling], i) => {
  const n = String(i + 1).padStart(2, '0');
  return { code: `P${n}`, first, middle, last, sex, born, baptized, sibling, page: String(i + 1) };
});

// Each office respondent's own data, so nobody changes someone else's.
const OFFICE_SETS = {
  A1: {
    pickup: ['Vicente', 'Arnaiz', 'Tabura', 'Male', '2010-05-14', '2010-06-27'],
    digital: ['Lourdes', 'Pañares', 'Ermac', 'Female', '2012-02-03', '2012-03-11'],
    noRecord: ['Rogelio', 'Tumulak', 'Baguio', '1979-03-03'],
    annotate: ['Nilo', 'Dagatan', 'Rosal', 'Male', '1985-01-12', '1985-02-24'],
    edit: ['Ofelia', 'Bacus', 'Montecillo', 'Female', '1990-04-04', '1990-05-20'],
    archive: ['Rufino', 'Galeos', 'Lapaz', 'Male', '1988-10-10', '1988-11-13'],
    donation: 'Leonora Bas Tagalog',
    intentionFor: 'Lolita Abarquez',
    page: '1',
  },
  A2: {
    pickup: ['Erlinda', 'Sabandal', 'Cortes', 'Female', '2009-09-09', '2009-10-18'],
    digital: ['Arnold', 'Cabañero', 'Nacua', 'Male', '2011-01-21', '2011-03-06'],
    noRecord: ['Felicidad', 'Mangubat', 'Ruiz', '1981-06-16'],
    annotate: ['Gemma', 'Inoc', 'Ponce', 'Female', '1987-05-30', '1987-07-05'],
    edit: ['Pacita', 'Lumayag', 'Remedio', 'Female', '1991-02-17', '1991-03-31'],
    archive: ['Dominador', 'Ruelan', 'Basco', 'Male', '1986-06-21', '1986-08-03'],
    donation: 'Cornelio Tampus Durano',
    intentionFor: 'Severino Lagura',
    page: '2',
  },
  A3: {
    pickup: ['Wilfredo', 'Canoy', 'Ypil', 'Male', '2008-12-12', '2009-01-25'],
    digital: ['Charmaine', 'Ladera', 'Alferez', 'Female', '2013-07-07', '2013-08-18'],
    noRecord: ['Benjamin', 'Ocaña', 'Rabor', '1976-11-11'],
    annotate: ['Rolando', 'Pilapil', 'Seares', 'Male', '1983-08-19', '1983-09-25'],
    edit: ['Gregorio', 'Sumile', 'Abadiano', 'Male', '1989-12-03', '1990-01-14'],
    archive: ['Editha', 'Cañizares', 'Mendaros', 'Female', '1987-03-09', '1987-04-26'],
    donation: 'Purificacion Gelig Lim',
    intentionFor: 'Corazon Tapales',
    page: '3',
  },
};

// ---- Helpers ----------------------------------------------------------------------------

async function addUser({ parishId, role, email, first, last, access }) {
  const { rows } = await pool.query(
    `INSERT INTO app_user (parish_id, role, email, password_hash, status, first_name, last_name, email_verified_at, staff_access)
     VALUES ($1, $2, $3, $4, 'active', $5, $6, NOW(), $7::jsonb)
     RETURNING id, parish_id, role, email`,
    [parishId, role, email, await hashPassword(config.password), first, last, access ? JSON.stringify(access) : null]
  );
  // Office accounts are people at the parish too: put them on the Staff page, as adding them in the app does.
  if (role === 'parish_admin' || role === 'parish_staff') {
    await pool.query(
      `INSERT INTO parish_personnel (parish_id, full_name, role_title, contact_info, user_id, status)
       VALUES ($1, $2, 'Admin Staff', NULL, $3, 'active')`,
      [parishId, `${first} ${last}`, rows[0].id]
    );
  }
  return { ...rows[0], token: signAccessToken(rows[0]) };
}

async function signedIn(email) {
  const { rows } = await pool.query('SELECT id, parish_id, role, email FROM app_user WHERE email = $1', [email]);
  if (!rows[0]) throw new Error(`No account ${email}.`);
  return { ...rows[0], token: signAccessToken(rows[0]) };
}

/** Calls the API as `user` and stops with a clear message if it refuses. */
async function call(user, method, url, { body, expect = [200, 201] } = {}) {
  let req = request(app)[method](url).set('Authorization', `Bearer ${user.token}`);
  if (body) req = req.send(body);
  const res = await req;
  if (!expect.includes(res.status)) {
    throw new Error(`${method.toUpperCase()} ${url} → ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

async function addBaptism(admin, [first, middle, last, sex, born, baptized], { book, page, entry }) {
  const res = await call(admin, 'post', '/records/baptism', {
    body: {
      firstName: first,
      middleName: middle,
      lastName: last,
      sex,
      dateOfBirth: born,
      dateOfBaptism: baptized,
      placeOfBirth: 'Cebu City',
      placeOfBaptism: SANTUARIO_NAME,
      legitimacyStatus: 'Legitimate',
      minister: PRIEST,
      fatherFirstName: 'Test',
      fatherLastName: last,
      motherFirstName: 'Test',
      motherLastName: middle,
      bookNumber: book,
      pageNumber: page,
      entryNumber: entry,
      remarks: 'UAT test record. Not a real person.',
    },
  });
  return res.record;
}

async function askFor(requester, person, { delivery, purpose, relationship }) {
  const [first, middle, last, , born, baptized] = person;
  return call(requester, 'post', '/requests', {
    body: {
      sacramentType: 'baptism',
      deliveryMethod: delivery,
      purpose,
      relationship,
      sacramentDate: baptized,
      fields: { firstName: first, middleName: middle, lastName: last, birthdate: born, birthplace: 'Cebu City' },
    },
  });
}

async function verifyLink(recordId, version) {
  const { rows } = await pool.query(
    `SELECT hash, certificate_code, status FROM certificate WHERE record_id = $1 ORDER BY version`,
    [recordId]
  );
  const row = version === 'last' ? rows[rows.length - 1] : rows[version - 1];
  const base = String(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  return { link: `${base}/verify/${row.hash}`, code: row.certificate_code, status: row.status };
}

function iso(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function manilaNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
}

/** Today plus `days`, as YYYY-MM-DD (Manila). */
function manilaDate(days) {
  const now = manilaNow();
  return iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days));
}

/** The next Sunday from tomorrow onward, as YYYY-MM-DD (Manila). */
function nextSunday() {
  const now = manilaNow();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  while (d.getDay() !== 0) d.setDate(d.getDate() + 1);
  return iso(d);
}

const full = (person) => person.slice(0, 3).join(' ');

// ---- Seed -------------------------------------------------------------------------------

async function seed(santuario) {
  const already = await pool.query('SELECT 1 FROM app_user WHERE email = $1', [testerEmail('admin1')]);
  if (already.rows.length) throw new Error(`Already seeded: ${testerEmail('admin1')} exists.`);

  const setup = await signedIn(config.parishAdminEmail.trim().toLowerCase());
  const out = [];
  const line = (s = '') => out.push(s);

  console.log('Admin, staff and requester accounts…');
  for (const a of ADMINS) {
    a.user = await addUser({ parishId: santuario.id, role: 'parish_admin', email: testerEmail(a.tag), first: a.first, last: a.last });
  }
  await addUser({
    parishId: santuario.id, role: 'parish_staff', email: testerEmail(STAFF.tag), first: STAFF.first, last: STAFF.last, access: STAFF_ACCESS,
  });
  const requester = await addUser({
    parishId: santuario.id, role: 'parishioner', email: testerEmail(REQUESTER.tag), first: REQUESTER.first, last: REQUESTER.last,
  });

  // Room for every tester's Mass intention at the same Mass.
  await call(setup, 'patch', '/intentions/capacity', { body: { massIntentionCapacity: 20 } });

  console.log("Parishioner testers' records…");
  line('PARISHIONER TESTERS (Set 1). They sign up with their own email. After UAT-02, run --give for each.');
  for (const p of PARISHIONERS) {
    await addBaptism(setup, [p.first, p.middle, p.last, p.sex, p.born, p.baptized], { book: '50', page: p.page, entry: '1' });
    line(`  ${p.code}  ${p.first} ${p.middle} ${p.last}  born ${p.born}, baptized ${p.baptized}  (Book 50, page ${p.page}, entry 1)`);
  }

  console.log('Office respondents: records, requests, intentions and donations…');
  const sunday = nextSunday();
  line();
  line('OFFICE RESPONDENTS (Set 2). Password for all: the shared UAT password.');
  line(`  Staff sign-in shared by all three: ${STAFF.first} ${STAFF.last}  ${testerEmail(STAFF.tag)}`);
  for (const a of ADMINS) {
    const set = OFFICE_SETS[a.code];
    const page = set.page;
    const archiveEntry = String(Number(page) + 3);
    await addBaptism(a.user, set.pickup, { book: '61', page, entry: '1' });
    await addBaptism(a.user, set.digital, { book: '61', page, entry: '2' });
    await addBaptism(a.user, set.annotate, { book: '62', page: '2', entry: page });
    await addBaptism(a.user, set.edit, { book: '62', page: '1', entry: page });
    await addBaptism(a.user, set.archive, { book: '62', page: '1', entry: archiveEntry });
    const pickup = await askFor(requester, set.pickup, { delivery: 'pickup', purpose: 'School enrollment', relationship: 'Parent' });
    const digital = await askFor(requester, set.digital, { delivery: 'digital', purpose: 'Personal records', relationship: 'Parent' });
    const [f, m, l, born] = set.noRecord;
    const none = await askFor(requester, [f, m, l, 'Male', born, '1980-01-06'], {
      delivery: 'pickup', purpose: 'Marriage', relationship: 'Other relative',
    });
    await call(requester, 'post', '/intentions', {
      body: {
        scheduleDate: sunday,
        scheduleTime: '6:00 AM',
        intentionType: 'Thanksgiving',
        intentionFor: set.intentionFor,
        requestedBy: `${REQUESTER.first} ${REQUESTER.last}`,
        contact: '0917 555 0101',
      },
    });
    await call(a.user, 'post', '/donations', {
      body: { donorName: set.donation, donationType: 'Cash', amount: 1000, donationDate: manilaDate(0) },
    });
    line();
    line(`  ${a.code}  ${a.first} ${a.last}  ${testerEmail(a.tag)}  (Parish Admin)`);
    line(`      pickup ${pickup.referenceNo} (${full(set.pickup)})  digital ${digital.referenceNo} (${full(set.digital)})  no record ${none.referenceNo} (${f} ${m} ${l})`);
    line(`      intention for ${set.intentionFor}, ${sunday} 6:00 AM; annotate ${full(set.annotate)} (62:2:${page})`);
    line(`      edit ${full(set.edit)} (62:1:${page}); archive ${full(set.archive)} (62:1:${archiveEntry}); void ${set.donation}'s ₱1,000.00`);
  }

  console.log('Certificates to verify…');
  const teodoro = await addBaptism(setup, ['Teodoro', 'Lacson', 'Bacaltos', 'Male', '1975-02-02', '1975-03-16'], { book: '60', page: '1', entry: '1' });
  await call(setup, 'post', `/records/baptism/${teodoro.id}/certificates`, { body: { purpose: 'Personal records' } });
  await call(setup, 'post', `/records/baptism/${teodoro.id}/certificates`, { body: { purpose: 'Personal records' } });
  const superseded = await verifyLink(teodoro.id, 1);

  const imelda = await addBaptism(setup, ['Imelda', 'Sarmiento', 'Quijano', 'Female', '1972-07-07', '1972-08-20'], { book: '60', page: '1', entry: '2' });
  await call(setup, 'post', `/records/baptism/${imelda.id}/certificates`, { body: { purpose: 'Personal records' } });
  const certId = (await pool.query('SELECT id FROM certificate WHERE record_id = $1', [imelda.id])).rows[0].id;
  await call(setup, 'post', `/certificates/${certId}/revoke`, { body: { reason: 'Issued with the wrong date of baptism.' } });
  const revoked = await verifyLink(imelda.id, 1);

  line();
  line('SHARED DATA');
  line('  Search record: Teodoro Lacson Bacaltos (60:1:1)');
  line(`  Superseded link (${superseded.code}, ${superseded.status}): ${superseded.link}`);
  line(`  Revoked link (${revoked.code}, ${revoked.status}): ${revoked.link}`);
  line(`  Mass for intentions: ${sunday} 6:00 AM (limit raised to 20 per Mass)`);
  line();
  line('GIVEN REQUESTS (added by --give)');

  fs.writeFileSync(outPath, out.join('\n') + '\n');
  console.log(`\nDone. Tester card data written to ${outPath}.`);
}

// ---- Give a signed-up parishioner their ready-made requests ------------------------------

async function give(santuario, list) {
  const setup = await signedIn(config.parishAdminEmail.trim().toLowerCase());
  const out = [];
  for (const pair of list.split(',').map((s) => s.trim()).filter(Boolean)) {
    const [code, rawEmail] = pair.split('=').map((s) => s.trim());
    const p = PARISHIONERS.find((x) => x.code === String(code).toUpperCase());
    if (!p || !rawEmail) throw new Error(`"${pair}" should look like P01=their@email.com (P01 to P10).`);
    const email = rawEmail.toLowerCase();

    const { rows: users } = await pool.query(
      'SELECT id, parish_id, role, email, email_verified_at FROM app_user WHERE email = $1',
      [email]
    );
    const u = users[0];
    if (!u) throw new Error(`${p.code}: no account ${email}. The tester signs up first (UAT-01, UAT-02).`);
    if (u.role !== 'parishioner' || u.parish_id !== santuario.id) throw new Error(`${p.code}: ${email} is not a Santuario parishioner.`);
    if (!u.email_verified_at) throw new Error(`${p.code}: ${email} has not entered the emailed code yet (UAT-02).`);
    const user = { id: u.id, parish_id: u.parish_id, role: u.role, email: u.email };
    user.token = signAccessToken(user);

    const { rows: recs } = await pool.query(
      `SELECT id FROM baptism WHERE parish_id = $1 AND book_number = '50' AND page_number = $2 AND entry_number = '1'`,
      [santuario.id, p.page]
    );
    if (!recs[0]) throw new Error(`${p.code}: no record at Book 50, page ${p.page}. Run the seed (without --give) first.`);
    const recordId = recs[0].id;

    const { rows: had } = await pool.query('SELECT count(*)::int AS n FROM certificate_request WHERE requested_by = $1', [u.id]);
    if (had[0].n > 0) console.log(`  (${email} already has ${had[0].n} request(s); adding three more.)`);

    const person = [p.first, p.middle, p.last, p.sex, p.born, p.baptized];

    // A: released digital copy in their wallet.
    const a = await askFor(user, person, { delivery: 'digital', purpose: 'Personal records', relationship: 'Other relative' });
    await call(setup, 'post', `/requests/${a.id}/link`, { body: { recordId } });
    await call(setup, 'post', `/requests/${a.id}/payment`);
    const issued = await call(setup, 'post', `/requests/${a.id}/issue`);

    // B: matched and waiting for payment, for the GCash case.
    const b = await askFor(user, person, { delivery: 'digital', purpose: 'Passport or government ID', relationship: 'Other relative' });
    await call(setup, 'post', `/requests/${b.id}/link`, { body: { recordId } });

    // C: the record person's sibling, whom the parish could not find.
    const c = await askFor(user, [p.sibling, p.middle, p.last, p.sex, '1990-01-01', '1990-02-04'], {
      delivery: 'pickup', purpose: 'School enrollment', relationship: 'Other relative',
    });
    await call(setup, 'post', `/requests/${c.id}/reject`, { body: { reason: REJECT_REASON } });

    const lines = [
      `${p.code}  ${email}  (requests for ${p.first} ${p.middle} ${p.last})`,
      `     A released ${a.referenceNo} (${issued.certificateCode})  ${issued.verifyUrl}`,
      `     B awaiting payment ${b.referenceNo}    C rejected ${c.referenceNo}`,
    ];
    lines.forEach((l) => console.log(l));
    out.push(...lines);
  }
  fs.appendFileSync(outPath, out.join('\n') + '\n');
  console.log(`\nAdded to ${outPath}.`);
}

async function main() {
  const santuario = (await pool.query('SELECT id FROM parish WHERE slug = $1', [config.santuarioSlug])).rows[0];
  if (!santuario) throw new Error(`No parish "${config.santuarioSlug}". Run seed-uat.js first.`);
  const giveList = arg('give');
  if (giveList) await give(santuario, giveList);
  else await seed(santuario);
}

main()
  .catch((err) => {
    console.error(`\nStopped: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
