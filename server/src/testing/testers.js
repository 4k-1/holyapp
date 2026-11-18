// UAT only: the ten ready-made tester accounts and the made-up details each one types in the test guide.
// Each person below has a matching baptism record in the tester's parish on the test site.
// Every name and date here is invented.
//
// Testers 1–5 belong to the first parish in UAT_TESTER_PARISHES, testers 6–10 to the second
// (on the hosted test site: "santuario,sto-nino-test").

const PEOPLE = [
  { sex: 'Female', first: 'Maria', last: 'Santos', born: '1990-03-03', baptized: '1990-04-15', father: 'Roberto Santos', mother: 'Elena Cruz', massFor: 'Lola Rosa Santos', donation: 100 },
  { sex: 'Male', first: 'Juan', last: 'Dela Cruz', born: '1985-07-21', baptized: '1985-08-18', father: 'Pedro Dela Cruz', mother: 'Linda Ramos', massFor: 'Papa Pedro Dela Cruz', donation: 50 },
  { sex: 'Female', first: 'Ana', last: 'Reyes', born: '2001-01-09', baptized: '2001-02-04', father: 'Miguel Reyes', mother: 'Teresa Lim', massFor: 'Lolo Andres Reyes', donation: 200 },
  { sex: 'Male', first: 'Jose', last: 'Villanueva', born: '1968-05-30', baptized: '1968-06-23', father: 'Ramon Villanueva', mother: 'Carmen Diaz', massFor: 'Mama Carmen Villanueva', donation: 100 },
  { sex: 'Female', first: 'Grace', last: 'Tan', born: '1995-10-12', baptized: '1995-11-05', father: 'Henry Tan', mother: 'Susan Go', massFor: 'Tito Ramon Tan', donation: 150 },
  { sex: 'Male', first: 'Mark', last: 'Abellana', born: '2003-12-02', baptized: '2004-01-06', father: 'Danilo Abellana', mother: 'Fe Rosales', massFor: 'Lola Fe Abellana', donation: 50 },
  { sex: 'Female', first: 'Luz', last: 'Cabahug', born: '1958-08-14', baptized: '1958-09-07', father: 'Ernesto Pepito', mother: 'Lourdes Uy', massFor: 'Ernesto Cabahug', donation: 100 },
  { sex: 'Male', first: 'Paolo', last: 'Ramos', born: '1999-02-27', baptized: '1999-03-26', father: 'Rodel Ramos', mother: 'Nora Santos', massFor: 'Papa Rodel Ramos', donation: 300 },
  { sex: 'Female', first: 'Joy', last: 'Ybañez', born: '1979-06-05', baptized: '1979-07-01', father: 'Arturo Ybañez', mother: 'Elena Sy', massFor: 'Mama Elena Ybañez', donation: 100 },
  { sex: 'Male', first: 'Carlo', last: 'Alcantara', born: '1992-09-18', baptized: '1992-10-11', father: 'Felipe Alcantara', mother: 'Rosa Lim', massFor: 'Lolo Felipe Alcantara', donation: 200 },
];

const BIRTHPLACES = ['Cebu City', 'Mandaue City'];

function parishSlugs() {
  return String(process.env.UAT_TESTER_PARISHES || 'santuario,sto-nino-test')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function testerEmail(n) {
  return `holyapp.uat+test${n}@gmail.com`;
}

/** Tester number for a ready-made test account's email, or null for anyone else. */
function testerNumber(email) {
  const m = String(email || '').trim().toLowerCase().match(/^holyapp\.uat\+test(\d+)@gmail\.com$/);
  const n = m ? Number(m[1]) : 0;
  return n >= 1 && n <= PEOPLE.length ? n : null;
}

function tester(n) {
  const person = PEOPLE[n - 1];
  if (!person) return null;
  const group = n <= 5 ? 0 : 1;
  return {
    n,
    email: testerEmail(n),
    parishSlug: parishSlugs()[group] || parishSlugs()[0],
    contactNumber: `0917 000 00${String(n).padStart(2, '0')}`,
    birthplace: BIRTHPLACES[group],
    ...person,
  };
}

function allTesters() {
  return PEOPLE.map((_, i) => tester(i + 1));
}

/** The test guide's tasks, in order. */
const STEPS = ['signin', 'request', 'contact', 'records', 'pay', 'mass', 'give', 'certificate', 'office', 'logout'];

module.exports = { tester, allTesters, testerNumber, testerEmail, STEPS };
