// UAT only: the in-app test guide. Every route answers 404 unless the server runs with UAT_MODE=on,
// except /status, which tells the app whether to show the guide at all.
const express = require('express');
const { authenticate, requireRole } = require('../middleware/rbac');
const { ROLES } = require('../constants/roles');
const { getStatus, getTester, getMyGuide, saveMyStep } = require('../testing/testGuideController');

const router = express.Router();
const parishioner = [authenticate, requireRole(ROLES.PARISHIONER)];

router.get('/status', getStatus);
router.get('/testers/:n', getTester);
router.get('/me', ...parishioner, getMyGuide);
router.put('/me/steps/:step', ...parishioner, saveMyStep);

module.exports = router;
