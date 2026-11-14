const express = require('express');
const { authenticate, requireRole } = require('../middleware/rbac');
const { scopeParish, requireParish } = require('../middleware/scopeParish');
const { ROLES } = require('../constants/roles');
const { requireArea } = require('../middleware/areaAccess');
const { createBaptism, listBaptisms, getBaptism, updateBaptism } = require('../controllers/baptismController');
const { createBaptismAnnotation } = require('../controllers/annotationController');
const { createConfirmation, listConfirmations, getConfirmation, updateConfirmation } = require('../controllers/confirmationController');
const { createMarriage, listMarriages, getMarriage, updateMarriage } = require('../controllers/marriageController');
const { createDeath, listDeaths, getDeath, updateDeath } = require('../controllers/deathController');
const { issueFromRecord } = require('../controllers/certificateController');
const { archiveRecord, unarchiveRecord } = require('../controllers/recordArchiveController');

const router = express.Router();
const office = [ROLES.PARISH_ADMIN, ROLES.PARISH_STAFF];
const officeMw = [authenticate, scopeParish, requireParish, requireRole(...office), requireArea('registers')];
// Issuing a copy from a register entry needs View on registers and Manage on certificates.
const issueMw = [authenticate, scopeParish, requireParish, requireRole(...office), requireArea('registers', 'view'), requireArea('certificates', 'manage')];
const adminMw = [authenticate, scopeParish, requireParish, requireRole(ROLES.PARISH_ADMIN)];

router.get(
  '/baptism',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(...office),
  requireArea('registers'),
  listBaptisms
);

router.get(
  '/baptism/:id',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(...office),
  requireArea('registers'),
  getBaptism
);

router.post(
  '/baptism/:id/annotations',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(...office),
  requireArea('registers'),
  createBaptismAnnotation
);

router.post(
  '/baptism',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(...office),
  requireArea('registers'),
  createBaptism
);

router.get(
  '/confirmation',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(...office),
  requireArea('registers'),
  listConfirmations
);

router.get(
  '/confirmation/:id',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(...office),
  requireArea('registers'),
  getConfirmation
);

router.post(
  '/confirmation',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(...office),
  requireArea('registers'),
  createConfirmation
);

router.get(
  '/marriage',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(...office),
  requireArea('registers'),
  listMarriages
);

router.get(
  '/marriage/:id',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(...office),
  requireArea('registers'),
  getMarriage
);

router.post(
  '/marriage',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(...office),
  requireArea('registers'),
  createMarriage
);

router.get(
  '/death',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(...office),
  requireArea('registers'),
  listDeaths
);

router.get(
  '/death/:id',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(...office),
  requireArea('registers'),
  getDeath
);

router.post(
  '/death',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(...office),
  requireArea('registers'),
  createDeath
);

router.patch('/baptism/:id', ...adminMw, updateBaptism);
router.post('/baptism/:id/archive', ...adminMw, archiveRecord('baptism'));
router.post('/baptism/:id/unarchive', ...adminMw, unarchiveRecord('baptism'));
router.post('/baptism/:id/certificates', ...issueMw, issueFromRecord('baptism'));

router.patch('/confirmation/:id', ...adminMw, updateConfirmation);
router.post('/confirmation/:id/archive', ...adminMw, archiveRecord('confirmation'));
router.post('/confirmation/:id/unarchive', ...adminMw, unarchiveRecord('confirmation'));
router.post('/confirmation/:id/certificates', ...issueMw, issueFromRecord('confirmation'));

router.patch('/marriage/:id', ...adminMw, updateMarriage);
router.post('/marriage/:id/archive', ...adminMw, archiveRecord('marriage'));
router.post('/marriage/:id/unarchive', ...adminMw, unarchiveRecord('marriage'));
router.post('/marriage/:id/certificates', ...issueMw, issueFromRecord('marriage'));

router.patch('/death/:id', ...adminMw, updateDeath);
router.post('/death/:id/archive', ...adminMw, archiveRecord('death'));
router.post('/death/:id/unarchive', ...adminMw, unarchiveRecord('death'));
router.post('/death/:id/certificates', ...issueMw, issueFromRecord('death'));

module.exports = router;
