const express = require('express');
const { authenticate, requireRole } = require('../middleware/rbac');
const { ROLES } = require('../constants/roles');
const {
  dashboard,
  listParishes,
  getParish,
  createParish,
  updateParish,
  createAccount,
  updateAccount,
  setStatus,
  resetPassword,
  removeAccount,
} = require('../controllers/platformController');
const { reports } = require('../controllers/platformReportsController');

const router = express.Router();
const superAdmin = [authenticate, requireRole(ROLES.SUPER_ADMIN)];

router.get('/dashboard', ...superAdmin, dashboard);
router.get('/reports', ...superAdmin, reports);
router.get('/parishes', ...superAdmin, listParishes);
router.post('/parishes', ...superAdmin, createParish);
router.get('/parishes/:parishId', ...superAdmin, getParish);
router.patch('/parishes/:parishId', ...superAdmin, updateParish);
router.post('/accounts', ...superAdmin, createAccount);
router.patch('/accounts/:id', ...superAdmin, updateAccount);
router.patch('/accounts/:id/status', ...superAdmin, setStatus);
router.post('/accounts/:id/reset-password', ...superAdmin, resetPassword);
router.delete('/accounts/:id', ...superAdmin, removeAccount);

module.exports = router;
