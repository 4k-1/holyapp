const express = require('express');
const { authenticate, requireRole } = require('../middleware/rbac');
const { scopeParish, requireParish } = require('../middleware/scopeParish');
const { ROLES } = require('../constants/roles');
const { requireArea } = require('../middleware/areaAccess');
const {
  listMonth,
  listBlocks,
  listStaffNames,
  checkConflict,
  calendarDay,
  funeralSlots,
  bookFuneral,
  createBlock,
  updateBlock,
  assignOccurrence,
  markRecord,
  listRecurring,
  createRecurring,
  updateRecurring,
  removeRecurring,
  listMassTimes,
} = require('../controllers/scheduleController');

const router = express.Router();
const signedIn = [authenticate, scopeParish, requireParish];
const office = [
  authenticate,
  scopeParish,
  requireParish,
  requireRole(ROLES.PARISH_ADMIN, ROLES.PARISH_STAFF),
  requireArea('schedule'),
];

router.get('/mass-times', ...signedIn, listMassTimes);
router.get('/month', ...office, listMonth);
router.get('/blocks', ...office, listBlocks);
// Names for assigning a minister; marriage applications use it too, so any office sign-in may read it.
router.get('/staff', ...signedIn, requireRole(ROLES.PARISH_ADMIN, ROLES.PARISH_STAFF), listStaffNames);
router.post('/conflicts', ...office.slice(0, -1), requireArea('schedule', 'view'), checkConflict);
router.get('/calendar-day', ...office, calendarDay);
router.get('/funeral-slots', ...office, funeralSlots);
router.post('/funerals', ...office, bookFuneral);
router.post('/events', ...office, createBlock);
router.patch('/events/:id', ...office, updateBlock);
router.post('/assign', ...office, assignOccurrence);
router.patch('/events/:id/record-status', ...office, markRecord);
router.get('/recurring', ...office, listRecurring);
router.post('/recurring', ...office, createRecurring);
router.patch('/recurring/:id', ...office, updateRecurring);
router.delete('/recurring/:id', ...office, removeRecurring);

module.exports = router;
