// npm test: rebuilds the test database from the migrations, then runs every *.test.js file.
//
// The test database is TEST_DATABASE_URL (default: holyapp_test on the local Docker Postgres).
// Its name must end in _test, so the tests can never wipe a real database.

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const DEFAULT_URL = 'postgresql://holyapp:holyapp_dev@localhost:5432/holyapp_test';
const TEST_DIR = __dirname;
const SERVER_DIR = path.join(__dirname, '..');

function testDatabaseUrl() {
  const url = new URL(process.env.TEST_DATABASE_URL || DEFAULT_URL);
  const name = url.pathname.replace(/^\//, '');
  if (!/_test$/.test(name)) {
    throw new Error(`Refusing to run: the test database "${name}" must end in _test.`);
  }
  return { url: url.toString(), name };
}

async function recreateDatabase({ url, name }) {
  const admin = new URL(url);
  admin.pathname = '/postgres';
  const client = new Client({ connectionString: admin.toString() });
  await client.connect();
  try {
    await client.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await client.query(`CREATE DATABASE "${name}"`);
  } finally {
    await client.end();
  }
}

function findTestFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return findTestFiles(full);
    return entry.name.endsWith('.test.js') ? [full] : [];
  });
}

async function main() {
  const db = testDatabaseUrl();
  // Everything the tests start gets the test database and no outside services.
  const env = {
    ...process.env,
    NODE_ENV: 'test',
    DATABASE_URL: db.url,
    JWT_SECRET: 'test-only-jwt-secret',
    // Fewer hashing rounds keep sign-in tests fast. Real servers use the .env value.
    BCRYPT_SALT_ROUNDS: '4',
    AUTH_DEBUG: '',
    SMTP_HOST: '',
    SMTP_USER: '',
    SMTP_PASS: '',
    BREVO_API_KEY: '',
    PAYMONGO_SECRET_KEY: '',
    PAYMONGO_WEBHOOK_SECRET: '',
    GEMINI_API_KEY: '',
    GEMINI_CACHE_DIR: '',
  };

  console.log(`Rebuilding ${db.name} from the migrations ...`);
  await recreateDatabase(db);
  const migrate = spawnSync(process.execPath, [path.join(SERVER_DIR, 'scripts', 'migrate.js'), 'up'], {
    env,
    encoding: 'utf8',
  });
  if (migrate.status !== 0) {
    process.stderr.write(migrate.stdout + migrate.stderr);
    throw new Error('Migrations failed on the test database.');
  }
  console.log('Test database ready.\n');

  const files = findTestFiles(TEST_DIR).sort();
  const extra = process.argv.slice(2);
  const run = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...extra, ...files], {
    env,
    stdio: 'inherit',
    cwd: SERVER_DIR,
  });
  process.exitCode = run.status ?? 1;
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
