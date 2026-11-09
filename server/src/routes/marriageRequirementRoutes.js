const express = require('express');
const { authenticate, requireRole } = require('../middleware/rbac');
const { scopeParish, requireParish } = require('../middleware/scopeParish');
const { ROLES } = require('../constants/roles');
const { listRequirements, addRequirement, updateRequirement } = require('../controllers/marriageRequirementsController');

const router = express.Router();
const base = [authenticate, scopeParish, requireParish];

router.get('/', ...base, requireRole(ROLES.PARISH_ADMIN, ROLES.PARISH_STAFF), listRequirements);
router.post('/', ...base, requireRole(ROLES.PARISH_ADMIN), addRequirement);
router.patch('/:id', ...base, requireRole(ROLES.PARISH_ADMIN), updateRequirement);

module.exports = router;
