const express = require('express');
const { authenticate, requireRole } = require('../middleware/rbac');
const { scopeParish, requireParish } = require('../middleware/scopeParish');
const { ROLES } = require('../constants/roles');
const {
  getSacramentReport,
  getCertificateReport,
  getDonationReport,
  getIntentionReport,
} = require('../controllers/reportController');
const { getDaySummary } = require('../controllers/daySummaryController');
const { listIssuedCopies } = require('../controllers/certificateRegisterController');

const router = express.Router();
const office = [
  authenticate,
  scopeParish,
  requireParish,
  requireRole(ROLES.PARISH_ADMIN, ROLES.PARISH_STAFF),
];

// Each takes optional ?from=YYYY-MM-DD&to=YYYY-MM-DD.
router.get('/sacraments', ...office, getSacramentReport);
router.get('/certificates', ...office, getCertificateReport);
// Every issued copy, one row each (A7): ?from=&to= by the day it was issued.
router.get('/certificates/copies', ...office, listIssuedCopies);
router.get('/donations', ...office, getDonationReport);
router.get('/intentions', ...office, getIntentionReport);
// One day's copies, receipts and money: ?date=YYYY-MM-DD (default today, Philippine time)&staffId=…
router.get('/day', ...office, getDaySummary);

module.exports = router;
