// Godparents of a baptism, kept in the shared sponsor tables:
//   sponsor                       the person (one row per godparent of each baptism)
//   sacrament_sponsor_assignment  links them to the baptism: sacrament_type 'baptism',
//                                 role 'godfather' | 'godmother', is_primary for the first
//
// Can. 873: one godfather, one godmother, or one of each, so at most two, and never two
// with the same role. A baptism may also have none (can. 875 allows a witness instead).
//
// A new sponsor row is made for each baptism rather than matching people by name: two
// entries naming "Victor G. Lim" may or may not be the same person.
const { httpError } = require('./recordFields');

const ROLES = { godfather: 'Godfather', godmother: 'Godmother' };

function text(value) {
  const t = String(value ?? '').trim();
  return t || null;
}

/**
 * Reads body.godparents. Returns undefined when it isn't sent (an update then leaves the
 * godparents as they are), otherwise the cleaned list (blank entries dropped).
 */
function parseGodparents(value) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw httpError(400, 'Godparents must be a list.');

  const list = [];
  value.forEach((g, i) => {
    const firstName = text(g && g.firstName);
    const middleName = text(g && g.middleName);
    const lastName = text(g && g.lastName);
    const roleText = text(g && g.role);
    if (!firstName && !middleName && !lastName) return; // empty line on the form
    const label = `Godparent ${i + 1}`;
    if (!firstName || !lastName) throw httpError(400, `${label} needs a first and a last name.`);
    let role = null;
    if (roleText) {
      role = roleText.toLowerCase();
      if (!ROLES[role]) throw httpError(400, `${label}'s role must be Godfather or Godmother.`);
    }
    list.push({ firstName, middleName, lastName, role });
  });

  if (list.length > 2) throw httpError(400, 'A baptism has at most two godparents (can. 873).');
  const roles = list.map((g) => g.role).filter(Boolean);
  if (new Set(roles).size !== roles.length) {
    throw httpError(400, 'A baptism has one godfather and one godmother at most (can. 873).');
  }
  return list;
}

/** Replaces the godparents of a baptism. Run inside the caller's transaction. */
async function saveGodparents(db, baptismId, list) {
  const old = await db.query(
    `DELETE FROM sacrament_sponsor_assignment
     WHERE sacrament_type = 'baptism' AND sacrament_record_id = $1
     RETURNING sponsor_id`,
    [baptismId],
  );
  const oldIds = old.rows.map((r) => r.sponsor_id);
  if (oldIds.length) {
    // Each baptism has its own sponsor rows; drop the ones nothing else points to.
    await db.query(
      `DELETE FROM sponsor s
       WHERE s.id = ANY($1::uuid[])
         AND NOT EXISTS (SELECT 1 FROM sacrament_sponsor_assignment a WHERE a.sponsor_id = s.id)`,
      [oldIds],
    );
  }

  for (const [i, g] of list.entries()) {
    const sponsor = await db.query(
      `INSERT INTO sponsor (first_name, middle_name, last_name) VALUES ($1, $2, $3) RETURNING id`,
      [g.firstName, g.middleName, g.lastName],
    );
    await db.query(
      `INSERT INTO sacrament_sponsor_assignment (sponsor_id, sacrament_type, sacrament_record_id, role, is_primary)
       VALUES ($1, 'baptism', $2, $3, $4)`,
      [sponsor.rows[0].id, baptismId, g.role, i === 0],
    );
  }
}

/** The godparents of a baptism, primary first. */
async function listGodparents(db, baptismId) {
  const result = await db.query(
    `SELECT s.first_name, s.middle_name, s.last_name, a.role
     FROM sacrament_sponsor_assignment a
     JOIN sponsor s ON s.id = a.sponsor_id
     WHERE a.sacrament_type = 'baptism' AND a.sacrament_record_id = $1
     ORDER BY a.is_primary DESC, a.created_at, s.last_name`,
    [baptismId],
  );
  return result.rows.map((r) => ({
    firstName: r.first_name,
    middleName: r.middle_name || '',
    lastName: r.last_name,
    role: ROLES[r.role] || undefined,
  }));
}

module.exports = { parseGodparents, saveGodparents, listGodparents };
