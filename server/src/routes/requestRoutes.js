const express = require('express');
const { authenticate, requireRole } = require('../middleware/rbac');
const { scopeParish, requireParish } = require('../middleware/scopeParish');
const { ROLES } = require('../constants/roles');
const { createRequest, listMyRequests } = require('../controllers/certificateRequestController');

const router = express.Router();
const parishioner = [authenticate, scopeParish, requireParish, requireRole(ROLES.PARISHIONER)];

router.post('/', ...parishioner, createRequest);
router.get('/mine', ...parishioner, listMyRequests);

module.exports = router;
