const { hashPassword } = require('../src/utils/password');

const plain = process.argv[2];
if (!plain) {
  console.error('Usage: node scripts/hash-password.js <password>');
  process.exit(1);
}

hashPassword(plain)
  .then((hash) => {
    console.log(hash);
  })
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
