const express = require('express');
const { authenticate, requireRole } = require('../middleware/rbac');
const { scopeParish, requireParish } = require('../middleware/scopeParish');
const { ROLES } = require('../constants/roles');
const { createBaptism } = require('../controllers/baptismController');
const { createConfirmation } = require('../controllers/confirmationController');
const { createMarriage } = require('../controllers/marriageController');
const { createDeath } = require('../controllers/deathController');

const router = express.Router();
const office = [ROLES.PARISH_ADMIN, ROLES.PARISH_STAFF];

router.post(
  '/baptism',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(...office),
  createBaptism
);

router.post(
  '/confirmation',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(...office),
  createConfirmation
);

router.post(
  '/marriage',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(...office),
  createMarriage
);

router.post(
  '/death',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(...office),
  createDeath
);

module.exports = router;
