/** Roles for people in the parish staff directory, with or without a system account. */
const CLERGY_ROLES = Object.freeze(['Parish Priest', 'Parochial Vicar', 'Guest Priest', 'Priest', 'Deacon']);
const OTHER_ROLES = Object.freeze(['Parish Secretary', 'Admin Staff', 'Sacristan', 'Lay Minister', 'Catechist', 'Other']);
const PERSONNEL_ROLES = Object.freeze([...CLERGY_ROLES, ...OTHER_ROLES]);

function isClergy(role) {
  return CLERGY_ROLES.includes(role);
}

module.exports = { CLERGY_ROLES, OTHER_ROLES, PERSONNEL_ROLES, isClergy };
