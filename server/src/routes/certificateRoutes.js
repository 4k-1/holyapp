const express = require('express');
const { authenticate, requireRole } = require('../middleware/rbac');
const { scopeParish, requireParish } = require('../middleware/scopeParish');
const { ROLES } = require('../constants/roles');
const {
  verifyCertificate,
  listMyCertificates,
  downloadPdf,
  revokeCertificate,
  getOfficeCertificate,
  reprintCertificate,
  confirmPrint,
  spoilCertificate,
  listUnconfirmed,
} = require('../controllers/certificateController');

const router = express.Router();
const office = [authenticate, scopeParish, requireParish, requireRole(ROLES.PARISH_ADMIN, ROLES.PARISH_STAFF)];

router.get('/verify/:hash', verifyCertificate);
router.get('/unconfirmed', ...office, listUnconfirmed);
router.post('/:id/confirm-print', ...office, confirmPrint);
router.post('/:id/spoil', ...office, spoilCertificate);
router.get(
  '/mine',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(ROLES.PARISHIONER),
  listMyCertificates
);
router.post(
  '/:id/revoke',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(ROLES.PARISH_ADMIN, ROLES.PARISH_STAFF),
  revokeCertificate
);
router.get(
  '/:id',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(ROLES.PARISH_ADMIN, ROLES.PARISH_STAFF),
  getOfficeCertificate
);
router.post(
  '/:id/reprints',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(ROLES.PARISH_ADMIN, ROLES.PARISH_STAFF),
  reprintCertificate
);
router.get(
  '/:id/pdf',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(ROLES.PARISHIONER, ROLES.PARISH_ADMIN, ROLES.PARISH_STAFF),
  downloadPdf
);

module.exports = router;
