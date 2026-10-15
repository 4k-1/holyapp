const pool = require('../config/db');

function toNotification(row) {
  return {
    id: row.id,
    parishId: row.parish_id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    href: row.href || 'notifications',
    createdAt: row.created_at,
    read: Boolean(row.read_at),
  };
}

async function listNotifications(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, parish_id, kind, title, body, href, created_at, read_at
       FROM app_notification
       WHERE recipient_id = $1 AND parish_id = $2
       ORDER BY created_at DESC`,
      [req.user.id, req.parishId]
    );
    res.json({ notifications: result.rows.map(toNotification) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function unreadCount(req, res) {
  try {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM app_notification
       WHERE recipient_id = $1 AND parish_id = $2 AND read_at IS NULL`,
      [req.user.id, req.parishId]
    );
    res.json({ count: result.rows[0].count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function markRead(req, res) {
  try {
    const result = await pool.query(
      `UPDATE app_notification
       SET read_at = COALESCE(read_at, NOW())
       WHERE id = $1 AND recipient_id = $2 AND parish_id = $3
       RETURNING id, parish_id, kind, title, body, href, created_at, read_at`,
      [req.params.id, req.user.id, req.parishId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Notification not found.' });
    }
    res.json({ notification: toNotification(result.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function markAllRead(req, res) {
  try {
    await pool.query(
      `UPDATE app_notification
       SET read_at = NOW()
       WHERE recipient_id = $1 AND parish_id = $2 AND read_at IS NULL`,
      [req.user.id, req.parishId]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { listNotifications, unreadCount, markRead, markAllRead };
