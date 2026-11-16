// Supporting documents are only needed to find the record. They are deleted 7 days after the request is
// released or not approved. serve.js runs this when the server starts and every 6 hours after.
const pool = require('../config/db');

const KEEP_DAYS = 7;
const EVERY_MS = 6 * 60 * 60 * 1000;

/** Deletes documents on requests finished more than `days` ago. Returns how many were deleted. */
async function purgeFinishedRequestDocuments(days = KEEP_DAYS) {
  const { rowCount } = await pool.query(
    `DELETE FROM certificate_request_document d
     USING certificate_request r
     WHERE d.request_id = r.id
       AND r.status IN ('released', 'rejected')
       AND r.updated_at < NOW() - make_interval(days => $1::int)`,
    [days]
  );
  return rowCount;
}

async function runOnce() {
  try {
    const deleted = await purgeFinishedRequestDocuments();
    if (deleted > 0) console.log(`Deleted ${deleted} supporting document(s) from finished requests.`);
  } catch (err) {
    console.error('Supporting document cleanup failed:', err.message);
  }
}

/** Starts the cleanup: once now, then every 6 hours. The timer doesn't keep the process alive. */
function startRequestDocumentCleanup() {
  runOnce();
  setInterval(runOnce, EVERY_MS).unref();
}

module.exports = { purgeFinishedRequestDocuments, startRequestDocumentCleanup, KEEP_DAYS };
