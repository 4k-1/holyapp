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
  updateCircumstances,
  reserveWeddingDate,
  confirmWeddingDate,
  rejectApplication,
  updateBanns,
  listBannsElsewhere,
  createBannsElsewhere,
  removeBannsElsewhere,
  bannsList,
  bannsCertificate,
  bannsPoster,
  linkParishioner,
  unlinkParishioner,
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
router.get('/banns-list', ...office, bannsList);
router.get('/banns-elsewhere', ...office, listBannsElsewhere);
router.post('/banns-elsewhere', ...office, createBannsElsewhere);
router.delete('/banns-elsewhere/:id', ...office, removeBannsElsewhere);
router.get('/:id', ...signedIn, getApplication);
router.patch('/:id/requirements/:requirementId', ...office, verifyRequirement);
router.patch('/:id/dispensation', ...office, updateDispensation);
router.patch('/:id/circumstances', ...office, updateCircumstances);
router.post('/:id/reserve-date', ...office, reserveWeddingDate);
router.post('/:id/confirm-date', ...office, confirmWeddingDate);
router.post('/:id/reject', ...office, rejectApplication);
router.patch('/:id/banns', ...office, updateBanns);
router.get('/:id/banns-certificate', ...office, bannsCertificate);
router.get('/:id/banns-poster', ...office, bannsPoster);
router.put('/:id/parishioner', ...office, linkParishioner);
router.delete('/:id/parishioner', ...office, unlinkParishioner);

module.exports = router;
