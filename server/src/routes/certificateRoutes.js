const express = require('express');
const { authenticate, requireRole } = require('../middleware/rbac');
const { scopeParish, requireParish } = require('../middleware/scopeParish');
const { ROLES } = require('../constants/roles');
const { requireArea, requireAnyArea } = require('../middleware/areaAccess');
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
const office = [authenticate, scopeParish, requireParish, requireRole(ROLES.PARISH_ADMIN, ROLES.PARISH_STAFF), requireArea('certificates')];
// A copy issued from a record is checked, spoiled and reprinted by whoever issued it, and staff with
// View on Registers can issue: they pass here as well as those with the Certificates area.
const copyOffice = (level) => [
  authenticate,
  scopeParish,
  requireParish,
  requireRole(ROLES.PARISH_ADMIN, ROLES.PARISH_STAFF),
  requireAnyArea(['certificates', level], ['registers', 'view']),
];

router.get('/verify/:hash', verifyCertificate);
router.get('/unconfirmed', ...office, listUnconfirmed);
router.post('/:id/confirm-print', ...copyOffice('manage'), confirmPrint);
router.post('/:id/spoil', ...copyOffice('manage'), spoilCertificate);
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
  requireArea('certificates'),
  revokeCertificate
);
router.get('/:id', ...copyOffice('view'), getOfficeCertificate);
router.post('/:id/reprints', ...copyOffice('manage'), reprintCertificate);
router.get(
  '/:id/pdf',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(ROLES.PARISHIONER, ROLES.PARISH_ADMIN, ROLES.PARISH_STAFF),
  requireArea('certificates', 'view'),
  downloadPdf
);

module.exports = router;
