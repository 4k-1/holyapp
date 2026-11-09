// Shared by the Staff list and Staff accounts: how a person reads, and the one-Parish-Priest rule (item 4).

const { PARISH_PRIEST, formatPersonName, isClergyRank } = require('../constants/personnelRoles');

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/** All of a person's titles, primary first: [{ title, scope }]. */
function titlesOf(row) {
  const others = Array.isArray(row.other_titles) ? row.other_titles : [];
  return [
    { title: row.role_title, scope: row.role_scope || null },
    ...others.map((t) => ({ title: t.title, scope: t.scope || null })),
  ].filter((t) => t.title);
}

function displayNameOf(row) {
  return formatPersonName({ honorific: row.honorific, name: row.full_name, postNominals: row.post_nominals });
}

function toPerson(row) {
  return {
    id: row.id,
    name: displayNameOf(row),
    plainName: row.full_name,
    honorific: row.honorific || '',
    postNominals: row.post_nominals || '',
    clergyRank: row.clergy_rank || 'lay',
    clergy: isClergyRank(row.clergy_rank),
    role: row.role_title,
    titles: titlesOf(row),
    contact: row.contact_info || '',
    status: row.status,
    hasAccount: Boolean(row.user_id),
  };
}

/**
 * Refuses a second Parish Priest: only one active person per parish holds the title. `excludeId` is
 * the person being saved. Call inside the same transaction as the save.
 */
async function assertOneParishPriest(db, parishId, excludeId) {
  const holder = await db.query(
    `SELECT full_name, honorific, post_nominals FROM parish_personnel
     WHERE parish_id = $1 AND status = 'active' AND id IS DISTINCT FROM $2
       AND (role_title = $3 OR other_titles @> jsonb_build_array(jsonb_build_object('title', $3::text)))
     LIMIT 1`,
    [parishId, excludeId || null, PARISH_PRIEST]
  );
  if (holder.rows[0]) {
    throw httpError(
      409,
      `${displayNameOf(holder.rows[0])} is the Parish Priest. Remove the title from them first, then give it to someone else.`
    );
  }
}

function holdsParishPriest(titles) {
  return titles.some((t) => t.title === PARISH_PRIEST);
}

module.exports = { titlesOf, displayNameOf, toPerson, assertOneParishPriest, holdsParishPriest, httpError };
