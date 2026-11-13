const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/rbac');
const {
  login,
  loginSuperAdmin,
  register,
  verifyEmail,
  resendVerification,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  me,
  updateMe,
  verifyLoginTwoFactor,
  resendLoginTwoFactor,
} = require('../controllers/authController');
const { getSecurityOverview, setTwoFactor, endSession, endOtherSessions } = require('../controllers/securityController');
const { myTimeline } = require('../controllers/timelineController');

router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/login', login);
router.post('/login/super-admin', loginSuperAdmin);
router.post('/login/2fa', verifyLoginTwoFactor);
router.post('/login/2fa/resend', resendLoginTwoFactor);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', authenticate, me);
router.patch('/me', authenticate, updateMe);
router.get('/me/timeline', authenticate, myTimeline);
router.get('/security', authenticate, getSecurityOverview);
router.patch('/security/two-factor', authenticate, setTwoFactor);
router.delete('/security/sessions/others', authenticate, endOtherSessions);
router.delete('/security/sessions/:id', authenticate, endSession);

module.exports = router;
