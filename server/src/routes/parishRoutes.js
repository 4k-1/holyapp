const express = require('express');
const pool = require('../config/db');
const { authenticate, requireRole } = require('../middleware/rbac');
const { scopeParish, requireParish } = require('../middleware/scopeParish');
const { ROLES } = require('../constants/roles');
const {
  getProfile,
  updateProfile,
  listFees,
  updateFee,
  getCertificates,
  updateCertificates,
} = require('../controllers/parishSettingsController');

const router = express.Router();
const office = [ROLES.PARISH_ADMIN, ROLES.PARISH_STAFF];

async function parishContext(req, res) {
  try {
    if (!req.parishId) {
      return res.json({
        parish: null,
        parish_id: null,
        role: req.user.role,
        hint: 'Pass X-Parish-Id to act on a specific parish',
      });
    }

    const result = await pool.query(
      'SELECT id, name, address, email FROM parish WHERE id = $1',
      [req.parishId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Parish not found', parish_id: req.parishId });
    }

    res.json({
      parish: result.rows[0],
      parish_id: req.parishId,
      role: req.user.role,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

router.get('/context', authenticate, scopeParish, parishContext);
router.get(
  '/settings/profile',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(...office),
  getProfile
);
router.patch(
  '/settings/profile',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(ROLES.PARISH_ADMIN),
  updateProfile
);
router.get(
  '/settings/fees',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(...office),
  listFees
);
router.patch(
  '/settings/fees/:feeId',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(ROLES.PARISH_ADMIN),
  updateFee
);
router.get(
  '/settings/certificates',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(...office),
  getCertificates
);
router.put(
  '/settings/certificates',
  authenticate,
  scopeParish,
  requireParish,
  requireRole(ROLES.PARISH_ADMIN),
  updateCertificates
);
router.get('/:parishId/context', authenticate, scopeParish, parishContext);

module.exports = router;
