const express = require('express');
const { authenticate, requireRole } = require('../middleware/rbac');
const { scopeParish, requireParish } = require('../middleware/scopeParish');
const { ROLES } = require('../constants/roles');
const {
  listParishDonations,
  recordDonation,
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

module.exports = router;
