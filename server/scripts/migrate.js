// Applies the SQL files in server/migrations to the database in DATABASE_URL, in number order,
// and remembers which ones have run in the schema_migrations table.
//
//   npm run migrate                    run every migration that hasn't run yet
//   npm run migrate:status             list each migration as applied or pending; changes nothing
//   npm run migrate:baseline -- 028    mark 001–028 as applied WITHOUT running them
//                                      (for a database that was brought up to date by hand)
//
// Each file runs in its own transaction: if it fails, that file is undone and the run stops.
// See docs/migrations.md.

require('dotenv').config({ quiet: true });

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const FILE_PATTERN = /^(\d{3})_[\w-]+\.sql$/;
// Any fixed number works; it only has to be the same for every run so two runs can't overlap.
const LOCK_KEY = 4207231;

function listFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => FILE_PATTERN.test(name))
    .sort()
    .map((name) => {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8');
      // Ignore line endings, so a Windows (CRLF) and a Linux (LF) checkout give the same fingerprint.
      const checksum = crypto.createHash('sha256').update(sql.replace(/\r\n/g, '\n')).digest('hex');
      return { name, number: Number(name.match(FILE_PATTERN)[1]), sql, checksum };
    });
}

function checkNumbering(files) {
  const seen = new Map();
  for (const file of files) {
    if (seen.has(file.number)) {
      throw new Error(`Two migrations share the number ${file.number}: ${seen.get(file.number)} and ${file.name}.`);
    }
    seen.set(file.number, file.name);
  }
}

async function ensureTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) PRIMARY KEY,
      checksum CHAR(64) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      baselined BOOLEAN NOT NULL DEFAULT false
    )
  `);
}

async function loadApplied(client) {
  const result = await client.query('SELECT name, checksum, applied_at, baselined FROM schema_migrations');
  return new Map(result.rows.map((row) => [row.name, row]));
}

function warnChanged(files, applied) {
  const changed = files.filter((f) => applied.has(f.name) && applied.get(f.name).checksum !== f.checksum);
  for (const file of changed) {
    console.warn(`Warning: ${file.name} has changed since it was applied. Put new changes in a new migration.`);
  }
  const missing = [...applied.keys()].filter((name) => !files.some((f) => f.name === name));
  for (const name of missing) {
    console.warn(`Warning: ${name} is recorded as applied but its file is missing.`);
  }
}

async function migrate(client) {
  const files = listFiles();
  checkNumbering(files);
  const applied = await loadApplied(client);
  warnChanged(files, applied);

  const pending = files.filter((f) => !applied.has(f.name));
  if (pending.length === 0) {
    console.log('Database is up to date. Nothing to run.');
    return;
  }

  for (const file of pending) {
    process.stdout.write(`Running ${file.name} ... `);
    try {
      await client.query('BEGIN');
      await client.query(file.sql);
      await client.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)', [
        file.name,
        file.checksum,
      ]);
      await client.query('COMMIT');
      console.log('done');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      console.log('FAILED');
      console.error(`\n${file.name} failed and was undone: ${err.message}`);
      if (err.position) console.error(`(at character ${err.position} of the file)`);
      console.error('Later migrations were not run.');
      process.exitCode = 1;
      return;
    }
  }
  console.log(`\nApplied ${pending.length} migration${pending.length === 1 ? '' : 's'}.`);
}

async function status(client) {
  const files = listFiles();
  checkNumbering(files);
  const applied = await loadApplied(client);
  warnChanged(files, applied);

  for (const file of files) {
    const row = applied.get(file.name);
    if (!row) {
      console.log(`  pending   ${file.name}`);
    } else {
      const when = row.applied_at.toISOString().slice(0, 16).replace('T', ' ');
      console.log(`  applied   ${file.name}   ${when}${row.baselined ? '  (baseline)' : ''}`);
    }
  }
  const pendingCount = files.filter((f) => !applied.has(f.name)).length;
  console.log(`\n${files.length - pendingCount} applied, ${pendingCount} pending.`);
}

async function baseline(client, upTo) {
  const limit = Number(upTo);
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new Error('Say which migration the database is up to, e.g. npm run migrate:baseline -- 028');
  }
  const files = listFiles();
  checkNumbering(files);
  if (!files.some((f) => f.number === limit)) {
    throw new Error(`There is no migration numbered ${String(limit).padStart(3, '0')}.`);
  }
  const applied = await loadApplied(client);
  const toMark = files.filter((f) => f.number <= limit && !applied.has(f.name));

  await client.query('BEGIN');
  for (const file of toMark) {
    await client.query(
      'INSERT INTO schema_migrations (name, checksum, baselined) VALUES ($1, $2, true)',
      [file.name, file.checksum]
    );
  }
  await client.query('COMMIT');
  console.log(
    toMark.length
      ? `Marked ${toMark.length} migration${toMark.length === 1 ? '' : 's'} as applied (not run), up to ${toMark.at(-1).name}.`
      : 'Those migrations were already recorded. Nothing changed.'
  );
}

async function main() {
  const [command = 'up', arg] = process.argv.slice(2);
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set.');

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_KEY]);
    await ensureTable(client);
    if (command === 'up') await migrate(client);
    else if (command === 'status') await status(client);
    else if (command === 'baseline') await baseline(client, arg);
    else throw new Error(`Unknown command "${command}". Use up, status or baseline.`);
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]).catch(() => {});
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
