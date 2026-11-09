// Numbered certificate copies and the reprint log.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, api, createParish, createBaptism } = require('./helpers');

after(() => pool.end());

async function issue(user, record) {
  const res = await api(user).post(`/records/baptism/${record.id}/certificates`);
  assert.equal(res.status, 201);
  return res.body.certificates.find((c) => c.status === 'Valid');
}

describe('Certificate numbers', () => {
  let parish;

  before(async () => {
    parish = await createParish('Copies');
  });

  it('numbers copies BAP-<year>-000001 upward, per parish', async () => {
    const year = (await pool.query("SELECT reference_year((NOW() AT TIME ZONE 'UTC')::timestamp) AS y")).rows[0].y;
    const first = await issue(parish.staff, await createBaptism(parish.staff));
    const second = await issue(parish.staff, await createBaptism(parish.staff, { firstName: 'Second' }));
    assert.equal(first.code, `BAP-${year}-000001`);
    assert.equal(second.code, `BAP-${year}-000002`);

    const other = await createParish('Copies other');
    const theirs = await issue(other.staff, await createBaptism(other.staff));
    assert.equal(theirs.code, `BAP-${year}-000001`, 'another parish counts from 1');
  });

  it('never gives two copies the same number, even when issued at once', async () => {
    const fresh = await createParish('Copies at once');
    const records = await Promise.all(
      Array.from({ length: 6 }, (_, i) => createBaptism(fresh.staff, { firstName: `Same${i}` }))
    );
    const codes = (await Promise.all(records.map((r) => issue(fresh.staff, r)))).map((c) => c.code).sort();
    assert.equal(new Set(codes).size, 6);
    assert.deepEqual(
      codes.map((c) => Number(c.slice(-6))),
      [1, 2, 3, 4, 5, 6],
      'no gaps'
    );
  });

  it("uses the parish's prefix, and keeps counting when the prefix changes", async () => {
    const fresh = await createParish('Copies prefix');
    const before = await issue(fresh.staff, await createBaptism(fresh.staff));
    await pool.query(
      `INSERT INTO certificate_configuration (parish_id, certificate_type, updated_by, numbering_prefix)
       VALUES ($1, 'baptism', $2, 'BPT')`,
      [fresh.id, fresh.admin.id]
    );
    const after = await issue(fresh.staff, await createBaptism(fresh.staff, { firstName: 'Prefix' }));
    assert.match(before.code, /^BAP-\d{4}-000001$/);
    assert.match(after.code, /^BPT-\d{4}-000002$/);
  });
});

describe('Reprints', () => {
  let parish;
  let copy;

  before(async () => {
    parish = await createParish('Reprints');
    copy = await issue(parish.staff, await createBaptism(parish.staff));
  });

  it('logs a reprint with who and why, keeping the same copy and number', async () => {
    const res = await api(parish.staff).post(`/certificates/${copy.id}/reprints`).send({ reason: 'paper_jam' });
    assert.equal(res.status, 201);
    assert.equal(res.body.reprints, 1);
    assert.equal(res.body.certificate.certCode, copy.code);

    const log = await pool.query('SELECT reason, printed_by FROM certificate_reprint WHERE certificate_id = $1', [copy.id]);
    assert.deepEqual(log.rows, [{ reason: 'paper_jam', printed_by: parish.staff.id }]);
    const copies = await pool.query('SELECT count(*)::int AS n FROM certificate WHERE parish_id = $1', [parish.id]);
    assert.equal(copies.rows[0].n, 1, 'a reprint is not a new copy');
    const audit = await pool.query(
      "SELECT count(*)::int AS n FROM audit_log WHERE entity_id = $1 AND action = 'certificate.reprinted'",
      [copy.id]
    );
    assert.equal(audit.rows[0].n, 1);
  });

  it('needs a reason, and a note when the reason is "other"', async () => {
    const none = await api(parish.staff).post(`/certificates/${copy.id}/reprints`).send({});
    assert.equal(none.status, 400);
    const bare = await api(parish.staff).post(`/certificates/${copy.id}/reprints`).send({ reason: 'other' });
    assert.equal(bare.status, 400);
    const noted = await api(parish.staff)
      .post(`/certificates/${copy.id}/reprints`)
      .send({ reason: 'other', note: 'Parishioner spilled water on it' });
    assert.equal(noted.status, 201);
    assert.equal(noted.body.reprints, 2);
  });

  it('shows the reprint count on the record', async () => {
    const recordId = (await pool.query('SELECT record_id FROM certificate WHERE id = $1', [copy.id])).rows[0].record_id;
    const record = await api(parish.staff).get(`/records/baptism/${recordId}`);
    assert.equal(record.status, 200);
    const listed = record.body.record.certificates.find((c) => c.id === copy.id);
    assert.equal(listed.reprints, 2);
  });

  it('refuses to reprint a superseded copy', async () => {
    const recordId = (await pool.query('SELECT record_id FROM certificate WHERE id = $1', [copy.id])).rows[0].record_id;
    await issue(parish.staff, { id: recordId });
    const res = await api(parish.staff).post(`/certificates/${copy.id}/reprints`).send({ reason: 'paper_jam' });
    assert.equal(res.status, 400);
  });

  it("can't reach another parish's copy, and parishioners can't reprint", async () => {
    const other = await createParish('Reprints other');
    const theirs = await issue(other.staff, await createBaptism(other.staff));
    const res = await api(parish.staff).post(`/certificates/${theirs.id}/reprints`).send({ reason: 'paper_jam' });
    assert.equal(res.status, 404);
    const view = await api(parish.staff).get(`/certificates/${theirs.id}`);
    assert.equal(view.status, 404);
    const parishioner = await api(other.parishioner).post(`/certificates/${theirs.id}/reprints`).send({ reason: 'paper_jam' });
    assert.equal(parishioner.status, 403);
  });

  it('returns a copy as it was issued, even after the record changes', async () => {
    const record = await createBaptism(parish.staff, { firstName: 'Snapshot' });
    const issued = await issue(parish.staff, record);
    await pool.query("UPDATE baptism SET first_name = 'Changed' WHERE id = $1", [record.id]);
    const res = await api(parish.staff).get(`/certificates/${issued.id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.certificate.certCode, issued.code);
    assert.match(JSON.stringify(res.body.certificate.fields.printed), /Snapshot/);
    assert.doesNotMatch(JSON.stringify(res.body.certificate.fields.printed), /Changed/);
  });

  it('counts issued copies and reprints apart in the report', async () => {
    const res = await api(parish.admin).get('/reports/certificates');
    assert.equal(res.status, 200);
    const issued = res.body.rows.reduce((n, r) => n + r.issued, 0);
    const reprinted = res.body.rows.reduce((n, r) => n + r.reprinted, 0);
    assert.equal(issued, 3);
    assert.equal(reprinted, 2);
  });
});
