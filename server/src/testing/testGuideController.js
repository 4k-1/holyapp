// UAT only: what the in-app test guide shows a tester, and where they are in it.
// Steps with a trace in the data (a request sent, a payment made) are read from the database, so
// they tick themselves. Steps only the app can see (a page visited, a step skipped) are saved by the app.

const pool = require('../config/db');
const { decrypt } = require('../utils/fieldCrypto');
const { tester, testerNumber, STEPS } = require('./testers');
const { uatMode } = require('./uatMode');

/** The feedback form, with the tester number filled in where the address says {tester}. */
function surveyUrl(n) {
  const url = String(process.env.UAT_SURVEY_URL || '').trim();
  if (!url) return null;
  return n ? url.replace(/\{tester\}/g, encodeURIComponent(String(n))) : url;
}

function notFound(res) {
  return res.status(404).json({ error: 'Not found.' });
}

/** Whether the guide is on, for the app to decide if it shows anything at all. */
function getStatus(req, res) {
  res.json({ enabled: uatMode() });
}

/** A tester's sign-in details, for the start page and step 1. Only the ready-made test accounts. */
async function getTester(req, res) {
  if (!uatMode()) return notFound(res);
  const t = tester(Number(req.params.n));
  if (!t) return notFound(res);
  try {
    const parish = (await pool.query('SELECT name, slug FROM parish WHERE slug = $1', [t.parishSlug])).rows[0];
    if (!parish) return res.status(404).json({ error: `The test parish "${t.parishSlug}" isn't on this site.` });
    return res.json({
      n: t.n,
      email: t.email,
      password: String(process.env.UAT_TESTER_PASSWORD || ''),
      parishSlug: parish.slug,
      parishName: parish.name,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load this tester.' });
  }
}

function digits(value) {
  return String(value || '').replace(/\D/g, '');
}

async function latest(sql, params) {
  return (await pool.query(sql, params)).rows[0] || null;
}

async function savedSteps(userId) {
  const { rows } = await pool.query(
    'SELECT step, status, rating, hint_used, started_at, finished_at FROM test_guide_step WHERE user_id = $1',
    [userId]
  );
  return Object.fromEntries(rows.map((s) => [s.step, s]));
}

/** The signed-in tester's details and progress. 404 for anyone who isn't a ready-made tester. */
async function getMyGuide(req, res) {
  if (!uatMode()) return notFound(res);
  try {
    const user = (await pool.query('SELECT email, contact_number FROM app_user WHERE id = $1', [req.user.id])).rows[0];
    const t = user && tester(testerNumber(user.email));
    if (!t) return notFound(res);
    const me = req.user.id;

    const request = await latest(
      `SELECT r.id, r.reference_no, r.status, r.rejection_reason, r.certificate_id, p.status AS payment_status,
              c.hash AS certificate_hash
       FROM certificate_request r
       LEFT JOIN certificate c ON c.id = r.certificate_id
       LEFT JOIN LATERAL (SELECT status FROM payment WHERE certificate_request_id = r.id ORDER BY created_at DESC LIMIT 1) p ON true
       WHERE r.requested_by = $1 AND r.record_type = 'baptism'
       ORDER BY r.created_at DESC LIMIT 1`,
      [me]
    );
    const mass = await latest(
      `SELECT status, payment_status FROM mass_intention WHERE requester_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [me]
    );
    const gave = await latest(
      `SELECT 1 FROM donation d JOIN payment p ON p.donation_id = d.id
       WHERE d.user_id = $1 AND p.status = 'paid' AND d.voided_at IS NULL LIMIT 1`,
      [me]
    );
    const savedBy = await savedSteps(me);

    const seen = {
      signin: true,
      request: Boolean(request),
      contact: digits(decrypt(user.contact_number)) === digits(t.contactNumber),
      pay: request?.payment_status === 'paid',
      // Done once offered; with a GCash donation, once that's paid.
      mass: Boolean(mass) && mass.payment_status !== 'pending',
      give: Boolean(gave),
    };

    // The first time a task shows up done in the data, note when, for the task's time.
    const newlyDone = Object.keys(seen).filter((key) => seen[key] && !savedBy[key]?.finished_at);
    if (newlyDone.length) {
      for (const key of newlyDone) {
        await pool.query(
          `INSERT INTO test_guide_step (user_id, step, status, finished_at) VALUES ($1, $2, 'done', NOW())
           ON CONFLICT (user_id, step) DO UPDATE SET status = 'done', finished_at = NOW(), updated_at = NOW()`,
          [me, key]
        );
      }
      Object.assign(savedBy, await savedSteps(me));
    }

    const steps = STEPS.map((key) => {
      const s = savedBy[key];
      const status = seen[key] ? 'done' : s?.status || null;
      const started = s?.started_at ? new Date(s.started_at) : null;
      const finished = s?.finished_at ? new Date(s.finished_at) : null;
      return {
        key,
        status,
        rating: s?.rating || null,
        hintUsed: Boolean(s?.hint_used),
        started: Boolean(started),
        // How long the task took, from when the guide showed it until it was done.
        seconds: started && finished && finished >= started ? Math.round((finished - started) / 1000) : null,
      };
    });

    return res.json({
      tester: {
        n: t.n,
        email: t.email,
        parishSlug: t.parishSlug,
        contactNumber: t.contactNumber,
        sex: t.sex,
        first: t.first,
        last: t.last,
        born: t.born,
        birthplace: t.birthplace,
        baptized: t.baptized,
        father: t.father,
        mother: t.mother,
        massFor: t.massFor,
        donation: t.donation,
      },
      steps,
      request: request
        ? {
            id: request.id,
            referenceNo: request.reference_no,
            status: request.status,
            paid: request.payment_status === 'paid',
            released: request.status === 'released',
            rejectionReason: request.rejection_reason || null,
            // For the "check your certificate" step: the certificate's own check page.
            certificateHash: request.status === 'released' ? request.certificate_hash || null : null,
          }
        : null,
      mass: mass ? { status: mass.status, paid: mass.payment_status === 'paid' } : null,
      surveyUrl: surveyUrl(t.n),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not load your test guide.' });
  }
}

/**
 * Saves what the app saw for one task: { started: true } when the guide first shows it, { hint: true } when
 * the tester opens its hint, { status: 'done' | 'skipped' } for a task only the app can see or a skip,
 * and { rating } for "How easy was it?". Several can be sent together.
 */
async function saveMyStep(req, res) {
  if (!uatMode()) return notFound(res);
  const step = req.params.step;
  if (!STEPS.includes(step)) return res.status(400).json({ error: 'Unknown step.' });
  const body = req.body || {};
  const status = ['done', 'skipped'].includes(body.status) ? body.status : null;
  const rating = ['easy', 'okay', 'hard'].includes(body.rating) ? body.rating : null;
  const hint = body.hint === true;
  const started = body.started === true;
  if (!status && !rating && !hint && !started) return res.status(400).json({ error: 'Nothing to save.' });
  try {
    const user = (await pool.query('SELECT email FROM app_user WHERE id = $1', [req.user.id])).rows[0];
    if (!user || !testerNumber(user.email)) return notFound(res);
    await pool.query(
      `INSERT INTO test_guide_step (user_id, step, status, rating, hint_used, started_at, finished_at)
       VALUES ($1, $2, $3::text, $4::text, $5::boolean, CASE WHEN $6::boolean THEN NOW() END, CASE WHEN $3::text IS NOT NULL THEN NOW() END)
       ON CONFLICT (user_id, step) DO UPDATE SET
         status = COALESCE(test_guide_step.status, EXCLUDED.status),
         rating = COALESCE(EXCLUDED.rating, test_guide_step.rating),
         hint_used = test_guide_step.hint_used OR EXCLUDED.hint_used,
         started_at = COALESCE(test_guide_step.started_at, EXCLUDED.started_at),
         finished_at = COALESCE(test_guide_step.finished_at, EXCLUDED.finished_at),
         updated_at = NOW()`,
      [req.user.id, step, status, rating, hint, started]
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not save this step.' });
  }
}

module.exports = { getStatus, getTester, getMyGuide, saveMyStep, STEPS };
