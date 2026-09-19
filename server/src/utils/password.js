const bcrypt = require('bcrypt');

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;

async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

async function comparePassword(plain, hash) {
  if (!plain || !hash) return false;
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

module.exports = { hashPassword, comparePassword };
