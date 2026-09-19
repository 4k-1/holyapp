const ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  PARISH_ADMIN: 'parish_admin',
  PARISH_STAFF: 'parish_staff',
  PARISHIONER: 'parishioner',
});

const ALL_ROLES = Object.freeze(Object.values(ROLES));

module.exports = { ROLES, ALL_ROLES };
