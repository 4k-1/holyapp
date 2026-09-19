const express = require('express');
const { authenticate, requireRole } = require('../middleware/rbac');
const { ROLES } = require('../constants/roles');
const {
  listParishes,
  getParish,
  createAccount,
  updateAccount,
  setStatus,
  resetPassword,
  removeAccount,
} = require('../controllers/platformController');

const router = express.Router();
const superAdmin = [authenticate, requireRole(ROLES.SUPER_ADMIN)];

router.get('/parishes', ...superAdmin, listParishes);
router.get('/parishes/:parishId', ...superAdmin, getParish);
router.post('/accounts', ...superAdmin, createAccount);
router.patch('/accounts/:id', ...superAdmin, updateAccount);
router.patch('/accounts/:id/status', ...superAdmin, setStatus);
router.post('/accounts/:id/reset-password', ...superAdmin, resetPassword);
router.delete('/accounts/:id', ...superAdmin, removeAccount);

module.exports = router;
