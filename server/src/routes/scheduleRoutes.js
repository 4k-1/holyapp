const express = require('express');
const { authenticate, requireRole } = require('../middleware/rbac');
const { scopeParish, requireParish } = require('../middleware/scopeParish');
const { ROLES } = require('../constants/roles');
const {
  listMonth,
  listBlocks,
  listStaffNames,
  checkConflict,
  calendarDay,
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
];

router.get('/mass-times', ...signedIn, listMassTimes);
router.get('/month', ...office, listMonth);
router.get('/blocks', ...office, listBlocks);
router.get('/staff', ...office, listStaffNames);
router.post('/conflicts', ...office, checkConflict);
router.get('/calendar-day', ...office, calendarDay);
router.post('/events', ...office, createBlock);
router.patch('/events/:id', ...office, updateBlock);
router.post('/assign', ...office, assignOccurrence);
router.patch('/events/:id/record-status', ...office, markRecord);
router.get('/recurring', ...office, listRecurring);
router.post('/recurring', ...office, createRecurring);
router.patch('/recurring/:id', ...office, updateRecurring);
router.delete('/recurring/:id', ...office, removeRecurring);

module.exports = router;
