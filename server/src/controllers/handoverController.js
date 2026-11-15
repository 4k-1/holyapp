// E2: handover when someone leaves. Lists what a person still holds (upcoming events, regular Masses,
// the Parish Priest title, the certificate signatory) and, in one step, passes each on and sets them
// inactive.
// A sign-in is suspended at the same time and its saved sign-ins are cancelled.

const pool = require('../config/db');
const { writeAudit } = require('../utils/audit');
const { sendRecordError } = require('../utils/recordFields');
const { PARISH_PRIEST, rankForHonorific } = require('../constants/personnelRoles');
const { displayNameOf, titlesOf, toPerson, holdsParishPriest, httpError } = require('../utils/personnel');
const { occurrenceDate } = require('../services/scheduleService');
const { to24Hour } = require('../utils/scheduleTime');
const { manilaToday } = require('../constants/purposes');

const MAX_TITLES = 6;

async function loadPerson(db, parishId, id) {
  const result = await db.query('SELECT * FROM parish_personnel WHERE id = $1 AND parish_id = $2', [id, parishId]);
  return result.rows[0] || null;
}

/** Upcoming events still assigned to the person, soonest first. */
async function upcomingEvents(db, parishId, personId) {
  const result = await db.query(
    // Event times are Philippine wall-clock times.
    `SELECT id, title, event_type, start_datetime,
            to_char(start_datetime, 'YYYY-MM-DD') AS event_date, to_char(start_datetime, 'HH24:MI') AS start_24
     FROM event
     WHERE parish_id = $1 AND assigned_to = $2 AND status = 'upcoming'
       AND start_datetime >= (NOW() AT TIME ZONE 'Asia/Manila')
     ORDER BY start_datetime`,
    [parishId, personId]
  );
  return result.rows;
}

/**
 * Changes for a single upcoming Mass that name the person (C2), shaped like events so they are handed over the
 * same way. Their id is the occurrence id ("<commitment id>-2026-11-15-6:00 AM").
 */
async function upcomingMassChanges(db, parishId, personId) {
  const result = await db.query(
    `SELECT o.occurrence_id, c.label
     FROM parish_schedule_override o
     JOIN parish_recurring_commitment c ON c.parish_id = o.parish_id AND o.occurrence_id LIKE c.id::text || '-%'
     WHERE o.parish_id = $1 AND o.assigned_to = $2`,
    [parishId, personId]
  );
  const today = manilaToday();
  return result.rows
    .filter((row) => occurrenceDate(row.occurrence_id))
    .map((row) => {
      const date = occurrenceDate(row.occurrence_id);
      const time = row.occurrence_id.slice(row.occurrence_id.lastIndexOf(date) + date.length + 1);
      return { id: row.occurrence_id, title: row.label, event_type: 'mass', event_date: date, start_24: to24Hour(time) };
    })
    .filter((row) => row.event_date && row.event_date >= today)
    .sort((a, b) => (a.event_date + a.start_24).localeCompare(b.event_date + b.start_24));
}

/** Regular Masses and other standing commitments the person is assigned to. */
async function regularCommitments(db, parishId, personId) {
  const result = await db.query(
    `SELECT id, label, event_type, days, slots FROM parish_recurring_commitment
     WHERE parish_id = $1 AND assigned_to = $2
     ORDER BY created_at`,
    [parishId, personId]
  );
  return result.rows;
}

/** Events first, then single-Mass changes, soonest first. */
async function upcomingItems(db, parishId, personId) {
  const [events, changes] = await Promise.all([
    upcomingEvents(db, parishId, personId),
    upcomingMassChanges(db, parishId, personId),
  ]);
  return [...events, ...changes].sort((a, b) => (a.event_date + a.start_24).localeCompare(b.event_date + b.start_24));
}

/** Certificate settings signed with this person's name ("Fr. Juan Santos" matches Juan Santos). */
async function signedSettings(db, parishId, person) {
  const result = await db.query(
    `SELECT certificate_type, signatory_name FROM certificate_configuration
     WHERE parish_id = $1 AND signatory_name IS NOT NULL
       AND position(lower($2) IN lower(signatory_name)) > 0
     ORDER BY certificate_type`,
    [parishId, person.full_name]
  );
  return result.rows;
}

/** GET /personnel/:id/handover — what the person still holds, and who can take it over. */
async function getHandover(req, res) {
  try {
    const person = await loadPerson(pool, req.parishId, req.params.id);
    if (!person) return res.status(404).json({ error: 'Person not found.' });

    const [events, regular, signed, others] = await Promise.all([
      upcomingItems(pool, req.parishId, person.id),
      regularCommitments(pool, req.parishId, person.id),
      signedSettings(pool, req.parishId, person),
      pool.query(
        `SELECT * FROM parish_personnel WHERE parish_id = $1 AND status = 'active' AND id <> $2 ORDER BY full_name`,
        [req.parishId, person.id]
      ),
    ]);

    res.json({
      person: toPerson(person),
      isSelf: Boolean(person.user_id) && person.user_id === req.user.id,
      events: events.map((e) => ({
        id: e.id,
        title: e.title,
        eventType: e.event_type,
        date: e.event_date,
        time: e.start_24,
      })),
      regular: regular.map((r) => ({
        id: r.id,
        label: r.label,
        type: r.event_type,
        days: r.days || [],
        times: (Array.isArray(r.slots) ? r.slots : []).map((s) => s.start),
      })),
      parishPriest: holdsParishPriest(titlesOf(person)),
      signatory: signed.length ? { name: signed[0].signatory_name, types: signed.map((s) => s.certificate_type) } : null,
      candidates: others.rows.map((row) => ({
        id: row.id,
        name: displayNameOf(row),
        role: row.role_title,
        clergy: ['priest', 'deacon'].includes(row.clergy_rank),
        priest: row.clergy_rank === 'priest',
      })),
    });
  } catch (err) {
    sendRecordError(res, err);
  }
}

/** The new Parish Priest gets the title as their primary one; their old primary moves to the others. */
async function giveParishPriest(db, parishId, toId, leavingId) {
  const target = await loadPerson(db, parishId, toId);
  if (!target || target.status !== 'active' || target.id === leavingId) {
    throw httpError(400, 'Choose an active person to take over as Parish Priest.');
  }
  if (rankForHonorific(target.honorific) !== 'priest') {
    throw httpError(400, `Add Fr. or Msgr. before ${displayNameOf(target)}'s name to make them ${PARISH_PRIEST}.`);
  }
  const titles = titlesOf(target).filter((t) => t.title !== PARISH_PRIEST);
  const next = [{ title: PARISH_PRIEST, scope: null }, ...titles];
  if (next.length > MAX_TITLES) {
    throw httpError(400, `${displayNameOf(target)} already holds ${MAX_TITLES - 1} titles. Remove one first.`);
  }
  await db.query(
    `UPDATE parish_personnel
     SET role_title = $1, role_scope = NULL, other_titles = $2::jsonb, updated_at = NOW()
     WHERE id = $3`,
    [PARISH_PRIEST, JSON.stringify(next.slice(1)), target.id]
  );
  return target;
}

/**
 * POST /personnel/:id/leave
 * Body: { events: [{ id, to }], regular: [{ id, to }], parishPriestTo, signAs }. `to` is a person id
 * or null (left unassigned); an upcoming event or regular Mass missing from its list is left
 * unassigned too. A single-Mass change left unassigned goes back to that Mass's regular assignment. `signAs` puts the
 * new Parish Priest's name on certificate settings signed with the leaving person's name.
 * All of it, or none of it.
 */
async function leave(req, res) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const person = await loadPerson(client, req.parishId, req.params.id);
    if (!person) throw httpError(404, 'Person not found.');
    if (person.status !== 'active') throw httpError(409, `${displayNameOf(person)} is already inactive.`);
    if (person.user_id && person.user_id === req.user.id) {
      throw httpError(400, "You can't deactivate your own account.");
    }
    // Lock the person so two handovers can't run at once.
    await client.query('SELECT id FROM parish_personnel WHERE id = $1 FOR UPDATE', [person.id]);

    // 1. Upcoming events and changes for single Masses.
    const events = await upcomingItems(client, req.parishId, person.id);
    const chosen = new Map(
      (Array.isArray(req.body?.events) ? req.body.events : []).map((e) => [String(e?.id), e?.to ? String(e.to) : null])
    );
    const targets = new Map();
    async function targetFor(to, title) {
      if (!to) return null;
      if (!targets.has(to)) {
        const target = await loadPerson(client, req.parishId, to);
        if (!target || target.status !== 'active' || target.id === person.id) {
          throw httpError(400, `Choose an active person for "${title}".`);
        }
        targets.set(to, target);
      }
      return targets.get(to);
    }
    const moved = [];
    for (const event of events) {
      const to = chosen.get(event.id) || null;
      const target = await targetFor(to, event.title);
      if (event.event_type === 'mass' && !/^[0-9a-f-]{36}$/i.test(event.id)) {
        await client.query(
          `UPDATE parish_schedule_override SET assigned_to = $1, assignee = '' WHERE parish_id = $2 AND occurrence_id = $3`,
          [to, req.parishId, event.id]
        );
      } else {
        await client.query(
          'UPDATE event SET assigned_to = $1, assignee_name = NULL, updated_at = NOW() WHERE id = $2',
          [to, event.id]
        );
      }
      moved.push({ eventId: event.id, title: event.title, to: target ? displayNameOf(target) : null });
    }

    // 1b. Regular Masses.
    const regular = await regularCommitments(client, req.parishId, person.id);
    const chosenRegular = new Map(
      (Array.isArray(req.body?.regular) ? req.body.regular : []).map((r) => [String(r?.id), r?.to ? String(r.to) : null])
    );
    const movedRegular = [];
    for (const commitment of regular) {
      const to = chosenRegular.get(commitment.id) || null;
      const target = await targetFor(to, commitment.label);
      await client.query(
        `UPDATE parish_recurring_commitment SET assigned_to = $1, assignee = '', updated_at = NOW() WHERE id = $2`,
        [to, commitment.id]
      );
      movedRegular.push({ id: commitment.id, label: commitment.label, to: target ? displayNameOf(target) : null });
    }

    // 2. The Parish Priest title. The leaving person keeps it on record; only active people count.
    let newPriest = null;
    const priestTo = req.body?.parishPriestTo ? String(req.body.parishPriestTo) : null;
    if (priestTo) {
      if (!holdsParishPriest(titlesOf(person))) throw httpError(400, `${displayNameOf(person)} is not the ${PARISH_PRIEST}.`);
      newPriest = await giveParishPriest(client, req.parishId, priestTo, person.id);
    }

    // 3. Certificate signatory.
    let signedTypes = [];
    if (req.body?.signAs) {
      if (!newPriest) throw httpError(400, 'Choose the new Parish Priest to sign certificates.');
      const signed = await signedSettings(client, req.parishId, person);
      signedTypes = signed.map((s) => s.certificate_type);
      if (signedTypes.length) {
        await client.query(
          `UPDATE certificate_configuration
           SET signatory_name = $1, signatory_title = $2, updated_by = $3, updated_at = NOW(),
               -- The outgoing priest's signature must not print above the new priest's name.
               signature_image = NULL, signature_updated_at = NOW()
           WHERE parish_id = $4 AND certificate_type = ANY($5::text[])`,
          [displayNameOf(newPriest), PARISH_PRIEST, req.user.id, req.parishId, signedTypes]
        );
      }
    }

    // 4. Inactive, and the sign-in ended.
    await client.query(`UPDATE parish_personnel SET status = 'inactive', updated_at = NOW() WHERE id = $1`, [person.id]);
    if (person.user_id) {
      await client.query(
        `UPDATE app_user SET status = 'suspended', updated_at = NOW() WHERE id = $1 AND parish_id = $2`,
        [person.user_id, req.parishId]
      );
      await client.query('UPDATE refresh_token SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL', [
        person.user_id,
      ]);
    }

    await client.query('COMMIT');

    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'personnel.handover',
      entityType: 'parish_personnel',
      entityId: person.id,
      metadata: {
        name: displayNameOf(person),
        events: moved,
        regular: movedRegular,
        parishPriestTo: newPriest ? displayNameOf(newPriest) : null,
        signatoryChanged: signedTypes,
        signInSuspended: Boolean(person.user_id),
      },
    });

    const saved = await loadPerson(pool, req.parishId, person.id);
    res.json({
      person: toPerson(saved),
      moved: [...moved, ...movedRegular].filter((m) => m.to).length,
      unassigned: [...moved, ...movedRegular].filter((m) => !m.to).length,
    });
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

module.exports = { getHandover, leave };
