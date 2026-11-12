/**
 * The funds a gift can go to (D3). Mirrored by client/src/lib/funds.ts; a test checks the two match.
 * Gifts to anything not listed keep the purpose staff typed.
 * `mustRemit`: the parish passes every peso on to the diocese or the Holy See.
 */
const FUNDS = Object.freeze([
  { name: 'General fund', description: 'Where the parish needs it most' },
  { name: 'Church repair and maintenance', description: 'Upkeep of the church and grounds' },
  { name: 'Outreach and charity', description: 'Help for families in need' },
  { name: 'Feast day celebration', description: 'The parish fiesta and liturgies' },
  { name: 'Feeding program', description: 'Meals for children and families' },
  { name: 'Seminarians', description: 'Support for young men studying for the priesthood' },
  { name: "Peter's Pence", description: "The Holy Father's works of charity", mustRemit: true },
  { name: 'Alay Kapwa', description: 'The Lenten program for the poor', mustRemit: true },
  { name: 'Mission Sunday', description: 'The missions of the Church', mustRemit: true },
  { name: 'Holy Land', description: 'The Good Friday collection for the Holy Land', mustRemit: true },
]);

/** Lower case, letters and digits only: "Peters  PENCE" and "Peter's Pence" give the same key. */
function fundKey(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const BY_KEY = new Map(FUNDS.map((fund) => [fundKey(fund.name), fund]));

/** The listed fund this text names, or undefined. */
function findFund(text) {
  return BY_KEY.get(fundKey(text));
}

/**
 * A purpose as it should be saved: a listed fund under its exact name, anything else tidied
 * (spaces collapsed), or null when blank.
 */
function normalizePurpose(text) {
  const tidy = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!tidy) return null;
  const fund = findFund(tidy);
  return fund ? fund.name : tidy;
}

function isMustRemit(purpose) {
  return Boolean(findFund(purpose)?.mustRemit);
}

module.exports = { FUNDS, fundKey, findFund, normalizePurpose, isMustRemit };
