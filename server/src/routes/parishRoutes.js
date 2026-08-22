const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/rbac');
const { scopeParish } = require('../middleware/scopeParish');

const router = express.Router();

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
router.get('/:parishId/context', authenticate, scopeParish, parishContext);

module.exports = router;
