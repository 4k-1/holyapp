const express = require('express');
const { authenticate, requireRole } = require('../middleware/rbac');
const { ROLES, ALL_ROLES } = require('../constants/roles');

const router = express.Router();

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

router.get(
  '/super-admin',
  authenticate,
  requireRole(ROLES.SUPER_ADMIN),
  (req, res) => {
    res.json({ ok: true, area: 'super_admin', role: req.user.role });
  }
);

router.get(
  '/admin',
  authenticate,
  requireRole(ROLES.SUPER_ADMIN, ROLES.PARISH_ADMIN),
  (req, res) => {
    res.json({ ok: true, area: 'admin', role: req.user.role });
  }
);

router.get(
  '/staff',
  authenticate,
  requireRole(ROLES.SUPER_ADMIN, ROLES.PARISH_ADMIN, ROLES.PARISH_STAFF),
  (req, res) => {
    res.json({ ok: true, area: 'staff', role: req.user.role });
  }
);

router.get(
  '/parishioner',
  authenticate,
  requireRole(...ALL_ROLES),
  (req, res) => {
    res.json({ ok: true, area: 'parishioner', role: req.user.role });
  }
);

module.exports = router;
