const pool = require('../config/db');
const { ROLES } = require('../constants/roles');

function dateOnly(value) {
  if (!value) return null;
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function eventRow({ id, sacramentType, date, title, place, parishName, bookNumber, pageNumber, entryNumber }) {
  return {
    id,
    sacramentType,
    date: dateOnly(date),
    title,
    place: place || null,
    parishName: parishName || null,
    bookNumber: bookNumber || null,
    pageNumber: pageNumber || null,
    entryNumber: entryNumber || null,
  };
}

async function myTimeline(req, res) {
  if (req.user.role !== ROLES.PARISHIONER) {
    return res.status(403).json({ error: 'Sacramental timeline is available to parishioners only.' });
  }

  try {
    const userResult = await pool.query(
      `SELECT id, parish_id, first_name, last_name, birthday
       FROM app_user WHERE id = $1`,
      [req.user.id]
    );
    const user = userResult.rows[0];
    if (!user || !user.parish_id) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    const firstName = String(user.first_name || '').trim();
    const lastName = String(user.last_name || '').trim();
    if (!firstName || !lastName) {
      return res.json({ events: [] });
    }

    const params = [user.parish_id, firstName, lastName];

    const [baptisms, confirmations, marriages, deaths, parish] = await Promise.all([
      pool.query(
        `SELECT id, date_of_baptism, place_of_baptism, book_number, page_number, entry_number
         FROM baptism
         WHERE parish_id = $1
           AND lower(first_name) = lower($2)
           AND lower(last_name) = lower($3)`,
        params
      ),
      pool.query(
        `SELECT id, date_of_confirmation, place_of_confirmation, book_number, page_number, entry_number
         FROM confirmation
         WHERE parish_id = $1
           AND lower(first_name) = lower($2)
           AND lower(last_name) = lower($3)`,
        params
      ),
      pool.query(
        `SELECT m.id, m.date_of_marriage, m.place_of_marriage, m.book_number, m.page_number, m.entry_number
         FROM marriage m
         JOIN marriage_party p ON p.marriage_id = m.id
         WHERE m.parish_id = $1
           AND lower(p.first_name) = lower($2)
           AND lower(p.last_name) = lower($3)`,
        params
      ),
      pool.query(
        `SELECT id, date_of_death, place_of_burial, book_number, page_number, entry_number
         FROM death
         WHERE parish_id = $1
           AND lower(first_name) = lower($2)
           AND lower(last_name) = lower($3)`,
        params
      ),
      pool.query('SELECT name FROM parish WHERE id = $1', [user.parish_id]),
    ]);

    const parishName = parish.rows[0] ? parish.rows[0].name : null;
    const events = [
      ...baptisms.rows.map((row) =>
        eventRow({
          id: row.id,
          sacramentType: 'baptism',
          date: row.date_of_baptism,
          title: 'Baptism',
          place: row.place_of_baptism,
          parishName,
          bookNumber: row.book_number,
          pageNumber: row.page_number,
          entryNumber: row.entry_number,
        })
      ),
      ...confirmations.rows.map((row) =>
        eventRow({
          id: row.id,
          sacramentType: 'confirmation',
          date: row.date_of_confirmation,
          title: 'Confirmation',
          place: row.place_of_confirmation,
          parishName,
          bookNumber: row.book_number,
          pageNumber: row.page_number,
          entryNumber: row.entry_number,
        })
      ),
      ...marriages.rows.map((row) =>
        eventRow({
          id: row.id,
          sacramentType: 'marriage',
          date: row.date_of_marriage,
          title: 'Marriage',
          place: row.place_of_marriage,
          parishName,
          bookNumber: row.book_number,
          pageNumber: row.page_number,
          entryNumber: row.entry_number,
        })
      ),
      ...deaths.rows.map((row) =>
        eventRow({
          id: row.id,
          sacramentType: 'death',
          date: row.date_of_death,
          title: 'Burial',
          place: row.place_of_burial,
          parishName,
          bookNumber: row.book_number,
          pageNumber: row.page_number,
          entryNumber: row.entry_number,
        })
      ),
    ].sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    });

    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { myTimeline };
