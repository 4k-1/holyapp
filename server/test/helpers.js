// Shared helpers for the server tests. Run the tests with `npm test`, which points DATABASE_URL
// at the throwaway test database before anything here loads.

const crypto = require('crypto');
const request = require('supertest');

if (!/_test$/.test(new URL(process.env.DATABASE_URL || 'postgresql://x/none').pathname)) {
  throw new Error('Run the tests with `npm test`; DATABASE_URL must point at a database ending in _test.');
}

const app = require('../src/app');
const pool = require('../src/config/db');
const { signAccessToken } = require('../src/utils/tokens');
const { hashPassword } = require('../src/utils/password');

const PASSWORD = 'Test-password-1';

function uniqueTag() {
  return crypto.randomBytes(4).toString('hex');
}

async function createUser({ parishId, role, firstName, lastName, tag }) {
  const email = `${role}.${tag}@holyapp.test`;
  const result = await pool.query(
    `INSERT INTO app_user (parish_id, role, email, password_hash, status, first_name, last_name, email_verified_at)
     VALUES ($1, $2, $3, $4, 'active', $5, $6, NOW())
     RETURNING id, parish_id, role, email`,
    [parishId, role, email, await hashPassword(PASSWORD), firstName, lastName]
  );
  const user = result.rows[0];
  return { ...user, token: signAccessToken(user) };
}

/**
 * A parish with an admin, a staff member and a parishioner, each with a sign-in token.
 * Every call makes a new parish, so test files don't share data.
 */
async function createParish(label = 'Test') {
  const tag = uniqueTag();
  const parish = await pool.query(
    `INSERT INTO parish (name, address, contact, email, slug)
     VALUES ($1, 'Cebu City, Cebu', '(032) 000 0000', $2, $3)
     RETURNING id, slug, name`,
    [`${label} Parish ${tag}`, `office.${tag}@holyapp.test`, `test-${tag}`]
  );
  const { id } = parish.rows[0];
  const [admin, staff, parishioner] = await Promise.all([
    createUser({ parishId: id, role: 'parish_admin', firstName: 'Ada', lastName: 'Admin', tag: `a${tag}` }),
    createUser({ parishId: id, role: 'parish_staff', firstName: 'Stef', lastName: 'Staff', tag: `s${tag}` }),
    createUser({ parishId: id, role: 'parishioner', firstName: 'Paz', lastName: 'Parishioner', tag: `p${tag}` }),
  ]);
  return { ...parish.rows[0], admin, staff, parishioner };
}

/** Calls the API as a signed-in user: api(user).get('/records/baptism') */
function api(user) {
  const wrap = (method) => (path) => {
    const req = request(app)[method](path);
    return user ? req.set('Authorization', `Bearer ${user.token}`) : req;
  };
  return { get: wrap('get'), post: wrap('post'), patch: wrap('patch'), put: wrap('put'), delete: wrap('delete') };
}

/** A complete, valid baptism entry. Override any field. */
function baptismBody(overrides = {}) {
  return {
    firstName: 'Juan',
    middleName: 'Reyes',
    lastName: 'Dela Cruz',
    sex: 'Male',
    dateOfBirth: '2024-01-15',
    placeOfBirth: 'Cebu City',
    dateOfBaptism: '2024-03-10',
    placeOfBaptism: 'Main church',
    legitimacyStatus: 'Legitimate',
    minister: 'Rev. Fr. Test Priest',
    fatherFirstName: 'Pedro',
    fatherLastName: 'Dela Cruz',
    motherFirstName: 'Maria',
    motherLastName: 'Reyes',
    bookNumber: '1',
    pageNumber: '2',
    entryNumber: '3',
    remarks: 'Dummy record for testing.',
    ...overrides,
  };
}

async function createBaptism(user, overrides) {
  const res = await api(user).post('/records/baptism').send(baptismBody(overrides));
  if (res.status !== 201) throw new Error(`Couldn't create a baptism: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.record;
}

module.exports = { pool, api, createParish, createBaptism, baptismBody, PASSWORD };
