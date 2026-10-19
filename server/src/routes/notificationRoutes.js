const express = require('express');
const { authenticate, requireRole } = require('../middleware/rbac');
const { scopeParish, requireParish } = require('../middleware/scopeParish');
const { ROLES } = require('../constants/roles');
const {
  listNotifications,
  unreadCount,
  markRead,
  markAllRead,
} = require('../controllers/notificationController');

const router = express.Router();
const office = [ROLES.PARISH_ADMIN, ROLES.PARISH_STAFF];

router.get('/', authenticate, scopeParish, requireParish, requireRole(...office), listNotifications);
router.get('/unread-count', authenticate, scopeParish, requireParish, requireRole(...office), unreadCount);
router.patch('/read-all', authenticate, scopeParish, requireParish, requireRole(...office), markAllRead);
router.patch('/:id/read', authenticate, scopeParish, requireParish, requireRole(...office), markRead);

module.exports = router;
