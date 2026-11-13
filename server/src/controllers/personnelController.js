const pool = require('../config/db');
const { writeAudit } = require('../utils/audit');
const { requiredText, optionalText, sendRecordError } = require('../utils/recordFields');
const { PERSONNEL_ROLES, rankForHonorific, splitHonorific } = require('../constants/personnelRoles');
const { toPerson, displayNameOf, assertCanBeParishPriest, holdsParishPriest, httpError } = require('../utils/personnel');
const { encrypt } = require('../utils/fieldCrypto');

const MAX_TITLES = 6;

function shortText(value, label, max) {
  const text = optionalText(value);
  if (text && text.length > max) throw httpError(400, `Keep the ${label} under ${max} characters.`);
  return text;
}

/**
 * The person's titles, primary first. Takes `titles: [{ title, scope }]`, or the older single `role`.
 * Each title comes from the list; the scope ("St. Jude School") is optional.
 */
function parseTitles(body, fallback) {
  const raw = Array.isArray(body?.titles) ? body.titles : body?.role !== undefined ? [{ title: body.role }] : fallback;
  if (!Array.isArray(raw) || raw.length === 0) throw httpError(400, 'Give this person at least one title.');
  if (raw.length > MAX_TITLES) throw httpError(400, `A person can hold up to ${MAX_TITLES} titles.`);
  const seen = new Set();
  return raw.map((item) => {
    const title = requiredText(item?.title, 'Title');
    if (!PERSONNEL_ROLES.includes(title)) throw httpError(400, `${title} is not a title on the list.`);
    const scope = shortText(item?.scope, 'place', 100);
    const key = `${title}|${(scope || '').toLowerCase()}`;
    if (seen.has(key)) throw httpError(400, `${title} is listed twice.`);
    seen.add(key);
    return { title, scope };
  });
}

/** A Parish Priest must be a priest (by honorific); and only one active person may hold the title. */
async function checkTitles(db, { parishId, personId, titles, honorific, status }) {
  if (holdsParishPriest(titles)) await assertCanBeParishPriest(db, { parishId, personId, honorific, status });
}

/** Everyone who serves the parish: priests and staff, with or without a sign-in account. */
async function listPersonnel(req, res) {
  try {
    const result = await pool.query(
      `SELECT *
       FROM parish_personnel
       WHERE parish_id = $1
       ORDER BY status, full_name`,
      [req.parishId]
    );
    res.json({ personnel: result.rows.map(toPerson), roles: PERSONNEL_ROLES });
  } catch (err) {
    sendRecordError(res, err);
  }
}

async function createPerson(req, res) {
  try {
    // "Fr. Juan Santos" typed in one box still works: the honorific is split off.
    const typed = splitHonorific(requiredText(req.body?.name, 'Name'));
    const titles = parseTitles(req.body);
    const honorific = shortText(req.body?.honorific, 'honorific', 30) || typed.honorific;
    const postNominals = shortText(req.body?.postNominals, 'letters after the name', 30);
    const rank = rankForHonorific(honorific);
    await checkTitles(pool, { parishId: req.parishId, personId: null, titles, honorific, status: 'active' });
    const inserted = await pool.query(
      `INSERT INTO parish_personnel (parish_id, full_name, role_title, role_scope, other_titles, contact_info, status,
                                     honorific, post_nominals, clergy_rank)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, 'active', $7, $8, $9)
       RETURNING *`,
      [
        req.parishId,
        typed.name,
        titles[0].title,
        titles[0].scope,
        JSON.stringify(titles.slice(1)),
        encrypt(optionalText(req.body?.contact)),
        honorific,
        postNominals,
        rank,
      ]
    );
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'personnel.added',
      entityType: 'parish_personnel',
      entityId: inserted.rows[0].id,
      metadata: { name: typed.name, titles: titles.map((t) => t.title) },
    });
    res.status(201).json({ person: toPerson(inserted.rows[0]) });
  } catch (err) {
    sendRecordError(res, err);
  }
}

/**
 * Name and status of people with an account follow their staff account, so only their titles,
 * honorific (which sets clergy status) and contact change here. People without an account can be renamed and set inactive.
 */
async function updatePerson(req, res) {
  try {
    const current = await pool.query('SELECT * FROM parish_personnel WHERE id = $1 AND parish_id = $2', [
      req.params.id,
      req.parishId,
    ]);
    const row = current.rows[0];
    if (!row) return res.status(404).json({ error: 'Person not found.' });

    const titles = parseTitles(req.body, [{ title: row.role_title, scope: row.role_scope }, ...(row.other_titles || [])]);
    const contact =
      req.body?.contact !== undefined ? encrypt(optionalText(req.body.contact)) : row.contact_info;
    let honorific = req.body?.honorific !== undefined ? shortText(req.body.honorific, 'honorific', 30) : row.honorific;
    const postNominals =
      req.body?.postNominals !== undefined
        ? shortText(req.body.postNominals, 'letters after the name', 30)
        : row.post_nominals;
    let name = row.full_name;
    let status = row.status;
    if (!row.user_id) {
      if (req.body?.name !== undefined) {
        const typed = splitHonorific(requiredText(req.body.name, 'Name'));
        name = typed.name;
        if (typed.honorific && !honorific) honorific = typed.honorific;
      }
      if (req.body?.status !== undefined) {
        if (!['active', 'inactive'].includes(req.body.status)) throw httpError(400, 'Status is not valid.');
        status = req.body.status;
      }
    } else if (req.body?.status !== undefined && req.body.status !== row.status) {
      throw httpError(400, 'This person has a staff account. Change their status under Staff accounts.');
    }
    const rank = rankForHonorific(honorific);
    await checkTitles(pool, { parishId: req.parishId, personId: row.id, titles, honorific, status });

    const updated = await pool.query(
      `UPDATE parish_personnel
       SET full_name = $1, role_title = $2, role_scope = $3, other_titles = $4::jsonb, contact_info = $5,
           status = $6, honorific = $7, post_nominals = $8, clergy_rank = $9, updated_at = NOW()
       WHERE id = $10
       RETURNING *`,
      [
        name,
        titles[0].title,
        titles[0].scope,
        JSON.stringify(titles.slice(1)),
        contact,
        status,
        honorific,
        postNominals,
        rank,
        row.id,
      ]
    );
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'personnel.updated',
      entityType: 'parish_personnel',
      entityId: row.id,
      metadata: { name, titles: titles.map((t) => t.title), clergyRank: rank, status },
    });
    res.json({ person: toPerson(updated.rows[0]) });
  } catch (err) {
    sendRecordError(res, err);
  }
}

/**
 * Removes someone without a staff account. Events and Masses they were assigned to keep their name as a guest's,
 * so past schedules still show who served; only the link to this row is cleared.
 */
async function removePerson(req, res) {
  const client = await pool.connect();
  try {
    const current = await client.query('SELECT * FROM parish_personnel WHERE id = $1 AND parish_id = $2', [
      req.params.id,
      req.parishId,
    ]);
    const row = current.rows[0];
    if (!row) return res.status(404).json({ error: 'Person not found.' });
    if (row.user_id) {
      throw httpError(400, 'This person has a staff account. Deactivate it under Settings → Staff Accounts instead.');
    }
    await client.query('BEGIN');
    const name = displayNameOf(row);
    await client.query('UPDATE event SET assigned_to = NULL, assignee_name = $2 WHERE assigned_to = $1', [row.id, name]);
    await client.query('UPDATE parish_recurring_commitment SET assigned_to = NULL, assignee = $2 WHERE assigned_to = $1', [
      row.id,
      name,
    ]);
    await client.query('UPDATE parish_schedule_override SET assigned_to = NULL, assignee = $2 WHERE assigned_to = $1', [
      row.id,
      name,
    ]);
    await client.query('DELETE FROM parish_personnel WHERE id = $1', [row.id]);
    await client.query('COMMIT');
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'personnel.removed',
      entityType: 'parish_personnel',
      entityId: row.id,
      metadata: { name: row.full_name, role: row.role_title },
    });
    res.json({ ok: true });
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // nothing to roll back
    }
    sendRecordError(res, err);
  } finally {
    client.release();
  }
}

module.exports = { listPersonnel, createPerson, updatePerson, removePerson };
