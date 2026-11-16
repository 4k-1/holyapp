const express = require('express');
const { authenticate, requireRole } = require('../middleware/rbac');
const { scopeParish, requireParish } = require('../middleware/scopeParish');
const { ROLES } = require('../constants/roles');
const { requireArea } = require('../middleware/areaAccess');
const {
  createRequest,
  listMyRequests,
  getMyRequest,
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
const { listDocuments, addDocument, getDocument, removeDocument } = require('../controllers/requestDocumentController');

const router = express.Router();
const parishioner = [authenticate, scopeParish, requireParish, requireRole(ROLES.PARISHIONER)];
const office = [
  authenticate,
  scopeParish,
  requireParish,
  requireRole(ROLES.PARISH_ADMIN, ROLES.PARISH_STAFF),
  requireArea('certificates'),
];
// Supporting documents: the parishioner who made the request, or office staff who can view Certificates.
// The controller limits parishioners to their own requests.
const documentReaders = [
  authenticate,
  scopeParish,
  requireParish,
  requireRole(ROLES.PARISHIONER, ROLES.PARISH_ADMIN, ROLES.PARISH_STAFF),
  requireArea('certificates', 'view'),
];

router.post('/', ...parishioner, createRequest);
router.get('/mine', ...parishioner, listMyRequests);
router.get('/mine/:id', ...parishioner, getMyRequest);
router.get('/', ...office, listParishRequests);
router.get('/:id/receipt', authenticate, scopeParish, requireParish, getReceipt);
router.post('/:id/gcash', ...parishioner, startGcashCheckout);
router.post('/:id/gcash/sync', ...parishioner, syncGcashPayment);
router.get('/:id/documents', ...documentReaders, listDocuments);
router.post('/:id/documents', ...parishioner, express.raw({ type: 'image/*', limit: '11mb' }), addDocument);
router.get('/:id/documents/:docId', ...documentReaders, getDocument);
router.delete('/:id/documents/:docId', ...parishioner, removeDocument);
router.get('/:id', ...office, getRequest);
router.post('/:id/link', ...office, linkRequest);
router.post('/:id/reject', ...office, rejectRequest);
router.post('/:id/payment', ...office, confirmPayment);
router.post('/:id/issue', ...office, issueDigital);
router.post('/:id/ready', ...office, markReady);
router.post('/:id/release', ...office, releasePickup);

module.exports = router;
