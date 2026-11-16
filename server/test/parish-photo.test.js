// The church photo: the parish admin uploads or removes it in Parish settings, and the parishioner dashboard
// shows it from a public address (photo_url on GET /parishes).

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const { pool, api, createParish } = require('./helpers');

after(() => pool.end());

function photo({ width = 3000, height = 2000, format = 'jpeg' } = {}) {
  return sharp({ create: { width, height, channels: 3, background: { r: 120, g: 110, b: 90 } } })[format]().toBuffer();
}

function binary(res, cb) {
  const chunks = [];
  res.on('data', (c) => chunks.push(c));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
}

describe('Church photo', () => {
  let parish;

  before(async () => {
    parish = await createParish('Church Photo');
  });

  async function listedPhotoUrl() {
    const res = await api().get('/parishes');
    return res.body.parishes.find((p) => p.id === parish.id).photo_url;
  }

  it('has no photo until one is uploaded', async () => {
    assert.equal(await listedPhotoUrl(), null);
    const res = await api().get(`/parishes/${parish.id}/photo`);
    assert.equal(res.status, 404);
  });

  it('saves an upload, shrinks it to a JPEG and serves it publicly', async () => {
    const res = await api(parish.admin)
      .put('/parish/settings/photo')
      .set('Content-Type', 'image/png')
      .send(await photo({ format: 'png' }));
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.match(res.body.photoUrl, new RegExp(`^/parishes/${parish.id}/photo\\?v=\\d+$`));
    assert.equal(await listedPhotoUrl(), res.body.photoUrl);

    const served = await api().get(res.body.photoUrl).buffer(true).parse(binary);
    assert.equal(served.status, 200);
    assert.equal(served.headers['content-type'], 'image/jpeg');
    assert.match(served.headers['cache-control'], /immutable/);
    const meta = await sharp(served.body).metadata();
    assert.equal(meta.width, 1600);
    assert.equal(meta.height, 1067);

    const profile = await api(parish.admin).get('/parish/settings/profile');
    assert.equal(profile.body.profile.photoUrl, res.body.photoUrl);
    const audit = await pool.query(`SELECT 1 FROM audit_log WHERE parish_id = $1 AND action = 'parish.photo_changed'`, [parish.id]);
    assert.equal(audit.rowCount, 1);
  });

  it('gives a new address for every upload, and keeps it after a profile save', async () => {
    const first = await listedPhotoUrl();
    const res = await api(parish.admin).put('/parish/settings/photo').set('Content-Type', 'image/jpeg').send(await photo());
    assert.equal(res.status, 200);
    assert.notEqual(res.body.photoUrl, first);

    const profile = (await api(parish.admin).get('/parish/settings/profile')).body.profile;
    const saved = await api(parish.admin).patch('/parish/settings/profile').send(profile);
    assert.equal(saved.status, 200, JSON.stringify(saved.body));
    assert.equal(saved.body.profile.photoUrl, res.body.photoUrl);
  });

  it('refuses files that are not photos, and staff and parishioners', async () => {
    const notImage = await api(parish.admin).put('/parish/settings/photo').set('Content-Type', 'image/png').send(Buffer.from('hello'));
    assert.equal(notImage.status, 400);
    for (const who of [parish.staff, parish.parishioner]) {
      const res = await api(who).put('/parish/settings/photo').set('Content-Type', 'image/jpeg').send(await photo());
      assert.equal(res.status, 403);
    }
  });

  it('removes the photo, so the portal falls back to its default', async () => {
    const res = await api(parish.admin).delete('/parish/settings/photo');
    assert.equal(res.status, 200);
    assert.equal(await listedPhotoUrl(), null);
    assert.equal((await api().get(`/parishes/${parish.id}/photo`)).status, 404);
  });
});
