require('dotenv').config();

const express = require('express');

console.log("APP STARTED");


const cors = require('cors');
const pool = require('./config/db');

const app = express();
app.use(cors());
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
app.use('/auth', authRoutes);
app.use('/rbac', rbacRoutes);
app.use('/parish', parishRoutes);
app.use('/parishes', parishesRoutes);
app.use('/staff', staffRoutes);
app.use('/audit', auditRoutes);

const { frontendUrl } = require('./utils/frontendUrl');
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Password reset emails will use ${frontendUrl()}`);
});