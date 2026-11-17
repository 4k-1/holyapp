require('dotenv').config();

const express = require('express');
const cors = require('cors');
const {
  corsOptions,
  securityHeaders,
  hideServerErrors,
  errorHandler,
  limits,
} = require('./middleware/security');

const app = express();
app.disable('x-powered-by');
// Behind a host's proxy (Render, Railway, nginx), so req.ip is the visitor's address, not the proxy's.
if (process.env.TRUST_PROXY) {
  const hops = Number(process.env.TRUST_PROXY);
  app.set('trust proxy', Number.isInteger(hops) ? hops : process.env.TRUST_PROXY);
} else if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}
app.use(securityHeaders);
app.use(cors(corsOptions()));
app.use(hideServerErrors);
const { handlePaymongoWebhook } = require('./controllers/paymongoController');
app.post(
  '/payments/paymongo/webhook',
  express.raw({ type: () => true, limit: '1mb' }),
  handlePaymongoWebhook
);
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Lets every payment page say plainly when GCash is only in test mode.
app.get('/payments/mode', (req, res) => {
  res.json(require('./utils/paymongo').paymentMode());
});

// Attempt limits. Each path also covers what's under it (/auth/login covers /auth/login/2fa).
app.use('/auth/login/2fa', limits.codeByChallenge, limits.codeByIp);
app.use('/auth/login', limits.loginByIp, limits.loginByEmail);
app.use('/auth/signup/start', limits.emailsByIp, limits.emailsByEmail);
app.use('/auth/signup/verify', limits.codeByIp);
app.use('/auth/signup/finish', limits.codeByIp);
app.use('/auth/forgot-password', limits.emailsByIp, limits.emailsByEmail);
app.use('/auth/reset-password', limits.codeByIp);
app.use('/contact', limits.contactByIp);

const authRoutes = require('./routes/authRoutes');
const rbacRoutes = require('./routes/rbacRoutes');
const parishRoutes = require('./routes/parishRoutes');
const parishesRoutes = require('./routes/parishesRoutes');
const staffRoutes = require('./routes/staffRoutes');
const auditRoutes = require('./routes/auditRoutes');
const platformRoutes = require('./routes/platformRoutes');
const recordsRoutes = require('./routes/recordsRoutes');
const requestRoutes = require('./routes/requestRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const intentionRoutes = require('./routes/intentionRoutes');
const marriageApplicationRoutes = require('./routes/marriageApplicationRoutes');
const marriageRequirementRoutes = require('./routes/marriageRequirementRoutes');
const donationRoutes = require('./routes/donationRoutes');
const personnelRoutes = require('./routes/personnelRoutes');
const publicGivingRoutes = require('./routes/publicGivingRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');
const ledgerRoutes = require('./routes/ledgerRoutes');
const contactRoutes = require('./routes/contactRoutes');
app.use('/auth', authRoutes);
app.use('/rbac', rbacRoutes);
app.use('/parish', parishRoutes);
app.use('/parishes', parishesRoutes);
app.use('/staff', staffRoutes);
app.use('/audit', auditRoutes);
app.use('/platform', platformRoutes);
app.use('/records', recordsRoutes);
app.use('/requests', requestRoutes);
app.use('/certificates', certificateRoutes);
app.use('/notifications', notificationRoutes);
app.use('/schedule', scheduleRoutes);
app.use('/intentions', intentionRoutes);
app.use('/marriage-applications', marriageApplicationRoutes);
app.use('/marriage-requirements', marriageRequirementRoutes);
app.use('/donations', donationRoutes);
app.use('/personnel', personnelRoutes);
app.use('/public/:slug', publicGivingRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/reports', reportRoutes);
app.use('/ledgers', ledgerRoutes);
app.use('/contact', contactRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found.' });
});
app.use(errorHandler);

// Start listening only when run directly (npm run dev / npm start). Tests load the app without a port.
if (require.main === module) {
  const { frontendUrl } = require('./utils/frontendUrl');
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Password reset emails will use ${frontendUrl()}`);
    require('./utils/requestDocumentRetention').startRequestDocumentCleanup();
  });
}

module.exports = app;