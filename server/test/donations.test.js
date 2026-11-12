// Donations recorded at the office.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish } = require('./helpers');

function gift(overrides = {}) {
  return { donorName: 'Test Donor', donationType: 'Cash', amount: 250, donationDate: '2026-11-02', ...overrides };
}

async function countDonations(parishId) {
  const result = await pool.query('SELECT count(*)::int AS n FROM donation WHERE parish_id = $1', [parishId]);
  return result.rows[0].n;
}

describe('Office donations', () => {
  let parish;

  before(async () => {
    parish = await createParish('Donations');
  });

  after(() => pool.end());

  it('saves a donation and lists it with its amount', async () => {
    const res = await api(parish.staff).post('/donations').send(gift({ amount: 1234.5, purpose: 'Church repair' }));
    assert.equal(res.status, 201);

    const list = await api(parish.admin).get('/donations');
    assert.equal(list.status, 200);
    const saved = list.body.donations.find((d) => d.id === res.body.id);
    assert.ok(saved, 'the new donation is in the list');
    assert.equal(Number(saved.amount), 1234.5);
    assert.equal(saved.purpose, 'Church repair');
  });

  for (const [label, amount] of [
    ['zero', 0],
    ['a negative amount', -50],
    ['text', 'abc'],
    ['an amount that is too large', 1e12],
  ]) {
    it(`refuses ${label} as the amount, and saves nothing`, async () => {
      const before = await countDonations(parish.id);
      const res = await api(parish.staff).post('/donations').send(gift({ amount }));
      assert.equal(res.status, 400);
      assert.equal(await countDonations(parish.id), before);
    });
  }

  it('refuses an unknown donation method', async () => {
    const res = await api(parish.staff).post('/donations').send(gift({ donationType: 'Bitcoin' }));
    assert.equal(res.status, 400);
  });

  it('refuses a donation with no date', async () => {
    const res = await api(parish.staff).post('/donations').send(gift({ donationDate: '' }));
    assert.equal(res.status, 400);
  });

  it('keeps parishioners from recording office donations or seeing the list', async () => {
    const post = await api(parish.parishioner).post('/donations').send(gift());
    assert.equal(post.status, 403);
    const list = await api(parish.parishioner).get('/donations');
    assert.equal(list.status, 403);
  });
});
