// Fills an EMPTY HolyApp database with the made-up data the UAT scripts expect.
// Every name, date and record here is invented. Never run this on a database with real parish data.
//
//   node scripts/seed-uat.js --env .env.uat --config scripts/uat-config.json
//
// --env     the env file of the server you are seeding (its DATABASE_URL, DATABASE_SSL and,
//           above all, its DATA_ENCRYPTION_KEY: records are encrypted with it, so it must match
//           the hosted server's key exactly or the site can't read them).
// --config  emails and the shared test password (copy scripts/uat-config.example.json).
//
// Run it from your computer (it draws the ledger page photos with your computer's fonts).

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
for (const key of ['santuarioSlug', 'password', 'superAdminEmail', 'parishAdminEmail', 'parishionerAEmail', 'parishionerBEmail']) {
  if (!config[key]) {
    console.error(`${configPath} is missing "${key}".`);
    process.exit(1);
  }
}

const sharp = require('sharp');
const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/config/db');
const { signAccessToken } = require('../src/utils/tokens');
const { hashPassword } = require('../src/utils/password');

const SANTUARIO = {
  slug: config.santuarioSlug,
  name: 'Santuario Arquidiocesano de Nuestra Señora del Carmen, la Limpia',
  address: 'Cebu City, Cebu',
  contact: '(032) 254 1234',
  email: config.parishEmail || config.parishAdminEmail,
};
const STO_NINO = {
  slug: 'sto-nino-test',
  name: 'Sto. Niño Test Parish',
  address: 'Mandaue City, Cebu',
  contact: '(032) 000 0000',
  email: 'office@sto-nino-test.invalid',
};
const PRIEST = 'Rev. Fr. Antonio Mercado Cañete';

async function addParish(p) {
  const { rows } = await pool.query(
    `INSERT INTO parish (name, address, contact, email, slug) VALUES ($1, $2, $3, $4, $5) RETURNING id, slug`,
    [p.name, p.address, p.contact, p.email, p.slug]
  );
  return rows[0];
}

async function addUser({ parishId, role, email, first, last, password }) {
  const { rows } = await pool.query(
    `INSERT INTO app_user (parish_id, role, email, password_hash, status, first_name, last_name, email_verified_at)
     VALUES ($1, $2, $3, $4, 'active', $5, $6, NOW())
     RETURNING id, parish_id, role, email`,
    [parishId, role, email.trim().toLowerCase(), await hashPassword(password), first, last]
  );
  return { ...rows[0], token: signAccessToken(rows[0]) };
}

/** Calls the API as `user` and stops with a clear message if it refuses. */
async function call(user, method, url, { body, raw, type, expect = [200, 201] } = {}) {
  let req = request(app)[method](url).set('Authorization', `Bearer ${user.token}`);
  if (raw) req = req.set('Content-Type', type).send(raw);
  else if (body) req = req.send(body);
  const res = await req;
  if (!expect.includes(res.status)) {
    throw new Error(`${method.toUpperCase()} ${url} → ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

function baptism(overrides) {
  return {
    sex: 'Female',
    placeOfBirth: 'Cebu City',
    placeOfBaptism: SANTUARIO.name,
    legitimacyStatus: 'Legitimate',
    minister: PRIEST,
    remarks: 'UAT test record. Not a real person.',
    ...overrides,
  };
}

// ---- Made-up register pages ------------------------------------------------------------

const LEDGER_ROWS = {
  13: [
    ['1', 'Carlo Jose Abarquez Lim', 'Jan 4, 2025', 'Feb 9, 2025', 'Jose Lim & Carmela Abarquez', 'Ramon Uy, Lorna Tan', PRIEST],
    ['2', 'Angela Mae Cortes Dela Torre', 'Jan 11, 2025', 'Feb 9, 2025', 'Arnel Dela Torre & Mae Cortes', 'Felix Go, Ruth Sy', PRIEST],
    ['3', 'Josefina Rae Oyao Tumulak', 'Jan 20, 2025', 'Feb 23, 2025', 'Dante Tumulak & Rhea Oyao', 'Ben Cruz, Ana Pages', PRIEST],
    ['4', 'Mark Vincent Seno Alfafara', 'Jan 28, 2025', 'Mar 2, 2025', 'Victor Alfafara & Gina Seno', 'Leo Rama, Pia Sison', PRIEST],
    ['5', 'Lyka Shane Gica Pepito', 'Feb 1, 2025', 'Mar 2, 2025', 'Noel Pepito & Shane Gica', 'Rex Ouano, Bea Lim', PRIEST],
  ],
  14: [
    ['1', 'Kenneth Rey Labra Diola', 'Feb 6, 2025', 'Mar 30, 2025', 'Rey Diola & Joy Labra', 'Ariel Ponce, Liza Ong', PRIEST],
    ['2', 'Princess Ann Booc Maglasang', 'Feb 18, 2025', 'Apr 6, 2025', 'Al Maglasang & Ann Booc', 'Jun Cabrera, May Lao', PRIEST],
    ['3', 'Juan Miguel Santos Rosales', 'Mar 2, 2025', 'Apr 19, 2025', 'Ramon Delos Reyes Rosales & Ana Liza Catubig Santos', 'Ernesto Lim Cabahug, Teresita Bacalso Ybañez', PRIEST],
    ['4', 'Sofia Isabel Rama Belarmino', 'May 10, 2025', 'Jun 8, 2025', 'Glenn Belarmino & Isabel Rama', 'Toto Yap, Nina Chiong', PRIEST],
    ['5', 'Gabriel Luis Pacaña Sanchez', 'May 22, 2025', 'Jun 8, 2025', 'Luis Sanchez & Gemma Pacaña', 'Art Neri, Joan Uy', PRIEST],
  ],
  15: [
    ['1', 'Althea Grace Lumapas Ruiz', 'Jun 2, 2025', 'Jul 6, 2025', 'Paolo Ruiz & Grace Lumapas', 'Dino Tiu, Rose Abad', PRIEST],
    ['2', 'Nathaniel Cruz Ybañez', 'Jun 9, 2025', 'Jul 13, 2025', 'Nestor Ybañez & Celia Cruz', 'Ely Sy, Tess Go', PRIEST],
    ['3', 'Bea Patricia Ompad Cuizon', 'Jun 17, 2025', 'Jul 20, 2025', 'Pat Cuizon & Bea Ompad', 'Ron Lee, Kay Chua', PRIEST],
    ['4', 'Elijah James Gonzaga Alfeche', 'Jun 25, 2025', 'Jul 27, 2025', 'James Alfeche & Eva Gonzaga', 'Sid Uy, Lou Tan', PRIEST],
  ],
};

function escapeXml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function ledgerPhoto(pageNumber) {
  const W = 2600;
  const H = 1500;
  const cols = [
    ['No.', 70],
    ['Name of the Child', 420],
    ['Date of Birth', 265],
    ['Date of Baptism', 265],
    ['Parents', 600],
    ['Godparents', 530],
    ['Minister', 360],
  ];
  const left = 40;
  const top = 190;
  const rowH = 190;
  const font = "font-family=\"'Segoe Print','Bradley Hand','Comic Sans MS','Courier New',monospace\"";
  let x = left;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<rect width="100%" height="100%" fill="#efe6cf"/>
<text x="${W / 2}" y="70" text-anchor="middle" font-size="44" font-family="Georgia,serif" fill="#2b2418">LIBER BAPTIZATORUM — Book 41 (2024–2025)</text>
<text x="${W / 2}" y="120" text-anchor="middle" font-size="30" font-family="Georgia,serif" fill="#2b2418">${escapeXml(SANTUARIO.name)}</text>
<text x="${W - 60}" y="120" text-anchor="end" font-size="34" font-family="Georgia,serif" fill="#2b2418">Page ${pageNumber}</text>`;
  for (const [label, w] of cols) {
    svg += `<rect x="${x}" y="${top}" width="${w}" height="${rowH * 5 + 70}" fill="none" stroke="#5a4a32" stroke-width="2"/>`;
    svg += `<text x="${x + 10}" y="${top + 45}" font-size="26" font-family="Georgia,serif" font-weight="bold" fill="#2b2418">${label}</text>`;
    x += w;
  }
  svg += `<line x1="${left}" y1="${top + 70}" x2="${x}" y2="${top + 70}" stroke="#5a4a32" stroke-width="2"/>`;
  LEDGER_ROWS[pageNumber].forEach((row, r) => {
    const y = top + 70 + r * rowH;
    if (r > 0) svg += `<line x1="${left}" y1="${y}" x2="${x}" y2="${y}" stroke="#8a7a5a" stroke-width="1"/>`;
    let cx = left;
    row.forEach((cell, c) => {
      const w = cols[c][1];
      // Wrap long cells onto up to four lines.
      const words = cell.split(' ');
      const lines = [];
      let line = '';
      const maxChars = Math.floor(w / 17);
      for (const word of words) {
        if ((line + ' ' + word).trim().length > maxChars) {
          lines.push(line.trim());
          line = word;
        } else line += ` ${word}`;
      }
      lines.push(line.trim());
      lines.slice(0, 4).forEach((text, i) => {
        svg += `<text x="${cx + 12}" y="${y + 50 + i * 38}" font-size="30" ${font} fill="#1d2a52">${escapeXml(text)}</text>`;
      });
      cx += w;
    });
  });
  svg += '</svg>';
  return sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toBuffer();
}

// ---- Seed ------------------------------------------------------------------------------

async function main() {
  const existing = await pool.query('SELECT slug FROM parish WHERE slug = ANY($1)', [[SANTUARIO.slug, STO_NINO.slug]]);
  if (existing.rows.length) {
    throw new Error(`Already seeded: parish "${existing.rows[0].slug}" exists. Seed only an empty database.`);
  }
  if (!process.env.DATA_ENCRYPTION_KEY) {
    throw new Error('DATA_ENCRYPTION_KEY is not set in the env file. Use the same key as the hosted server.');
  }

  const password = config.password;
  console.log('Parishes and accounts…');
  const santuario = await addParish(SANTUARIO);
  const stoNino = await addParish(STO_NINO);
  await addUser({ parishId: null, role: 'super_admin', email: config.superAdminEmail, first: 'HolyApp', last: 'Admin', password });
  const admin = await addUser({
    parishId: santuario.id,
    role: 'parish_admin',
    email: config.parishAdminEmail,
    first: config.parishAdminFirstName || 'Parish',
    last: config.parishAdminLastName || 'Admin',
    password,
  });
  const ana = await addUser({ parishId: santuario.id, role: 'parishioner', email: config.parishionerAEmail, first: 'Ana Liza', last: 'Rosales', password });
  const pedro = await addUser({ parishId: santuario.id, role: 'parishioner', email: config.parishionerBEmail, first: 'Pedro', last: 'Yap', password });
  const stoNinoAdmin = await addUser({
    parishId: stoNino.id,
    role: 'parish_admin',
    email: 'admin@sto-nino-test.invalid',
    first: 'Sto. Niño',
    last: 'Admin',
    password: require('crypto').randomBytes(24).toString('hex'),
  });

  console.log('Parish logo, priest and Sunday Mass…');
  const logo = fs.readFileSync(path.join(__dirname, '..', '..', 'client', 'src', 'assets', 'mtcarmellogo.png'));
  await call(admin, 'put', '/parish/settings/logo', { raw: logo, type: 'image/png' });
  await call(admin, 'post', '/personnel', {
    body: { name: 'Antonio Mercado Cañete', honorific: 'Rev. Fr.', titles: [{ title: 'Parish Priest' }] },
  });
  await call(admin, 'post', '/schedule/recurring', {
    body: { label: 'Sunday Mass', type: 'mass', days: ['Sun'], slots: [{ start: '6:00 AM', end: '7:00 AM' }] },
  });

  console.log('Baptism records…');
  await call(admin, 'post', '/records/baptism', {
    body: baptism({
      firstName: 'Kristine Joy',
      middleName: 'Bacalso',
      lastName: 'Uy',
      dateOfBirth: '1996-08-23',
      dateOfBaptism: '1996-10-06',
      fatherFirstName: 'Wilfredo',
      fatherLastName: 'Uy',
      motherFirstName: 'Corazon',
      motherLastName: 'Bacalso',
      godparents: [
        { firstName: 'Danilo', lastName: 'Ouano' },
        { firstName: 'Merlie', lastName: 'Chiong' },
      ],
      bookNumber: '30',
      pageNumber: '12',
      entryNumber: '05',
    }),
  });
  await call(admin, 'post', '/records/baptism', {
    body: baptism({
      firstName: 'Mary Grace',
      middleName: 'Paras',
      lastName: 'Villanueva',
      dateOfBirth: '2001-01-15',
      dateOfBaptism: '2001-03-04',
      fatherFirstName: 'Rogelio',
      fatherLastName: 'Villanueva',
      motherFirstName: 'Nenita',
      motherLastName: 'Paras',
      godparents: [
        { firstName: 'Alfredo', lastName: 'Sabellano' },
        { firstName: 'Cristina', lastName: 'Gabutero' },
      ],
      bookNumber: '34',
      pageNumber: '7',
      entryNumber: '11',
    }),
  });
  await call(stoNinoAdmin, 'post', '/records/baptism', {
    body: baptism({
      firstName: 'Rosalinda',
      middleName: 'Cabrera',
      lastName: 'Ouano',
      dateOfBirth: '1985-02-14',
      dateOfBaptism: '1985-03-17',
      placeOfBaptism: STO_NINO.name,
      fatherFirstName: 'Jesus',
      fatherLastName: 'Ouano',
      motherFirstName: 'Remedios',
      motherLastName: 'Cabrera',
      minister: 'Rev. Fr. Test Priest',
      bookNumber: '3',
      pageNumber: '40',
      entryNumber: '02',
    }),
  });

  console.log('Ledger book and page photos…');
  const book = await call(admin, 'post', '/ledgers/books', {
    body: { sacramentType: 'baptism', volumeLabel: 'Book 41', title: 'Baptism Register Book 41', yearStart: 2024, yearEnd: 2025 },
  });
  const bookId = (book.book || book).id;
  for (const page of [13, 14, 15]) {
    const photo = await ledgerPhoto(page);
    if (config.saveLedgerPhotosTo) fs.writeFileSync(path.join(config.saveLedgerPhotosTo, `book41-page${page}.jpg`), photo);
    await call(admin, 'post', `/ledgers/books/${bookId}/pages?pageNumber=${page}`, { raw: photo, type: 'image/jpeg' });
  }

  console.log("Parishioners' requests…");
  const juan = {
    firstName: 'Juan Miguel',
    middleName: 'Santos',
    lastName: 'Rosales',
    birthdate: '2025-03-02',
    birthplace: 'Cebu City',
    fathersName: 'Ramon Delos Reyes Rosales',
    mothersName: 'Ana Liza Catubig Santos',
  };
  for (const purpose of ['School enrollment', 'First Communion or Confirmation']) {
    await call(ana, 'post', '/requests', {
      body: { sacramentType: 'baptism', deliveryMethod: 'pickup', purpose, relationship: 'Parent', sacramentDate: '2025-04-19', fields: juan },
    });
  }
  await call(pedro, 'post', '/requests', {
    body: {
      sacramentType: 'baptism',
      deliveryMethod: 'pickup',
      purpose: 'Passport or government ID',
      relationship: 'Self',
      fields: { firstName: 'Pedro', middleName: 'Alcantara', lastName: 'Yap', birthdate: '1979-06-11', birthplace: 'Cebu City' },
    },
  });

  console.log(`
Done. Sign in at /${santuario.slug}/login (parish) or /super-admin/login.
  Parish admin   ${config.parishAdminEmail}
  Parishioner A  ${config.parishionerAEmail}  (Ana Liza Rosales)
  Parishioner B  ${config.parishionerBEmail}  (Pedro Yap)
  Super admin    ${config.superAdminEmail}
All use the password in ${path.basename(configPath)}.
Sto. Niño Test Parish admin page (for AC-01): /${stoNino.slug}/admin`);
}

main()
  .catch((err) => {
    console.error(`\nSeeding stopped: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
