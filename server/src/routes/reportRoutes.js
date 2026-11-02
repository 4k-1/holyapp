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
router.get('/donations', ...office, getDonationReport);
router.get('/intentions', ...office, getIntentionReport);

module.exports = router;
