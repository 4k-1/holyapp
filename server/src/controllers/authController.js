const jwt = require('jsonwebtoken');
const pool = require('../config/db');

async function login(req, res) {
  const { email, password_hash } = req.body;
  // NOTE: replace password_hash comparison with real bcrypt.compare in HS-7
  try {
    const result = await pool.query(
      'SELECT id, parish_id, role, first_name, middle_name, last_name, email, password_hash, status FROM app_user WHERE email = $1',
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is not active' });
    }
    // Temporary plain comparison — HS-7 replaces this with bcrypt.compare()
    if (password_hash !== user.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      {
        sub: user.id,
        parish_id: user.parish_id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
    );
    res.json({
      token,
      user: {
        id: user.id,
        first_name: user.first_name,
        middle_name: user.middle_name,
        last_name: user.last_name,
        email: user.email,
        role: user.role,
        parish_id: user.parish_id,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { login };