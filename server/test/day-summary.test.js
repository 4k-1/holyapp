// A4: the day summary. Read-only figures for one day, worked out from the records.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish, createBaptism } = require('./helpers');

after(() => pool.end());

async function issue(user, record) {
  const res = await api(user).post(`/records/baptism/${record.id}/certificates`);
  assert.equal(res.status, 201);
  return res.body.certificates.find((c) => c.status === 'Valid');
}

async function summary(user, query = '') {
  const res = await api(user).get(`/reports/day${query}`);
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body;
}

describe('Day summary', () => {
  let parish;
  let staffCopy;
  let adminCopy;
  let today;

  before(async () => {
    parish = await createParish('Day');
    staffCopy = await issue(parish.staff, await createBaptism(parish.staff, { firstName: 'Staffcopy' }));
    adminCopy = await issue(parish.admin, await createBaptism(parish.admin, { firstName: 'Admincopy' }));
    await api(parish.staff).post(`/certificates/${staffCopy.id}/reprints`).send({ reason: 'paper_jam' });
    await api(parish.admin).post(`/certificates/${adminCopy.id}/spoil`).send({ reason: 'Ink smeared on the name' });

    const gift = await api(parish.staff)
      .post('/donations')
      .send({ donorName: 'Day Donor', donationType: 'Cash', amount: 500, donationDate: '2026-11-01' });
    assert.equal(gift.status, 201);
    const voided = await api(parish.staff)
      .post('/donations')
      .send({ donorName: 'Voided Donor', donationType: 'Cash', amount: 999, donationDate: '2026-11-01' });
    await api(parish.admin).post(`/donations/${voided.body.id}/void`).send({ reason: 'Entered twice' });
    const cheque = await api(parish.admin)
      .post('/donations')
      .send({ donorName: 'Cheque Donor', donationType: 'Check', amount: 2000, donationDate: '2026-11-01' });
    assert.equal(cheque.status, 201);

    const intention = await api(parish.staff).post('/intentions/book').send({
      date: '2026-12-25',
      time: '6:00 AM',
      requesterName: 'Ofelia Test',
      intentionType: 'Thanksgiving',
      intentionText: 'For the family',
      offering: 150,
    });
    assert.equal(intention.status, 201, JSON.stringify(intention.body));
  });

  it('counts copies, reprints and spoiled copies for the whole office', async () => {
    const day = await summary(parish.staff);
    today = day.date;
    assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(day.certificates.issued, 2);
    assert.equal(day.certificates.reprinted, 1);
    assert.equal(day.certificates.spoiled, 1);
    const listed = day.certificates.copies.find((c) => c.id === staffCopy.id);
    assert.equal(listed.channel, 'walkin');
    assert.equal(listed.paid, true);
    assert.match(listed.receiptNumber, /^HA-/);
    assert.equal(day.certificates.copies.find((c) => c.id === adminCopy.id).status, 'spoiled');
  });

  it('adds up the money, links each certificate receipt to its copy and leaves voided gifts out', async () => {
    const day = await summary(parish.staff);
    const fees = day.receipts.filter((r) => r.kind === 'certificate');
    assert.equal(fees.length, 2);
    assert.ok(fees.some((r) => r.certificateCode === staffCopy.code));
    const feeTotal = fees.reduce((n, r) => n + r.amount, 0);

    assert.ok(!day.receipts.some((r) => r.name === 'Voided Donor'));
    assert.equal(day.money.cash, feeTotal + 500 + 150);
    assert.equal(day.money.other, 2000);
    assert.equal(day.money.gcash, 0);
    assert.equal(day.money.total, day.money.cash + day.money.other);
    assert.deepEqual(
      day.money.byKind.map((k) => [k.kind, k.count]),
      [['certificate', 2], ['intention', 1], ['donation', 2]]
    );
  });

  it('shows only what one staff member did when asked', async () => {
    const day = await summary(parish.admin, `?staffId=${parish.staff.id}`);
    assert.deepEqual(day.certificates.copies.map((c) => c.id), [staffCopy.id]);
    assert.equal(day.certificates.reprinted, 1);
    assert.equal(day.certificates.spoiled, 0);
    assert.ok(day.receipts.every((r) => r.by === 'Stef Staff'));
    assert.equal(day.money.other, 0);
  });

  it("shows each copy's receipt number on the record", async () => {
    const day = await summary(parish.staff);
    const listed = day.certificates.copies.find((c) => c.id === staffCopy.id);
    const recordId = listed.recordPath.split('/').pop();
    const record = await api(parish.staff).get(`/records/baptism/${recordId}`);
    const onRecord = record.body.record.certificates.find((c) => c.id === staffCopy.id);
    assert.equal(onRecord.receiptNumber, listed.receiptNumber);
  });

  it('flags printed copies nobody confirmed', async () => {
    const day = await summary(parish.staff);
    assert.ok(day.warnings.some((w) => w.kind === 'unconfirmed' && w.certificateId === staffCopy.id));
    await api(parish.staff).post(`/certificates/${staffCopy.id}/confirm-print`);
    const after = await summary(parish.staff);
    assert.ok(!after.warnings.some((w) => w.certificateId === staffCopy.id));
  });

  it('shows nothing for a quiet day', async () => {
    const day = await summary(parish.staff, '?date=2020-01-01');
    assert.equal(day.certificates.issued, 0);
    assert.equal(day.receipts.length, 0);
    assert.equal(day.money.total, 0);
  });

  it("keeps parishes apart and keeps parishioners out", async () => {
    const other = await createParish('Day other');
    const theirs = await summary(other.staff, `?date=${today}`);
    assert.equal(theirs.certificates.issued, 0);
    assert.equal(theirs.money.total, 0);
    assert.equal((await api(other.staff).get(`/reports/day?staffId=${parish.staff.id}`)).status, 404);
    assert.equal((await api(parish.parishioner).get('/reports/day')).status, 403);
  });
});
