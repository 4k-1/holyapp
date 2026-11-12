// C11: a register entry made from a schedule event keeps a link to it.
//
// Weddings and funerals are one person each, so saving the entry closes the event's "needs recording"
// reminder. Baptisms and confirmations are celebrated in batches, so the reminder stays open until
// staff press "All recorded".

const { httpError } = require('./recordFields');

/** Sacrament event types that need a register entry, and the register each one goes in. */
const REGISTER_FOR_EVENT = {
  baptism: { table: 'baptism', batch: true },
  confirmation: { table: 'confirmation', batch: true },
  wedding: { table: 'marriage', batch: false },
  funeral: { table: 'death', batch: false },
};

const NEEDS_RECORDING = Object.keys(REGISTER_FOR_EVENT);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EVENT_TYPE_FOR_TABLE = Object.fromEntries(
  Object.entries(REGISTER_FOR_EVENT).map(([type, { table }]) => [table, type])
);

/**
 * The schedule event a new register entry comes from (`body.scheduleEventId`), checked before the
 * entry is saved: it must be this parish's and the right kind. Returns its id, or null when none was
 * sent. `table` is the register: baptism, confirmation, marriage or death.
 */
async function scheduleEventFor(db, { parishId, table, body }) {
  const eventId = String(body?.scheduleEventId || '').trim();
  if (!eventId) return null;
  const type = EVENT_TYPE_FOR_TABLE[table];
  const event = UUID.test(eventId)
    ? (
        await db.query('SELECT id, event_type FROM event WHERE id = $1 AND parish_id = $2', [eventId, parishId])
      ).rows[0]
    : null;
  if (!event || event.event_type !== type) {
    throw httpError(400, `That schedule entry isn't a ${type} in this parish.`);
  }
  return eventId;
}

/** Links the saved entry to its event; a wedding or funeral is then recorded. */
async function linkScheduleEvent(db, { table, recordId, eventId }) {
  if (!eventId) return;
  const type = EVENT_TYPE_FOR_TABLE[table];
  await db.query(`UPDATE ${table} SET schedule_event_id = $1 WHERE id = $2`, [eventId, recordId]);
  if (!REGISTER_FOR_EVENT[type].batch) {
    await db.query(`UPDATE event SET record_status = 'Recorded', updated_at = NOW() WHERE id = $1`, [eventId]);
  }
}

module.exports = { REGISTER_FOR_EVENT, NEEDS_RECORDING, scheduleEventFor, linkScheduleEvent };
