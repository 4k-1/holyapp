// Service fees: the parish admin changes the default amounts in Settings. Typos are refused with a clear message
// instead of a database error.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish } = require('./helpers');

after(() => pool.end());

describe('Service fees', () => {
  let parish;
  let fee;

  before(async () => {
    parish = await createParish('Fees');
    const res = await api(parish.admin).get('/parish/settings/fees');
    assert.equal(res.status, 200);
    fee = res.body.fees.find((f) => f.label === 'Baptismal Certificate');
  });

  const update = (amount, who = parish.admin) => api(who).patch(`/parish/settings/fees/${fee.id}`).send({ amount });

  it('saves a new amount, with centavos', async () => {
    const res = await update(125.5);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.fee.amount, 125.5);
  });

  it('refuses amounts that are negative, too large or have more than 2 decimals', async () => {
    for (const [amount, message] of [
      [-1, /₱0 or more/],
      ['abc', /₱0 or more/],
      [123456789012, /at most ₱100,000/],
      [10.005, /2 decimal places/],
    ]) {
      const res = await update(amount);
      assert.equal(res.status, 400, `${amount}: ${JSON.stringify(res.body)}`);
      assert.match(res.body.error, message);
    }
    assert.equal((await update(100000)).status, 200, 'the limit itself is allowed');
  });

  it('lists only the certificate fees: blessings and Mass intentions have no fixed fee', async () => {
    // Fees from before stay in the table but are neither shown nor editable.
    const old = await pool.query(
      `INSERT INTO service_fee (parish_id, service_name, amount, updated_by)
       VALUES ($1, 'Car Blessing', 300, $2), ($1, 'Mass Intention (per intention)', 100, $2) RETURNING id`,
      [parish.id, parish.admin.id]
    );
    const res = await api(parish.admin).get('/parish/settings/fees');
    assert.deepEqual(
      res.body.fees.map((f) => f.label),
      ['Baptismal Certificate', 'Confirmation Certificate', 'Marriage Certificate', 'Death Certificate']
    );
    for (const { id } of old.rows) {
      const edit = await api(parish.admin).patch(`/parish/settings/fees/${id}`).send({ amount: 400 });
      assert.equal(edit.status, 404);
    }
  });

  it('lets only the parish admin change fees', async () => {
    assert.equal((await update(90, parish.staff)).status, 403);
  });
});
