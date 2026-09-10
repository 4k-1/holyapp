require('dotenv').config();

const pool = require('../src/config/db');
const { hashPassword } = require('../src/utils/password');

const DEV_PASSWORD = 'Password123!';

const PARISHES = [
  {
    key: 'a',
    slug: 'mtcarmel',
    name: 'Santuario Arquidiocesano de Nuestra Señora del Carmen, la Limpia',
    address: 'Cebu City, Cebu',
    contact: '(032) 254 1234',
    email: 'office@mtcarmel-cebu.ph',
  },
  {
    key: 'b',
    slug: 'san-nicolas',
    name: 'San Nicolas de Tolentino Parish',
    address: 'Cebu City, Cebu',
    contact: '(032) 261 5580',
    email: 'office@sannicolas-cebu.ph',
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
  const existing = await pool.query('SELECT id FROM parish WHERE slug = $1', [parish.slug]);
  if (existing.rows.length > 0) {
    await pool.query(
      `UPDATE parish
       SET name = $2, address = $3, contact = $4, email = $5, updated_at = NOW()
       WHERE slug = $1`,
      [parish.slug, parish.name, parish.address, parish.contact, parish.email]
    );
    return existing.rows[0].id;
  }

  const inserted = await pool.query(
    `INSERT INTO parish (name, address, contact, email, slug)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [parish.name, parish.address, parish.contact, parish.email, parish.slug]
  );
  return inserted.rows[0].id;
}

async function upsertUser({ email, role, parishId, first_name, last_name, passwordHash }) {
  const verifiedAt = new Date();
  const result = await pool.query(
    `INSERT INTO app_user (
       parish_id, role, email, password_hash, status,
       first_name, last_name, email_verified_at
     )
     VALUES ($1, $2, $3, $4, 'active', $5, $6, $7)
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       role = EXCLUDED.role,
       parish_id = EXCLUDED.parish_id,
       status = 'active',
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name,
       email_verified_at = EXCLUDED.email_verified_at
     RETURNING id, email, role, parish_id, status`,
    [parishId, role, email, passwordHash, first_name, last_name, verifiedAt]
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
    console.log(`  ${parish.slug}  ${parish.name} -> ${parishIds[parish.key]}`);
  }

  console.log('\nSeeded users (password for all: Password123!):');
  for (const user of USERS) {
    const row = await upsertUser({
      ...user,
      parishId: user.parishKey ? parishIds[user.parishKey] : null,
      passwordHash,
    });
    console.log(`  ${row.email}  role=${row.role}  status=${row.status}  parish_id=${row.parish_id || 'null'}`);
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
