require('dotenv').config();

const pool = require('../src/config/db');
const { hashPassword } = require('../src/utils/password');

const DEV_PASSWORD = 'password123';

const PARISHES = [
  {
    key: 'mtcarmel',
    slug: 'mtcarmel',
    name: 'Santuario Arquidiocesano de Nuestra Señora del Carmen, la Limpia',
    address: 'Cebu City, Cebu',
    contact: '(032) 254 1234',
    email: 'office@mtcarmel-cebu.ph',
  },
  {
    key: 'san-nicolas',
    slug: 'san-nicolas',
    name: 'San Nicolas de Tolentino Parish',
    address: 'Cebu City, Cebu',
    contact: '(032) 261 5580',
    email: 'office@sannicolas-cebu.ph',
  },
];

const USERS = [
  {
    email: 'super@holyapp.ph',
    role: 'super_admin',
    parishKey: null,
    first_name: 'Platform',
    last_name: 'Administrator',
    contact_number: '+63 917 000 0001',
  },
  {
    email: 'admin@immaculada.ph',
    role: 'parish_admin',
    parishKey: 'mtcarmel',
    first_name: 'Immaculada',
    last_name: 'Santos',
    contact_number: '+63 917 111 0001',
  },
  {
    email: 'juan.santos@immaculada.ph',
    role: 'parish_staff',
    parishKey: 'mtcarmel',
    first_name: 'Juan',
    last_name: 'Santos',
    contact_number: '+63 917 111 0002',
  },
  {
    email: 'emilio.reyes@immaculada.ph',
    role: 'parish_staff',
    parishKey: 'mtcarmel',
    first_name: 'Emilio',
    last_name: 'Reyes',
    contact_number: '+63 917 111 0003',
  },
  {
    email: 'carla.bautista@immaculada.ph',
    role: 'parish_admin',
    parishKey: 'mtcarmel',
    first_name: 'Carla',
    last_name: 'Bautista',
    contact_number: '+63 917 111 0004',
  },
  {
    email: 'miguel.torres@immaculada.ph',
    role: 'parish_staff',
    parishKey: 'mtcarmel',
    first_name: 'Miguel',
    last_name: 'Torres',
    contact_number: '+63 917 111 0005',
    status: 'suspended',
  },
  {
    email: 'admin@sannicolas.ph',
    role: 'parish_admin',
    parishKey: 'san-nicolas',
    first_name: 'Luis',
    last_name: 'Mendoza',
    contact_number: '+63 917 222 0001',
  },
  {
    email: 'juan@example.com',
    role: 'parishioner',
    parishKey: 'mtcarmel',
    first_name: 'Juan',
    last_name: 'Dela Cruz',
    birthday: '1998-04-12',
    address: 'Cebu City, Cebu',
    contact_number: '+63 917 555 0101',
  },
  {
    email: 'maria.santos@gmail.com',
    role: 'parishioner',
    parishKey: 'mtcarmel',
    first_name: 'Maria',
    last_name: 'Santos',
    birthday: '1995-11-22',
    address: 'Cebu City, Cebu',
    contact_number: '+63 917 555 0102',
  },
  {
    email: 'elena.cruz@gmail.com',
    role: 'parishioner',
    parishKey: 'mtcarmel',
    first_name: 'Elena',
    last_name: 'Cruz',
    birthday: '1992-03-09',
    address: 'Talisay City, Cebu',
    contact_number: '+63 917 555 0103',
    status: 'suspended',
  },
  {
    email: 'rosa.villanueva@gmail.com',
    role: 'parishioner',
    parishKey: 'san-nicolas',
    first_name: 'Rosa',
    last_name: 'Villanueva',
    birthday: '1988-07-19',
    address: 'Cebu City, Cebu',
    contact_number: '+63 917 555 0201',
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

async function upsertUser({
  email,
  role,
  parishId,
  first_name,
  last_name,
  passwordHash,
  status = 'active',
  contact_number = null,
  birthday = null,
  address = null,
}) {
  const verifiedAt = role === 'parishioner' || status === 'active' ? new Date() : null;
  const result = await pool.query(
    `INSERT INTO app_user (
       parish_id, role, email, password_hash, status,
       first_name, last_name, contact_number, birthday, address, email_verified_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       role = EXCLUDED.role,
       parish_id = EXCLUDED.parish_id,
       status = EXCLUDED.status,
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name,
       contact_number = EXCLUDED.contact_number,
       birthday = EXCLUDED.birthday,
       address = EXCLUDED.address,
       email_verified_at = EXCLUDED.email_verified_at
     RETURNING id, email, role, parish_id, status`,
    [
      parishId,
      role,
      email,
      passwordHash,
      status,
      first_name,
      last_name,
      contact_number,
      birthday,
      address,
      verifiedAt,
    ]
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

  console.log('\nSeeded users (password for all: password123):');
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
