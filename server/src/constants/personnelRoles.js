/**
 * Titles for people in the parish staff directory, with or without a system account. A person can hold
 * several (item 4); whether they are clergy comes from their clergy rank, not from a title.
 * Mirrored by client/src/features/parish-admin/staff/staffRoles.ts.
 */
const CLERGY_ROLES = Object.freeze(['Parish Priest', 'Parochial Vicar', 'Guest Priest', 'Priest', 'Chaplain', 'Deacon']);
const OTHER_ROLES = Object.freeze([
  'Parish Secretary',
  'Admin Staff',
  'Bookkeeper',
  'Sacristan',
  'Lay Minister',
  'Catechist',
  'Other',
]);
const PERSONNEL_ROLES = Object.freeze([...CLERGY_ROLES, ...OTHER_ROLES]);

/** Only one active person per parish may hold this title. */
const PARISH_PRIEST = 'Parish Priest';

/** priest and deacon are clergy; religious (sisters, brothers) and lay are not. */
const CLERGY_RANKS = Object.freeze(['priest', 'deacon', 'religious', 'lay']);

function isClergyRank(rank) {
  return rank === 'priest' || rank === 'deacon';
}

/** Kept for old callers: a title that only a priest or deacon holds. */
function isClergy(role) {
  return CLERGY_ROLES.includes(role);
}

/** The rank a new person most likely has, from their first title. */
function rankForTitle(title) {
  if (title === 'Deacon') return 'deacon';
  if (CLERGY_ROLES.includes(title)) return 'priest';
  return 'lay';
}

const HONORIFIC_PATTERN = /^((?:Most\s+Rev\.?\s+|Rev\.?\s+)?(?:Fr|Msgr|Sr|Bro|Dcn|Deacon|Rev)\.?)\s+(?=\S)/i;

/** "Fr. Juan Santos" → { honorific: "Fr.", name: "Juan Santos" }; a name without one is left as it is. */
function splitHonorific(fullName) {
  const text = String(fullName || '').trim().replace(/\s+/g, ' ');
  const match = text.match(HONORIFIC_PATTERN);
  if (!match) return { honorific: null, name: text };
  return { honorific: match[1], name: text.slice(match[0].length).trim() };
}

/** "Rev. Fr." + "Juan Santos" + "SVD" → "Rev. Fr. Juan Santos, SVD". */
function formatPersonName({ honorific, name, postNominals }) {
  const base = [honorific, name].filter(Boolean).join(' ');
  return postNominals ? `${base}, ${postNominals}` : base;
}

module.exports = {
  CLERGY_ROLES,
  OTHER_ROLES,
  PERSONNEL_ROLES,
  PARISH_PRIEST,
  CLERGY_RANKS,
  isClergy,
  isClergyRank,
  rankForTitle,
  splitHonorific,
  formatPersonName,
};
