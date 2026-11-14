const express = require('express');
const { authenticate, requireRole } = require('../middleware/rbac');
const { scopeParish, requireParish } = require('../middleware/scopeParish');
const { ROLES } = require('../constants/roles');
const { requireArea } = require('../middleware/areaAccess');
const {
  listSlots,
  listOpenSlots,
  syncDonation,
  listMine,
  listParishIntentions,
  submitIntention,
  bookIntention,
  confirmIntention,
  markSaid,
  getCapacitySetting,
  updateCapacitySetting,
} = require('../controllers/intentionController');

const router = express.Router();
const parishioner = [authenticate, scopeParish, requireParish, requireRole(ROLES.PARISHIONER)];
const office = [
  authenticate,
  scopeParish,
  requireParish,
  requireRole(ROLES.PARISH_ADMIN, ROLES.PARISH_STAFF),
  requireArea('intentions'),
];

router.get('/mine', ...parishioner, listMine);
router.get('/open-slots', ...parishioner, listOpenSlots);
router.post('/', ...parishioner, submitIntention);
router.post('/:id/donation/sync', ...parishioner, syncDonation);
router.get('/slots', ...office, listSlots);
router.get('/capacity', ...office, getCapacitySetting);
router.patch('/capacity', ...office, updateCapacitySetting);
router.get('/', ...office, listParishIntentions);
router.post('/book', ...office, bookIntention);
router.patch('/:id/confirm', ...office, confirmIntention);
router.patch('/:id/said', ...office, markSaid);

module.exports = router;
