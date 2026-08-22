const crypto = require('crypto');
const jwt = require('jsonwebtoken');

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      parish_id: user.parish_id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
}

function accessTokenExpiresInSeconds() {
  const raw = process.env.JWT_EXPIRES_IN || '15m';
  const match = /^(\d+)([smhd])$/.exec(raw);
  if (!match) return 900;
  const amount = Number(match[1]);
  const unit = { s: 1, m: 60, h: 3600, d: 86400 }[match[2]];
  return amount * unit;
}

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateRefreshToken() {
  const token = crypto.randomBytes(32).toString('hex');
  return {
    token,
    tokenHash: hashRefreshToken(token),
  };
}

function refreshTokenExpiryDate() {
  const days = Number(process.env.JWT_REFRESH_EXPIRES_DAYS) || 7;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

module.exports = {
  signAccessToken,
  accessTokenExpiresInSeconds,
  hashRefreshToken,
  generateRefreshToken,
  refreshTokenExpiryDate,
};
