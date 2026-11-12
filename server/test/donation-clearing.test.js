// D4: cheques and bank transfers count only once the bank clears them.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish } = require('./helpers');

after(() => pool.end());

function gift(overrides = {}) {
  return { donorName: 'Clearing Donor', donationType: 'Check', amount: 1000, donationDate: '2026-10-10', ...overrides };
}

async function record(user, overrides) {
  const res = await api(user).post('/donations').send(gift(overrides));
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body;
}

async function listed(user, id) {
  const res = await api(user).get('/donations');
  return res.body.donations.find((d) => d.id === id);
}

async function report(user) {
  const res = await api(user).get('/reports/donations');
  assert.equal(res.status, 200);
  return res.body;
}

const reportTotal = (body) => body.rows.reduce((n, row) => n + row.amount, 0);

describe('Cheque and transfer status', () => {
  let parish;

  before(async () => {
    parish = await createParish('Clearing');
    await record(parish.staff, { donationType: 'Cash', amount: 300, reference: 'ignored for cash' });
  });

  it('needs a cheque number, and keeps the number and bank', async () => {
    const refused = await api(parish.staff).post('/donations').send(gift());
    assert.equal(refused.status, 400);
    assert.match(refused.body.error, /cheque number/);

    const saved = await record(parish.staff, { reference: '0012345', bank: 'BDO' });
    const row = await listed(parish.staff, saved.id);
    assert.equal(row.reference, '0012345');
    assert.equal(row.bank, 'BDO');
    assert.equal(row.clearing.status, 'pending');
  });

  it('treats cash as cleared and ignores a reference on it', async () => {
    const res = await api(parish.staff).get('/donations');
    const cash = res.body.donations.find((d) => d.donationType === 'Cash');
    assert.equal(cash.clearing.status, 'cleared');
    assert.equal(cash.reference, undefined);
  });

  it("doesn't count a pending cheque or transfer until it clears", async () => {
    const before = await report(parish.admin);
    const transfer = await record(parish.staff, { donationType: 'Bank Transfer', amount: 700, reference: 'TRX-88' });
    const middle = await report(parish.admin);
    assert.equal(reportTotal(middle), reportTotal(before));
    assert.equal(middle.waiting.amount, before.waiting.amount + 700);

    const cleared = await api(parish.admin).post(`/donations/${transfer.id}/clear`);
    assert.equal(cleared.status, 200);
    const after = await report(parish.admin);
    assert.equal(reportTotal(after), reportTotal(before) + 700);
    assert.equal(after.waiting.amount, before.waiting.amount);

    const row = await listed(parish.staff, transfer.id);
    assert.equal(row.clearing.status, 'cleared');
    assert.equal(row.clearing.by, 'Ada Admin');
  });

  it('needs a reason to mark a cheque bounced, and never counts it', async () => {
    const before = await report(parish.admin);
    const cheque = await record(parish.staff, { reference: '0099', amount: 5000 });
    assert.equal((await api(parish.admin).post(`/donations/${cheque.id}/bounce`).send({ reason: 'no' })).status, 400);

    const bounced = await api(parish.admin).post(`/donations/${cheque.id}/bounce`).send({ reason: 'Insufficient funds' });
    assert.equal(bounced.status, 200);
    const after = await report(parish.admin);
    assert.equal(reportTotal(after), reportTotal(before));
    assert.equal(after.waiting.amount, before.waiting.amount);
    assert.equal((await listed(parish.staff, cheque.id)).clearing.reason, 'Insufficient funds');

    const audit = await pool.query(
      "SELECT count(*)::int AS n FROM audit_log WHERE entity_id = $1 AND action = 'donation.bounced'",
      [cheque.id]
    );
    assert.equal(audit.rows[0].n, 1);
  });

  it("can't change a status twice, or settle cash or a voided gift", async () => {
    const cheque = await record(parish.staff, { reference: '0100' });
    await api(parish.admin).post(`/donations/${cheque.id}/clear`);
    assert.equal((await api(parish.admin).post(`/donations/${cheque.id}/clear`)).status, 409);
    assert.equal(
      (await api(parish.admin).post(`/donations/${cheque.id}/bounce`).send({ reason: 'Bank said no' })).status,
      409
    );

    const cash = await record(parish.staff, { donationType: 'Cash' });
    assert.equal((await api(parish.admin).post(`/donations/${cash.id}/clear`)).status, 409);

    const voided = await record(parish.staff, { reference: '0101' });
    await api(parish.admin).post(`/donations/${voided.id}/void`).send({ reason: 'Entered twice' });
    assert.equal((await api(parish.admin).post(`/donations/${voided.id}/clear`)).status, 400);
  });

  it('is for admins of this parish only', async () => {
    const cheque = await record(parish.staff, { reference: '0200' });
    assert.equal((await api(parish.staff).post(`/donations/${cheque.id}/clear`)).status, 403);
    const other = await createParish('Clearing other');
    assert.equal((await api(other.admin).post(`/donations/${cheque.id}/clear`)).status, 404);
  });
});
