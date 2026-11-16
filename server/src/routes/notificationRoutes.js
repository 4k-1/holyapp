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
// Everyone in a parish reads only their own notifications (every query filters by recipient).
const members = [ROLES.PARISH_ADMIN, ROLES.PARISH_STAFF, ROLES.PARISHIONER];

router.get('/', authenticate, scopeParish, requireParish, requireRole(...members), listNotifications);
router.get('/unread-count', authenticate, scopeParish, requireParish, requireRole(...members), unreadCount);
router.patch('/read-all', authenticate, scopeParish, requireParish, requireRole(...members), markAllRead);
router.patch('/:id/read', authenticate, scopeParish, requireParish, requireRole(...members), markRead);

module.exports = router;
