require('dotenv').config();

const express = require('express');

console.log("APP STARTED");


const cors = require('cors');
const pool = require('./config/db');

const app = express();
app.use(cors());
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

app.get('/db-test', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM test_ping');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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

// Start listening only when run directly (npm run dev / npm start). Tests load the app without a port.
if (require.main === module) {
  const { frontendUrl } = require('./utils/frontendUrl');
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Password reset emails will use ${frontendUrl()}`);
  });
}

module.exports = app;