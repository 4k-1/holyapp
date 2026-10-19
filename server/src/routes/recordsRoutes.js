const express = require('express');
const { authenticate, requireRole } = require('../middleware/rbac');
const { scopeParish, requireParish } = require('../middleware/scopeParish');
const { ROLES } = require('../constants/roles');
const { createBaptism, listBaptisms, getBaptism, updateBaptism } = require('../controllers/baptismController');
const { createBaptismAnnotation } = require('../controllers/annotationController');
const { createConfirmation, listConfirmations, getConfirmation, updateConfirmation } = require('../controllers/confirmationController');
const { createMarriage, listMarriages, getMarriage, updateMarriage } = require('../controllers/marriageController');
const { createDeath, listDeaths, getDeath, updateDeath } = require('../controllers/deathController');
const { issueFromRecord } = require('../controllers/certificateController');
const { archiveRecord, unarchiveRecord } = require('../controllers/recordArchiveController');

const router = express.Router();
const office = [ROLES.PARISH_ADMIN, ROLES.PARISH_STAFF];
const officeMw = [authenticate, scopeParish, requireParish, requireRole(...office)];
const adminMw = [authenticate, scopeParish, requireParish, requireRole(ROLES.PARISH_ADMIN)];

router.get(
  '/baptism',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(...office),
  listBaptisms
);

router.get(
  '/baptism/:id',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(...office),
  getBaptism
);

router.post(
  '/baptism/:id/annotations',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(...office),
  createBaptismAnnotation
);

router.post(
  '/baptism',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(...office),
  createBaptism
);

router.get(
  '/confirmation',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(...office),
  listConfirmations
);

router.get(
  '/confirmation/:id',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(...office),
  getConfirmation
);

router.post(
  '/confirmation',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(...office),
  createConfirmation
);

router.get(
  '/marriage',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(...office),
  listMarriages
);

router.get(
  '/marriage/:id',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(...office),
  getMarriage
);

router.post(
  '/marriage',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(...office),
  createMarriage
);

router.get(
  '/death',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(...office),
  listDeaths
);

router.get(
  '/death/:id',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(...office),
  getDeath
);

router.post(
  '/death',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(...office),
  createDeath
);

router.patch('/baptism/:id', ...adminMw, updateBaptism);
router.post('/baptism/:id/archive', ...adminMw, archiveRecord('baptism'));
router.post('/baptism/:id/unarchive', ...adminMw, unarchiveRecord('baptism'));
router.post('/baptism/:id/certificates', ...officeMw, issueFromRecord('baptism'));

router.patch('/confirmation/:id', ...adminMw, updateConfirmation);
router.post('/confirmation/:id/archive', ...adminMw, archiveRecord('confirmation'));
router.post('/confirmation/:id/unarchive', ...adminMw, unarchiveRecord('confirmation'));
router.post('/confirmation/:id/certificates', ...officeMw, issueFromRecord('confirmation'));

router.patch('/marriage/:id', ...adminMw, updateMarriage);
router.post('/marriage/:id/archive', ...adminMw, archiveRecord('marriage'));
router.post('/marriage/:id/unarchive', ...adminMw, unarchiveRecord('marriage'));
router.post('/marriage/:id/certificates', ...officeMw, issueFromRecord('marriage'));

router.patch('/death/:id', ...adminMw, updateDeath);
router.post('/death/:id/archive', ...adminMw, archiveRecord('death'));
router.post('/death/:id/unarchive', ...adminMw, unarchiveRecord('death'));
router.post('/death/:id/certificates', ...officeMw, issueFromRecord('death'));

module.exports = router;
