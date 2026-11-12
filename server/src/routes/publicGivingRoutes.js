const express = require('express');
const pool = require('../config/db');
const { configured: gcashConfigured } = require('../utils/paymongo');
const { listOpenSlots, submitIntention, syncDonation } = require('../controllers/intentionController');
const { giveDonation, syncMyDonation } = require('../controllers/donationController');

/**
 * Giving and Mass intentions for people without an account. The parish comes from the URL slug, and the same
 * controllers as the parishioner portal run with no signed-in user.
 */
const router = express.Router({ mergeParams: true });

async function resolveParish(req, res, next) {
  try {
    const found = await pool.query('SELECT id FROM parish WHERE slug = $1', [req.params.slug]);
    if (!found.rows[0]) return res.status(404).json({ error: 'Parish not found.' });
    req.parishId = found.rows[0].id;
    return next();
  } catch (err) {
    return next(err);
  }
}

/** A light brake on anonymous submissions: at most 20 per address every 10 minutes. */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_SUBMISSIONS = 20;
const recent = new Map();
function limitSubmissions(req, res, next) {
  const now = Date.now();
  const key = req.ip;
  const hits = (recent.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= MAX_SUBMISSIONS) {
    return res.status(429).json({ error: 'Too many requests. Please wait a few minutes and try again.' });
  }
  hits.push(now);
  recent.set(key, hits);
  return next();
}

router.use(resolveParish);
router.get('/donations/options', (req, res) => res.json({ gcashDonations: gcashConfigured() }));
router.post('/donations/give', limitSubmissions, giveDonation);
router.post('/donations/:id/sync', syncMyDonation);
router.get('/intentions/open-slots', listOpenSlots);
router.post('/intentions', limitSubmissions, submitIntention);
router.post('/intentions/:id/donation/sync', syncDonation);

module.exports = router;
