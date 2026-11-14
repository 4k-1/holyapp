const express = require('express');
const { authenticate, requireRole } = require('../middleware/rbac');
const { scopeParish, requireParish } = require('../middleware/scopeParish');
const { ROLES } = require('../constants/roles');
const { listAuditLog, listParishActivity } = require('../controllers/auditController');

const router = express.Router();

router.get('/', authenticate, requireRole(ROLES.SUPER_ADMIN), listAuditLog);
// The parish's own activity, for its admins only (staff access and sign-ins are in it).
router.get('/parish', authenticate, scopeParish, requireParish, requireRole(ROLES.PARISH_ADMIN), listParishActivity);

module.exports = router;
