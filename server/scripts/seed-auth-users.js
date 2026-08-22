require('dotenv').config();

const pool = require('../src/config/db');
const { hashPassword } = require('../src/utils/password');

const DEV_PASSWORD = 'Password123!';

const PARISHES = [
  {
    key: 'a',
    name: 'St. Mary Parish',
    address: '123 Main St',
    contact: '555-0100',
    email: 'stmary@example.com',
  },
  {
    key: 'b',
    name: 'St. Joseph Parish',
    address: '456 Oak Ave',
    contact: '555-0200',
    email: 'stjoseph@example.com',
  },
];

const USERS = [
  {
    email: 'super.admin@holyapp.local',
    role: 'super_admin',
    parishKey: null,
    first_name: 'Super',
    last_name: 'Admin',
  },
  {
    email: 'admin.a@holyapp.local',
    role: 'parish_admin',
    parishKey: 'a',
    first_name: 'Anna',
    last_name: 'Admin',
  },
  {
    email: 'staff.a@holyapp.local',
    role: 'parish_staff',
    parishKey: 'a',
    first_name: 'Sam',
    last_name: 'Staff',
  },
  {
    email: 'parishioner.a@holyapp.local',
    role: 'parishioner',
    parishKey: 'a',
    first_name: 'Pat',
    last_name: 'Parishioner',
  },
  {
    email: 'admin.b@holyapp.local',
    role: 'parish_admin',
    parishKey: 'b',
    first_name: 'Bella',
    last_name: 'Admin',
  },
];

async function upsertParish(parish) {
  const existing = await pool.query('SELECT id FROM parish WHERE name = $1', [parish.name]);
  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  const inserted = await pool.query(
    `INSERT INTO parish (name, address, contact, email)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [parish.name, parish.address, parish.contact, parish.email]
  );
  return inserted.rows[0].id;
}

async function upsertUser({ email, role, parishId, first_name, last_name, passwordHash }) {
  const result = await pool.query(
    `INSERT INTO app_user (parish_id, role, email, password_hash, status, first_name, last_name)
     VALUES ($1, $2, $3, $4, 'active', $5, $6)
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       role = EXCLUDED.role,
       parish_id = EXCLUDED.parish_id,
       status = 'active',
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name
     RETURNING id, email, role, parish_id`,
    [parishId, role, email, passwordHash, first_name, last_name]
  );
  return result.rows[0];
}

async function main() {
  const passwordHash = await hashPassword(DEV_PASSWORD);
  const parishIds = {};

  for (const parish of PARISHES) {
    parishIds[parish.key] = await upsertParish(parish);
  }

  console.log('Seeded parishes:');
  for (const parish of PARISHES) {
    console.log(`  ${parish.name} -> ${parishIds[parish.key]}`);
  }

  console.log('\nSeeded users (password for all: Password123!):');
  for (const user of USERS) {
    const row = await upsertUser({
      ...user,
      parishId: user.parishKey ? parishIds[user.parishKey] : null,
      passwordHash,
    });
    console.log(`  ${row.email}  role=${row.role}  parish_id=${row.parish_id || 'null'}`);
  }
}

main()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
