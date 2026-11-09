const express = require('express');
const { authenticate, requireRole } = require('../middleware/rbac');
const { scopeParish, requireParish } = require('../middleware/scopeParish');
const { ROLES } = require('../constants/roles');
const { listPersonnel, createPerson, updatePerson, removePerson } = require('../controllers/personnelController');
const { getHandover, leave } = require('../controllers/handoverController');

const router = express.Router();
const base = [authenticate, scopeParish, requireParish];

router.get('/', ...base, requireRole(ROLES.PARISH_ADMIN, ROLES.PARISH_STAFF), listPersonnel);
router.post('/', ...base, requireRole(ROLES.PARISH_ADMIN), createPerson);
router.patch('/:id', ...base, requireRole(ROLES.PARISH_ADMIN), updatePerson);
router.get('/:id/handover', ...base, requireRole(ROLES.PARISH_ADMIN), getHandover);
router.post('/:id/leave', ...base, requireRole(ROLES.PARISH_ADMIN), leave);
router.delete('/:id', ...base, requireRole(ROLES.PARISH_ADMIN), removePerson);

module.exports = router;
