// Receipt numbers (running numbers) and void / correct (never overwrite), first used by donations.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish } = require('./helpers');

function gift(overrides = {}) {
  return { donorName: 'Test Donor', donationType: 'Cash', amount: 300, donationDate: '2026-11-03', ...overrides };
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

const RECEIPT = /^DON-\d{4}-\d{6}$/;
const sequence = (receiptNo) => Number(receiptNo.split('-')[2]);

// Close the database connection once, after all three groups below.
after(() => pool.end());

describe('Donation receipt numbers', () => {
  let parish;
  let other;

  before(async () => {
    parish = await createParish('Receipts');
    other = await createParish('Receipts Other');
  });

  it('gives each office gift the next receipt number', async () => {
    const first = await record(parish.staff);
    const second = await record(parish.staff);
    assert.match(first.receiptNo, RECEIPT);
    assert.equal(sequence(second.receiptNo), sequence(first.receiptNo) + 1);
    assert.equal((await listed(parish.admin, first.id)).receiptNo, first.receiptNo);
  });

  it('never repeats or skips a number when many gifts are saved at once', async () => {
    const results = await Promise.all(Array.from({ length: 12 }, () => record(parish.staff)));
    const numbers = results.map((r) => sequence(r.receiptNo)).sort((a, b) => a - b);
    assert.equal(new Set(numbers).size, 12, 'all different');
    assert.equal(numbers[11] - numbers[0], 11, 'no gaps');
  });

  it('numbers each parish separately, starting at 1', async () => {
    const first = await record(other.staff);
    assert.equal(sequence(first.receiptNo), 1);
  });

  it("doesn't use up a number when a gift is refused", async () => {
    const before = await record(parish.staff);
    const refused = await api(parish.staff).post('/donations').send(gift({ amount: -1 }));
    assert.equal(refused.status, 400);
    const after = await record(parish.staff);
    assert.equal(sequence(after.receiptNo), sequence(before.receiptNo) + 1);
  });
});

describe('Voiding a donation', () => {
  let parish;
  let other;

  before(async () => {
    parish = await createParish('Voids');
    other = await createParish('Voids Other');
  });

  it('keeps the gift on record, marked voided with who, when and why', async () => {
    const saved = await record(parish.staff);
    const res = await api(parish.admin).post(`/donations/${saved.id}/void`).send({ reason: 'Entered twice by mistake' });
    assert.equal(res.status, 200);

    const row = await listed(parish.admin, saved.id);
    assert.ok(row, 'still listed');
    assert.equal(row.receiptNo, saved.receiptNo);
    assert.equal(row.voided.reason, 'Entered twice by mistake');
    assert.equal(row.voided.by, 'Ada Admin');
  });

  it('writes the activity log line in the same save', async () => {
    const saved = await record(parish.staff);
    await api(parish.admin).post(`/donations/${saved.id}/void`).send({ reason: 'Wrong parish fund' });
    const log = await pool.query(
      "SELECT actor_id, metadata FROM audit_log WHERE action = 'donation.voided' AND entity_id = $1",
      [saved.id]
    );
    assert.equal(log.rows.length, 1);
    assert.equal(log.rows[0].actor_id, parish.admin.id);
    assert.equal(log.rows[0].metadata.reason, 'Wrong parish fund');
  });

  it('leaves voided gifts out of the donation report', async () => {
    const report = async () => {
      const res = await api(parish.admin).get('/reports/donations');
      assert.equal(res.status, 200);
      return res.body.rows.reduce((sum, r) => sum + r.amount, 0);
    };
    const saved = await record(parish.staff, { amount: 777 });
    const withGift = await report();
    await api(parish.admin).post(`/donations/${saved.id}/void`).send({ reason: 'Returned to the donor' });
    assert.equal(await report(), withGift - 777);
  });

  it('only lets the admin void', async () => {
    const saved = await record(parish.staff);
    const res = await api(parish.staff).post(`/donations/${saved.id}/void`).send({ reason: 'Staff should not do this' });
    assert.equal(res.status, 403);
    assert.equal((await listed(parish.admin, saved.id)).voided, undefined);
  });

  it('needs a reason', async () => {
    const saved = await record(parish.staff);
    for (const reason of [undefined, '', '   ', 'no']) {
      const res = await api(parish.admin).post(`/donations/${saved.id}/void`).send({ reason });
      assert.equal(res.status, 400, `reason ${JSON.stringify(reason)}`);
    }
    assert.equal((await listed(parish.admin, saved.id)).voided, undefined);
  });

  it("can't void the same gift twice", async () => {
    const saved = await record(parish.staff);
    await api(parish.admin).post(`/donations/${saved.id}/void`).send({ reason: 'First void reason' });
    const again = await api(parish.admin).post(`/donations/${saved.id}/void`).send({ reason: 'Second void reason' });
    assert.equal(again.status, 409);
    assert.equal((await listed(parish.admin, saved.id)).voided.reason, 'First void reason');
  });

  it("can't void another parish's gift", async () => {
    const saved = await record(parish.staff);
    const res = await api(other.admin).post(`/donations/${saved.id}/void`).send({ reason: 'Not our parish' });
    assert.equal(res.status, 404);
    assert.equal((await listed(parish.admin, saved.id)).voided, undefined);
  });

  it('answers "not found" for an id that is not a real id', async () => {
    const res = await api(parish.admin).post('/donations/not-an-id/void').send({ reason: 'Bad id test' });
    assert.equal(res.status, 404);
  });
});

describe('Correcting a donation', () => {
  let parish;

  before(async () => {
    parish = await createParish('Corrections');
  });

  it('voids the wrong gift and saves the corrected one with a new receipt number, linked back', async () => {
    const wrong = await record(parish.staff, { amount: 5000 });
    const res = await api(parish.admin)
      .post(`/donations/${wrong.id}/correct`)
      .send({ ...gift({ amount: 500 }), reason: 'Typed an extra zero' });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.notEqual(res.body.receiptNo, wrong.receiptNo);
    assert.equal(res.body.replaces.receiptNo, wrong.receiptNo);

    const old = await listed(parish.admin, wrong.id);
    const fixed = await listed(parish.admin, res.body.id);
    assert.equal(old.voided.reason, 'Typed an extra zero');
    assert.equal(old.amount, 5000, 'the original amount is kept');
    assert.equal(fixed.amount, 500);
    assert.equal(fixed.replacesId, wrong.id);
    assert.equal(fixed.voided, undefined);
  });

  it('saves nothing when the corrected gift is invalid', async () => {
    const saved = await record(parish.staff);
    const res = await api(parish.admin)
      .post(`/donations/${saved.id}/correct`)
      .send({ ...gift({ amount: 0 }), reason: 'Bad correction test' });
    assert.equal(res.status, 400);
    assert.equal((await listed(parish.admin, saved.id)).voided, undefined, 'the original is untouched');
  });

  it("can't correct a gift that was already voided", async () => {
    const saved = await record(parish.staff);
    await api(parish.admin).post(`/donations/${saved.id}/void`).send({ reason: 'Voided before correcting' });
    const res = await api(parish.admin).post(`/donations/${saved.id}/correct`).send({ ...gift(), reason: 'Too late now' });
    assert.equal(res.status, 409);
  });

  it('only lets the admin correct', async () => {
    const saved = await record(parish.staff);
    const res = await api(parish.staff).post(`/donations/${saved.id}/correct`).send({ ...gift(), reason: 'Staff attempt' });
    assert.equal(res.status, 403);
  });
});
