const express = require('express');
const { authenticate, requireRole } = require('../middleware/rbac');
const { ROLES } = require('../constants/roles');
const { listAuditLog } = require('../controllers/auditController');

const router = express.Router();

router.get('/', authenticate, requireRole(ROLES.SUPER_ADMIN), listAuditLog);

module.exports = router;
