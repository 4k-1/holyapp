// Issuing a certificate at the office (walk-in) from a register entry.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish, createBaptism } = require('./helpers');

describe('Walk-in certificate issuing', () => {
  let parish;

  before(async () => {
    parish = await createParish('Certificates');
    // A fee different from the built-in default (100), so the test shows the parish's own fee is used.
    await pool.query(
      `INSERT INTO service_fee (parish_id, service_name, amount, updated_by)
       VALUES ($1, 'Baptismal Certificate', 175, $2)`,
      [parish.id, parish.admin.id]
    );
  });

  after(() => pool.end());

  it('creates the request, the paid receipt and the certificate together', async () => {
    const record = await createBaptism(parish.staff);
    const res = await api(parish.staff).post(`/records/baptism/${record.id}/certificates`).send({ purpose: 'School enrollment' });
    assert.equal(res.status, 201);
    assert.equal(res.body.certificates.length, 1);

    const request = await pool.query(
      `SELECT id, request_type, status, certificate_id FROM certificate_request WHERE record_id = $1`,
      [record.id]
    );
    assert.equal(request.rows.length, 1);
    const req = request.rows[0];
    assert.equal(req.request_type, 'walkin');
    assert.equal(req.status, 'released');
    assert.ok(req.certificate_id, 'the request points at its certificate');

    const payment = await pool.query(
      'SELECT status, amount_due, receipt_number FROM payment WHERE certificate_request_id = $1',
      [req.id]
    );
    assert.equal(payment.rows.length, 1);
    assert.equal(payment.rows[0].status, 'paid');
    assert.ok(payment.rows[0].receipt_number, 'the payment has a receipt number');

    const cert = await pool.query('SELECT parish_id FROM certificate WHERE id = $1', [req.certificate_id]);
    assert.equal(cert.rows[0].parish_id, parish.id);
  });

  it("charges the parish's own fee", async () => {
    const record = await createBaptism(parish.staff, { firstName: 'Fee' });
    const res = await api(parish.staff).post(`/records/baptism/${record.id}/certificates`).send({ purpose: 'School enrollment' });
    assert.equal(res.status, 201);
    const payment = await pool.query(
      `SELECT p.amount_due FROM payment p
       JOIN certificate_request r ON r.id = p.certificate_request_id
       WHERE r.record_id = $1`,
      [record.id]
    );
    assert.equal(Number(payment.rows[0].amount_due), 175);
  });

  it('refuses to issue from an archived entry, and saves nothing', async () => {
    const record = await createBaptism(parish.staff, { firstName: 'Archived' });
    const archived = await api(parish.admin).post(`/records/baptism/${record.id}/archive`);
    assert.equal(archived.status, 200);

    const res = await api(parish.staff).post(`/records/baptism/${record.id}/certificates`).send({ purpose: 'School enrollment' });
    assert.equal(res.status, 400);
    const left = await pool.query('SELECT count(*)::int AS n FROM certificate_request WHERE record_id = $1', [
      record.id,
    ]);
    assert.equal(left.rows[0].n, 0);
  });

  it('keeps parishioners from issuing certificates', async () => {
    const record = await createBaptism(parish.staff, { firstName: 'Blocked' });
    const res = await api(parish.parishioner).post(`/records/baptism/${record.id}/certificates`).send({ purpose: 'School enrollment' });
    assert.equal(res.status, 403);
  });
});
