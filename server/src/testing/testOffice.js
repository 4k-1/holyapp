// UAT only: an automatic parish office for the ready-made tester accounts, so testers don't wait for a person.
// Every UAT_OFFICE_DELAY_SECONDS (default 60) after a tester acts, it does what the office would:
//   • a new certificate request: finds the matching baptism record (name and date of birth) and links it,
//     or turns the request down with a reason when nothing matches;
//   • a paid request: issues the digital certificate (or marks a pickup request ready);
//   • a Mass intention: confirms it once its donation is paid (or has none).
// It goes through the same code the office uses, signed as "Automatic Test Office", so statuses,
// notifications, emails and the audit log behave as they would with a real staff member.
// Requests from anyone else are left for the real office.

const crypto = require('crypto');
const pool = require('../config/db');
const { hashPassword } = require('../utils/password');
const { decryptJson } = require('../utils/fieldCrypto');
const { linkRequest, rejectRequest } = require('../controllers/certificateRequestController');
const { issueDigital, markReady } = require('../controllers/certificateController');
const { confirmIntention } = require('../controllers/intentionController');
const { toBaptismalRecord } = require('../controllers/baptismController');
const { uatMode } = require('./uatMode');

const TESTER_EMAILS = 'holyapp.uat+test%@gmail.com';
const EVERY_MS = 15 * 1000;

function delaySeconds() {
  const n = Number(process.env.UAT_OFFICE_DELAY_SECONDS);
  return Number.isFinite(n) && n >= 0 ? n : 60;
}

// ---------- matching, as the office's "Find record" page does it ----------

function words(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[.,'’-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/** Every word typed must start some word of the record's name, so a left-out middle name still matches. */
function nameMatches(typed, recordName) {
  const want = words(typed);
  const have = words(recordName);
  return want.length > 0 && want.every((w) => have.some((h) => h.startsWith(w)));
}

function day(value) {
  return String(value || '').slice(0, 10);
}

async function findBaptism(parishId, details) {
  const { rows } = await pool.query('SELECT * FROM baptism WHERE parish_id = $1', [parishId]);
  const records = rows.map(toBaptismalRecord);
  return records.find(
    (r) =>
      nameMatches(details.subjectName, `${r.firstName} ${r.middleName || ''} ${r.lastName}`) &&
      (!details.birthdate || day(details.birthdate) === day(r.dateOfBirth))
  );
}

// ---------- acting as the office ----------

const officeUsers = new Map();

/** The parish's "Automatic Test Office" account: suspended with a random password, so nobody can sign in as it. */
async function officeUser(parishId) {
  if (officeUsers.has(parishId)) return officeUsers.get(parishId);
  const email = `test-office+${parishId}@holyapp.invalid`;
  let row = (await pool.query('SELECT id, parish_id, role FROM app_user WHERE email = $1', [email])).rows[0];
  if (!row) {
    row = (
      await pool.query(
        `INSERT INTO app_user (parish_id, role, email, password_hash, status, first_name, last_name)
         VALUES ($1, 'parish_admin', $2, $3, 'suspended', 'Automatic', 'Test Office')
         RETURNING id, parish_id, role`,
        [parishId, email, await hashPassword(crypto.randomBytes(24).toString('hex'))]
      )
    ).rows[0];
  }
  officeUsers.set(parishId, row);
  return row;
}

/** Runs an office controller as the automatic office, the way the API would. */
async function act(handler, parishId, id, body = {}) {
  const user = await officeUser(parishId);
  const req = {
    params: { id },
    body,
    query: {},
    headers: {},
    parishId,
    user: { id: user.id, parish_id: parishId, role: 'parish_admin' },
    get: () => undefined,
  };
  const out = { status: 200, body: null };
  const res = {
    status(code) {
      out.status = code;
      return this;
    },
    json(payload) {
      out.body = payload;
      return this;
    },
    send(payload) {
      out.body = payload;
      return this;
    },
  };
  await handler(req, res);
  if (out.status >= 400) throw new Error((out.body && out.body.error) || `status ${out.status}`);
  return out.body;
}

// One failure is logged, then the item is left alone so a stuck request doesn't fill the log.
const failed = new Set();

async function attempt(key, label, fn) {
  if (failed.has(key)) return;
  try {
    await fn();
    console.log(`[test office] ${label}`);
  } catch (err) {
    failed.add(key);
    console.error(`[test office] could not ${label}: ${err.message}`);
  }
}

async function handleNewRequests(delay) {
  const { rows } = await pool.query(
    `SELECT r.id, r.parish_id, r.record_type, r.reference_no, r.subject_details
     FROM certificate_request r JOIN app_user u ON u.id = r.requested_by
     WHERE r.status = 'pending' AND u.email LIKE $1
       AND r.created_at < NOW() - make_interval(secs => $2)`,
    [TESTER_EMAILS, delay]
  );
  for (const r of rows) {
    // The guide only asks testers for baptismal certificates; anything else waits for the real office.
    if (r.record_type !== 'baptism') continue;
    const fields = decryptJson(r.subject_details && typeof r.subject_details === 'object' ? r.subject_details : {}) || {};
    const details = { subjectName: fields.subjectName, birthdate: fields.birthdate || fields.dateOfBirth };
    const record = await findBaptism(r.parish_id, details);
    if (record) {
      await attempt(`link:${r.id}`, `found the record for ${r.reference_no}`, () =>
        act(linkRequest, r.parish_id, r.id, { recordId: record.id })
      );
    } else {
      await attempt(`reject:${r.id}`, `turned down ${r.reference_no} (no matching record)`, () =>
        act(rejectRequest, r.parish_id, r.id, {
          reason:
            'We could not find a baptism record with this name and date of birth. Check the details in your test guide and send a new request.',
        })
      );
    }
  }
}

async function handlePaidRequests(delay) {
  const { rows } = await pool.query(
    `SELECT r.id, r.parish_id, r.reference_no, r.delivery_method, r.pickup_ready
     FROM certificate_request r
     JOIN app_user u ON u.id = r.requested_by
     JOIN payment p ON p.certificate_request_id = r.id AND p.status = 'paid'
     WHERE r.status = 'processing' AND r.certificate_id IS NULL AND u.email LIKE $1
       AND p.paid_at < NOW() - make_interval(secs => $2)`,
    [TESTER_EMAILS, delay]
  );
  for (const r of rows) {
    if (r.delivery_method === 'pickup') {
      if (r.pickup_ready) continue;
      await attempt(`ready:${r.id}`, `marked ${r.reference_no} ready for pickup`, () => act(markReady, r.parish_id, r.id));
    } else {
      await attempt(`issue:${r.id}`, `issued the certificate for ${r.reference_no}`, () => act(issueDigital, r.parish_id, r.id));
    }
  }
}

async function handleIntentions(delay) {
  const { rows } = await pool.query(
    `SELECT i.id, i.parish_id, i.reference_no
     FROM mass_intention i JOIN app_user u ON u.id = i.requester_id
     WHERE i.status = 'pending' AND i.payment_status <> 'pending' AND u.email LIKE $1
       AND i.created_at < NOW() - make_interval(secs => $2)`,
    [TESTER_EMAILS, delay]
  );
  for (const i of rows) {
    await attempt(`confirm:${i.id}`, `confirmed Mass intention ${i.reference_no}`, () => act(confirmIntention, i.parish_id, i.id));
  }
}

let running = false;

async function runOnce() {
  if (running) return;
  running = true;
  try {
    const delay = delaySeconds();
    await handleNewRequests(delay);
    await handlePaidRequests(delay);
    await handleIntentions(delay);
  } catch (err) {
    console.error('[test office] check failed:', err.message);
  } finally {
    running = false;
  }
}

/** Starts the automatic test office when UAT_MODE=on. The timer doesn't keep the process alive. */
function startTestOffice() {
  if (!uatMode()) return;
  console.log(`Automatic test office is on: it acts on tester requests after ${delaySeconds()} seconds.`);
  runOnce();
  setInterval(runOnce, EVERY_MS).unref();
}

module.exports = { startTestOffice, runOnce, nameMatches };
