const express = require('express');
const { authenticate, requireRole } = require('../middleware/rbac');
const { scopeParish, requireParish } = require('../middleware/scopeParish');
const { ROLES } = require('../constants/roles');
const {
  listParishDonations,
  recordDonation,
  voidDonation,
  correctDonation,
  listMyDonations,
  giveDonation,
  syncMyDonation,
} = require('../controllers/donationController');

const router = express.Router();
const parishioner = [authenticate, scopeParish, requireParish, requireRole(ROLES.PARISHIONER)];
const office = [
  authenticate,
  scopeParish,
  requireParish,
  requireRole(ROLES.PARISH_ADMIN, ROLES.PARISH_STAFF),
];

router.get('/mine', ...parishioner, listMyDonations);
router.post('/give', ...parishioner, giveDonation);
router.post('/:id/sync', ...parishioner, syncMyDonation);
router.get('/', ...office, listParishDonations);
router.post('/', ...office, recordDonation);
// Voiding and correcting money is for the parish admin only, as a check on the office.
const admin = [authenticate, scopeParish, requireParish, requireRole(ROLES.PARISH_ADMIN)];
router.post('/:id/void', ...admin, voidDonation);
router.post('/:id/correct', ...admin, correctDonation);

module.exports = router;
