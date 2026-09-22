const express = require('express');
const { authenticate, requireRole } = require('../middleware/rbac');
const { scopeParish, requireParish } = require('../middleware/scopeParish');
const { ROLES } = require('../constants/roles');
const {
  verifyCertificate,
  listMyCertificates,
  downloadPdf,
} = require('../controllers/certificateController');

const router = express.Router();

router.get('/verify/:hash', verifyCertificate);
router.get(
  '/mine',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(ROLES.PARISHIONER),
  listMyCertificates
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
