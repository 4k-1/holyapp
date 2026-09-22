const express = require('express');
const { authenticate, requireRole } = require('../middleware/rbac');
const { scopeParish, requireParish } = require('../middleware/scopeParish');
const { ROLES } = require('../constants/roles');
const {
  createRequest,
  listMyRequests,
  listParishRequests,
  getRequest,
  linkRequest,
  rejectRequest,
  confirmPayment,
} = require('../controllers/certificateRequestController');

const router = express.Router();
const parishioner = [authenticate, scopeParish, requireParish, requireRole(ROLES.PARISHIONER)];
const office = [
  authenticate,
  scopeParish,
  requireParish,
  requireRole(ROLES.PARISH_ADMIN, ROLES.PARISH_STAFF),
];

router.post('/', ...parishioner, createRequest);
router.get('/mine', ...parishioner, listMyRequests);
router.get('/', ...office, listParishRequests);
router.get('/:id', ...office, getRequest);
router.post('/:id/link', ...office, linkRequest);
router.post('/:id/reject', ...office, rejectRequest);
router.post('/:id/payment', ...office, confirmPayment);

module.exports = router;
