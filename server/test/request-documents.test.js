// Supporting documents on certificate requests: who can add, see and remove them, what is stored, and
// the 7-day cleanup after a request is finished.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const { pool, api, createParish, createBaptism } = require('./helpers');
const { signAccessToken } = require('../src/utils/tokens');
const { purgeFinishedRequestDocuments } = require('../src/utils/requestDocumentRetention');

after(() => pool.end());

/** A small JPEG photo carrying GPS location data, like one straight from a phone. */
async function phonePhoto(color = '#c8b48a') {
  return sharp({ create: { width: 640, height: 480, channels: 3, background: color } })
    .jpeg()
    .withExif({ IFD0: { Make: 'TestPhone' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '10/1 18/1 0/1' } })
    .toBuffer();
}

async function anotherParishioner(parishId) {
  const tag = Math.random().toString(16).slice(2, 10);
  const { rows } = await pool.query(
    `INSERT INTO app_user (parish_id, role, email, password_hash, status, first_name, last_name, email_verified_at)
     VALUES ($1, 'parishioner', $2, 'x', 'active', 'Other', 'Person', NOW())
     RETURNING id, parish_id, role, email`,
    [parishId, `other.${tag}@holyapp.test`]
  );
  return { ...rows[0], token: signAccessToken(rows[0]) };
}

const upload = (user, requestId, body, name = 'Lola%20baptism%20cert.jpg', type = 'image/jpeg') =>
  api(user).post(`/requests/${requestId}/documents`).set('Content-Type', type).set('X-File-Name', name).send(body);

describe('Supporting documents on certificate requests', () => {
  let parish;
  let other;
  let photo;

  before(async () => {
    parish = await createParish('Docs');
    other = await createParish('Elsewhere');
    photo = await phonePhoto();
  });

  async function newRequest(user = parish.parishioner) {
    const res = await api(user)
      .post('/requests')
      .send({
        sacramentType: 'baptism',
        deliveryMethod: 'pickup',
        purpose: 'School enrollment',
        relationship: 'Parent',
        sacramentDate: '2024-03-10',
        fields: { firstName: 'Juan', lastName: 'Dela Cruz', birthdate: '2024-01-15', birthplace: 'Cebu City' },
      });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    return res.body.id;
  }

  it('stores a photo re-saved without its location data, encrypted, with an encrypted name', async () => {
    const id = await newRequest();
    const res = await upload(parish.parishioner, id, photo);
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.document.name, 'Lola baptism cert.jpg');

    const stored = await pool.query('SELECT content, file_name FROM certificate_request_document WHERE id = $1', [
      res.body.document.id,
    ]);
    assert.equal(stored.rows[0].content.subarray(0, 4).toString(), 'HAF1', 'the stored bytes are encrypted');
    assert.ok(!stored.rows[0].content.includes(Buffer.from([0xff, 0xd8, 0xff])), 'no readable JPEG in the database');
    assert.ok(!stored.rows[0].file_name.includes('Lola'), 'the file name is not stored readable');

    const file = await api(parish.parishioner)
      .get(`/requests/${id}/documents/${res.body.document.id}`)
      .buffer(true)
      .parse((r, done) => {
        const chunks = [];
        r.on('data', (c) => chunks.push(c));
        r.on('end', () => done(null, Buffer.concat(chunks)));
      });
    assert.equal(file.status, 200);
    assert.equal(file.headers['content-type'], 'image/jpeg');
    assert.match(file.headers['cache-control'], /no-store/);
    const meta = await sharp(file.body).metadata();
    assert.equal(meta.format, 'jpeg');
    assert.equal(meta.exif, undefined, 'location and camera data are gone');

    const list = await api(parish.parishioner).get(`/requests/${id}/documents`);
    assert.equal(list.body.documents.length, 1);
    assert.equal(list.body.canChange, true);

    const mine = await api(parish.parishioner).get('/requests/mine');
    assert.equal(mine.body.requests.find((r) => r.id === id).documentCount, 1);
  });

  it('refuses files that are not photos', async () => {
    const id = await newRequest();
    const res = await upload(parish.parishioner, id, Buffer.from('%PDF-1.7 not a photo'), 'x.png', 'image/png');
    assert.equal(res.status, 400);
    const empty = await upload(parish.parishioner, id, Buffer.alloc(0));
    assert.equal(empty.status, 400);
  });

  it('lets only the requester and the office see them', async () => {
    const id = await newRequest();
    const doc = (await upload(parish.parishioner, id, photo)).body.document;
    const path = `/requests/${id}/documents/${doc.id}`;

    const stranger = await anotherParishioner(parish.id);
    assert.equal((await api(stranger).get(`/requests/${id}/documents`)).status, 404);
    assert.equal((await api(stranger).get(path)).status, 404);
    assert.equal((await upload(stranger, id, photo)).status, 404);
    assert.equal((await api(stranger).delete(path)).status, 404);

    assert.equal((await api(other.admin).get(path)).status, 404, 'another parish’s admin');
    assert.equal((await api(null).get(path)).status, 401);

    assert.equal((await api(parish.admin).get(path)).status, 200);
    const list = await api(parish.staff).get(`/requests/${id}/documents`);
    assert.equal(list.status, 200);
    assert.equal(list.body.canChange, false);

    await pool.query(`UPDATE app_user SET staff_access = $1 WHERE id = $2`, [
      JSON.stringify({ certificates: 'off' }),
      parish.staff.id,
    ]);
    assert.equal((await api(parish.staff).get(path)).status, 403, 'staff without Certificates access');
    await pool.query('UPDATE app_user SET staff_access = NULL WHERE id = $1', [parish.staff.id]);

    assert.equal((await upload(parish.admin, id, photo)).status, 403, 'the office cannot add documents');
    assert.equal((await api(parish.admin).delete(path)).status, 403, 'or remove them');
  });

  it('writes each office view to the audit log', async () => {
    const id = await newRequest();
    const doc = (await upload(parish.parishioner, id, photo)).body.document;
    await api(parish.parishioner).get(`/requests/${id}/documents/${doc.id}`);
    await api(parish.admin).get(`/requests/${id}/documents/${doc.id}`);
    const { rows } = await pool.query(
      `SELECT actor_id FROM audit_log WHERE action = 'certificate_request.document_viewed' AND entity_id = $1`,
      [id]
    );
    assert.deepEqual(
      rows.map((r) => r.actor_id),
      [parish.admin.id]
    );
  });

  it('allows up to 5 photos, and no changes once the office has started', async () => {
    const id = await newRequest();
    const ids = [];
    for (let i = 0; i < 5; i += 1) ids.push((await upload(parish.parishioner, id, photo)).body.document.id);
    assert.equal((await upload(parish.parishioner, id, photo)).status, 409);

    assert.equal((await api(parish.parishioner).delete(`/requests/${id}/documents/${ids[0]}`)).status, 200);

    const record = await createBaptism(parish.staff);
    assert.equal((await api(parish.staff).post(`/requests/${id}/link`).send({ recordId: record.id })).status, 200);
    assert.equal((await upload(parish.parishioner, id, photo)).status, 409);
    assert.equal((await api(parish.parishioner).delete(`/requests/${id}/documents/${ids[1]}`)).status, 409);
    const list = await api(parish.parishioner).get(`/requests/${id}/documents`);
    assert.equal(list.body.documents.length, 4);
    assert.equal(list.body.canChange, false);
  });

  it('deletes documents 7 days after a request is finished', async () => {
    const oldId = await newRequest();
    const recentId = await newRequest();
    const openId = await newRequest();
    for (const id of [oldId, recentId, openId]) await upload(parish.parishioner, id, photo);

    await pool.query(
      `UPDATE certificate_request SET status = 'rejected', updated_at = NOW() - INTERVAL '8 days' WHERE id = $1`,
      [oldId]
    );
    await pool.query(`UPDATE certificate_request SET status = 'released', updated_at = NOW() - INTERVAL '6 days' WHERE id = $1`, [
      recentId,
    ]);
    await pool.query(`UPDATE certificate_request SET updated_at = NOW() - INTERVAL '90 days' WHERE id = $1`, [openId]);

    assert.ok((await purgeFinishedRequestDocuments()) >= 1);
    const left = await pool.query(
      'SELECT request_id FROM certificate_request_document WHERE request_id = ANY($1::uuid[])',
      [[oldId, recentId, openId]]
    );
    assert.deepEqual(left.rows.map((r) => r.request_id).sort(), [recentId, openId].sort());
  });
});
