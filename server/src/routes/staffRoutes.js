const express = require('express');
const { authenticate, requireRole } = require('../middleware/rbac');
const { scopeParish, requireParish } = require('../middleware/scopeParish');
const { ROLES } = require('../constants/roles');
const { listStaff, createStaff, updateStaff, setStaffStatus } = require('../controllers/staffController');

const router = express.Router();
const office = [ROLES.PARISH_ADMIN, ROLES.PARISH_STAFF];

router.get('/', authenticate, scopeParish, requireParish, requireRole(...office), listStaff);
router.post('/', authenticate, scopeParish, requireParish, requireRole(ROLES.PARISH_ADMIN), createStaff);
router.patch('/:id/status', authenticate, scopeParish, requireParish, requireRole(ROLES.PARISH_ADMIN), setStaffStatus);
router.patch('/:id', authenticate, scopeParish, requireParish, requireRole(ROLES.PARISH_ADMIN), updateStaff);

module.exports = router;
