const express = require('express');
const { authenticate, requireRole } = require('../middleware/rbac');
const { scopeParish, requireParish } = require('../middleware/scopeParish');
const { ROLES } = require('../constants/roles');
const {
  listApplications,
  getApplication,
  listMine,
  createApplication,
  verifyRequirement,
  updateDispensation,
  reserveWeddingDate,
  confirmWeddingDate,
  rejectApplication,
} = require('../controllers/marriageApplicationController');

const router = express.Router();
const parishioner = [authenticate, scopeParish, requireParish, requireRole(ROLES.PARISHIONER)];
const office = [
  authenticate,
  scopeParish,
  requireParish,
  requireRole(ROLES.PARISH_ADMIN, ROLES.PARISH_STAFF),
];
const signedIn = [authenticate, scopeParish, requireParish];

router.get('/mine', ...parishioner, listMine);
router.get('/', ...office, listApplications);
router.post('/', ...office, createApplication);
router.get('/:id', ...signedIn, getApplication);
router.patch('/:id/requirements/:requirementId', ...office, verifyRequirement);
router.patch('/:id/dispensation', ...office, updateDispensation);
router.post('/:id/reserve-date', ...office, reserveWeddingDate);
router.post('/:id/confirm-date', ...office, confirmWeddingDate);
router.post('/:id/reject', ...office, rejectApplication);

module.exports = router;
