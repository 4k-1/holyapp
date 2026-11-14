// E1: access per area for staff sign-ins. Admins always have every area at Manage.
// Settings, staff accounts, voids and clearing cheques are not areas: they stay admin-only.

const AREAS = Object.freeze([
  { key: 'registers', label: 'Registers' },
  { key: 'certificates', label: 'Certificates' },
  { key: 'donations', label: 'Donations & money' },
  { key: 'intentions', label: 'Mass intentions' },
  { key: 'schedule', label: 'Schedule' },
  { key: 'marriage', label: 'Marriage applications' },
]);

const AREA_KEYS = Object.freeze(AREAS.map((a) => a.key));
const LEVELS = Object.freeze(['off', 'view', 'manage']);
const RANK = { off: 0, view: 1, manage: 2 };

function every(level) {
  return Object.fromEntries(AREA_KEYS.map((key) => [key, level]));
}

const PRESETS = Object.freeze([
  {
    key: 'secretary',
    label: 'Secretary',
    access: { registers: 'manage', certificates: 'manage', donations: 'view', intentions: 'manage', schedule: 'manage', marriage: 'manage' },
  },
  {
    key: 'cashier',
    label: 'Cashier',
    access: { registers: 'off', certificates: 'view', donations: 'manage', intentions: 'manage', schedule: 'view', marriage: 'off' },
  },
  {
    key: 'encoder',
    label: 'Records encoder',
    access: { registers: 'manage', certificates: 'view', donations: 'off', intentions: 'off', schedule: 'view', marriage: 'view' },
  },
  { key: 'readonly', label: 'Read-only', access: every('view') },
  { key: 'full', label: 'Full staff access', access: every('manage') },
]);

const FULL_ACCESS = Object.freeze(every('manage'));

/** The stored value (or anything sent by the client) as a complete map. NULL or missing areas mean Manage. */
function normalizeAccess(value) {
  const source = value && typeof value === 'object' ? value : {};
  return Object.fromEntries(
    AREA_KEYS.map((key) => [key, LEVELS.includes(source[key]) ? source[key] : 'manage'])
  );
}

/** Rejects anything that isn't a full, valid map, so a typo can't quietly give Manage. */
function parseAccessInput(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const out = {};
  for (const key of AREA_KEYS) {
    if (!LEVELS.includes(value[key])) return null;
    out[key] = value[key];
  }
  return out;
}

function allows(access, area, level) {
  return RANK[normalizeAccess(access)[area]] >= RANK[level];
}

module.exports = { AREAS, AREA_KEYS, LEVELS, PRESETS, FULL_ACCESS, normalizeAccess, parseAccessInput, allows };
