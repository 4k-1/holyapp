/**
 * What a certificate is usually for (B2), by certificate. Mirrored by client/src/lib/purposes.ts. Anything else
 * is typed in ("Other…") and kept as written.
 */
const PURPOSES_BY_SACRAMENT = Object.freeze({
  baptism: Object.freeze([
    'Marriage',
    'First Communion or Confirmation',
    'Being a godparent or sponsor',
    'School enrollment',
    'Passport or government ID',
    'Personal records',
  ]),
  confirmation: Object.freeze(['Marriage', 'Being a godparent or sponsor', 'Personal records']),
  marriage: Object.freeze(['Baptism of a child', 'Visa or immigration', 'Church tribunal case', 'Personal records']),
  death: Object.freeze([
    'Death benefit or insurance claim',
    'Late registration of death',
    'Estate settlement',
    'Personal records',
  ]),
});

/** Every listed purpose once, for matching what was typed or saved to its usual spelling. */
const PURPOSES = Object.freeze([...new Set(Object.values(PURPOSES_BY_SACRAMENT).flat())]);

const MARRIAGE = 'Marriage';

/** A copy for marriage is accepted for this many months from issue. */
const MARRIAGE_VALID_MONTHS = 6;

/** Older names still in saved requests. */
const ALIASES = Object.freeze({
  'marriage preparation': MARRIAGE,
  'walk-in issuance': null,
  'travel / passport': 'Passport or government ID',
});

/** "school enrollment" → "School enrollment"; a typed purpose is trimmed; blank → null. */
function normalizePurpose(value) {
  const text = String(value ?? '').trim().replace(/\s+/g, ' ');
  if (!text) return null;
  const key = text.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(ALIASES, key)) return ALIASES[key];
  return PURPOSES.find((p) => p.toLowerCase() === key) || text.slice(0, 255);
}

function isMarriagePurpose(value) {
  return normalizePurpose(value) === MARRIAGE;
}

/** "2026-11-09" → "2027-05-09"; the last day of a shorter month when the day doesn't exist. */
function addMonths(isoDate, months) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

/** Today in the Philippines, as YYYY-MM-DD. */
function manilaToday(now = new Date()) {
  return new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** The last day a marriage copy issued on `issuedOn` is accepted; null for other purposes. */
function validUntilFor(purpose, issuedOn) {
  return isMarriagePurpose(purpose) ? addMonths(issuedOn, MARRIAGE_VALID_MONTHS) : null;
}

module.exports = {
  PURPOSES,
  PURPOSES_BY_SACRAMENT,
  MARRIAGE,
  MARRIAGE_VALID_MONTHS,
  normalizePurpose,
  isMarriagePurpose,
  addMonths,
  manilaToday,
  validUntilFor,
};
