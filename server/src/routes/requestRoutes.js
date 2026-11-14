const express = require('express');
const { authenticate, requireRole } = require('../middleware/rbac');
const { scopeParish, requireParish } = require('../middleware/scopeParish');
const { ROLES } = require('../constants/roles');
const { requireArea } = require('../middleware/areaAccess');
const {
  createRequest,
  listMyRequests,
  listParishRequests,
  getRequest,
  linkRequest,
  rejectRequest,
  confirmPayment,
} = require('../controllers/certificateRequestController');
const {
  startGcashCheckout,
  syncGcashPayment,
  getReceipt,
} = require('../controllers/paymongoController');
const { issueDigital, markReady, releasePickup } = require('../controllers/certificateController');

const router = express.Router();
const parishioner = [authenticate, scopeParish, requireParish, requireRole(ROLES.PARISHIONER)];
const office = [
  authenticate,
  scopeParish,
  requireParish,
  requireRole(ROLES.PARISH_ADMIN, ROLES.PARISH_STAFF),
  requireArea('certificates'),
];

router.post('/', ...parishioner, createRequest);
router.get('/mine', ...parishioner, listMyRequests);
router.get('/', ...office, listParishRequests);
router.get('/:id/receipt', authenticate, scopeParish, requireParish, getReceipt);
router.post('/:id/gcash', ...parishioner, startGcashCheckout);
router.post('/:id/gcash/sync', ...parishioner, syncGcashPayment);
router.get('/:id', ...office, getRequest);
router.post('/:id/link', ...office, linkRequest);
router.post('/:id/reject', ...office, rejectRequest);
router.post('/:id/payment', ...office, confirmPayment);
router.post('/:id/issue', ...office, issueDigital);
router.post('/:id/ready', ...office, markReady);
router.post('/:id/release', ...office, releasePickup);

module.exports = router;
