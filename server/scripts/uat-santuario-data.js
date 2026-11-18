// UAT only: the made-up Santuario data a parish admin test session starts from. Every name, date
// and record here is invented. reset-uat-parish.js and seed-uat-santuario.js read it, and the test
// plan's inputs should come from it: a record the plan asks testers to find, edit, match or reject
// must be listed here, and a book / page / entry the plan asks them to ADD must not be.
//
// Book numbers used by the seed: 55–62 (baptisms). Free for testers to add into: 70 and up.

const PRIEST = { honorific: 'Rev. Fr.', name: 'Antonio Mercado Cañete', title: 'Parish Priest' };
const PRIEST_FULL = `${PRIEST.honorific} ${PRIEST.name}`;
const PARISH_NAME = 'Santuario Arquidiocesano de Nuestra Señora del Carmen, la Limpia';
// The hosted UAT site, for the certificate check link printed on the test forms.
const SITE_URL = 'https://holyapp-production.up.railway.app';

// The three office sign-ins, kept by the reset. Passwords: uat-config.json → adminPasswords.
const ADMINS = [
  { tag: 'admin1', first: 'Josefina', last: 'Dela Cerna' },
  { tag: 'admin2', first: 'Ricardo', last: 'Bastes' },
  { tag: 'admin3', first: 'Maricris', last: 'Tecson' },
];

// The parishioner who sent the requests below: tester 1's account, so someone can sign in as them
// and pay for the requests with GCash. The reset keeps parishioner accounts, so it stays.
const REQUESTER = { tag: 'test1' };
// Who collects the pickup certificate at the office (typed by staff when releasing it).
const PICKUP_BY = 'Gloria Cuyos';

/** holyapp.uat@gmail.com + "admin1" → holyapp.uat+admin1@gmail.com */
function officeEmail(config, tag) {
  const [local, domain] = String(config.testerEmailBase || config.parishAdminEmail).split('@');
  return `${local.split('+')[0]}+${tag}@${domain}`.toLowerCase();
}

// Baptism records. [first, middle, last, sex, born, baptized, father, mother, godparents, book, page, entry]
const BAPTISMS = [
  // Plan: RE-01 finds this one by searching "Bacaltos".
  ['Teodoro', 'Lacson', 'Bacaltos', 'Male', '1975-02-02', '1975-03-16', 'Ernesto Bacaltos', 'Luz Lacson', ['Pedro Ouano', 'Carmen Tan'], '60', '1', '1'],
  // Plan: CR-01 matches the request for him to this record; CE-01 prints his certificate.
  ['Vicente', 'Arnaiz', 'Tabura', 'Male', '2010-05-14', '2010-06-27', 'Ramon Tabura', 'Elena Arnaiz', ['Jose Uy', 'Marites Lim'], '61', '1', '1'],
  // Plan: RE-04 edits her place of birth.
  ['Ofelia', 'Bacus', 'Montecillo', 'Female', '1990-04-04', '1990-05-20', 'Alberto Montecillo', 'Rosario Bacus', ['Danilo Seno', 'Merlie Chiong'], '62', '1', '1'],
  // Everyday records, so the register isn't empty.
  ['Kristine Joy', 'Bacalso', 'Uy', 'Female', '1996-08-23', '1996-10-06', 'Wilfredo Uy', 'Corazon Bacalso', ['Danilo Ouano', 'Merlie Chiong'], '55', '12', '5'],
  ['Mary Grace', 'Paras', 'Villanueva', 'Female', '2001-01-15', '2001-03-04', 'Rogelio Villanueva', 'Nenita Paras', ['Alfredo Sabellano', 'Cristina Gabutero'], '56', '7', '11'],
  ['Carlo Jose', 'Abarquez', 'Lim', 'Male', '2004-01-04', '2004-02-08', 'Jose Lim', 'Carmela Abarquez', ['Ramon Uy', 'Lorna Tan'], '57', '3', '1'],
  ['Angela Mae', 'Cortes', 'Dela Torre', 'Female', '2006-01-11', '2006-02-12', 'Arnel Dela Torre', 'Mae Cortes', ['Felix Go', 'Ruth Sy'], '57', '3', '2'],
  ['Mark Vincent', 'Seno', 'Alfafara', 'Male', '2008-01-28', '2008-03-02', 'Victor Alfafara', 'Gina Seno', ['Leo Rama', 'Pia Sison'], '58', '9', '4'],
  ['Princess Ann', 'Booc', 'Maglasang', 'Female', '2012-02-18', '2012-04-08', 'Al Maglasang', 'Ann Booc', ['Jun Cabrera', 'May Lao'], '59', '2', '6'],
  ['Kenneth Rey', 'Labra', 'Diola', 'Male', '2015-02-06', '2015-03-29', 'Rey Diola', 'Joy Labra', ['Ariel Ponce', 'Liza Ong'], '59', '14', '3'],
];

// Certificate requests from the requester, waiting for the office.
//   person: [first, middle, last, born, baptized]
const REQUESTS = [
  // Plan: CR-01 to CR-03 (match, cash payment, release for pickup).
  { person: ['Vicente', 'Arnaiz', 'Tabura', '2010-05-14', '2010-06-27'], delivery: 'pickup', purpose: 'School enrollment', relationship: 'Parent' },
  // Form A: matched, paid in cash and released as a digital copy.
  { person: ['Kristine Joy', 'Bacalso', 'Uy', '1996-08-23', '1996-10-06'], delivery: 'digital', purpose: 'Employment', relationship: 'Sibling' },
  // Plan: CR-04 rejects it: there is no record for him.
  { person: ['Rogelio', 'Tumulak', 'Baguio', '1979-03-03', '1980-01-06'], delivery: 'pickup', purpose: 'Marriage', relationship: 'Other relative' },
];

// Donations already in the log, recorded today by admin1.
const DONATIONS = [
  { donorName: 'Herminio Dabon', donationType: 'Cash', amount: 500 },
  { donorName: 'Leonora Bas Tagalog', donationType: 'Cash', amount: 1000 },
];

// Certificates already issued, by the record's last name. The first one's QR code is printed on the
// forms for the "verify a certificate" tasks (it stays Valid). Form A annotates the second one's
// record, which marks its certificate Superseded.
const CERTIFICATES = [
  { lastName: 'Bacaltos', purpose: 'Personal records' },
  { lastName: 'Diola', purpose: 'School enrollment' },
];

// A staff sign-in with limited access ("Records encoder"), for the secure-access task: Donations is
// off, so it isn't in their menu. Password: uat-config.json → staffPassword.
const STAFF = {
  tag: 'staff',
  first: 'Teresa',
  last: 'Abellana',
  access: { registers: 'manage', certificates: 'view', donations: 'off', intentions: 'off', schedule: 'view', marriage: 'view' },
};

// The handwritten baptism register page the facilitator uploads on the hosted site before a test
// session (the seed doesn't add it). Form A has the tester read it (OCR) and search for a name on
// it. Upload it as exactly this book and page number.
const LEDGER = {
  sacramentType: 'baptism',
  volumeLabel: 'Book 63',
  title: 'Baptismal Register Book 63',
  yearStart: 2026,
  yearEnd: 2026,
  pageNumber: 1,
  // What Form A searches for once the page is read, and the entry it should find (row 3 on the page).
  searchFor: 'Pepito',
  expect: { name: 'Princess Nicole B. Pepito', baptized: '2026-06-14' },
};

module.exports = {
  PRIEST, PRIEST_FULL, PARISH_NAME, SITE_URL, ADMINS, REQUESTER, PICKUP_BY, BAPTISMS, REQUESTS, DONATIONS, CERTIFICATES,
  STAFF, LEDGER, officeEmail,
};
