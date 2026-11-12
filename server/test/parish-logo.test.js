// The parish logo: the parish admin uploads or removes it in Parish settings, and every screen that shows the
// parish (seal_url) picks it up from a public address.

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const { pool, api, createParish } = require('./helpers');

after(() => pool.end());

/** A small square image, with or without see-through parts. */
function image({ width = 800, alpha = true, format = 'png' } = {}) {
  const channels = alpha ? 4 : 3;
  const background = alpha ? { r: 22, g: 121, b: 140, alpha: 0.5 } : { r: 22, g: 121, b: 140 };
  return sharp({ create: { width, height: width, channels, background } })[format]().toBuffer();
}

describe('Parish logo', () => {
  let parish;

  before(async () => {
    parish = await createParish('Logo Upload');
  });

  async function sealUrl() {
    const res = await api().get('/parishes');
    return res.body.parishes.find((p) => p.id === parish.id).seal_url;
  }

  it('saves an upload, shrinks it, keeps transparency and serves it publicly', async () => {
    const res = await api(parish.admin)
      .put('/parish/settings/logo')
      .set('Content-Type', 'image/png')
      .send(await image());
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.match(res.body.sealUrl, new RegExp(`^/parishes/${parish.id}/logo\\?v=\\d+$`));
    assert.equal(await sealUrl(), res.body.sealUrl);

    const served = await api().get(res.body.sealUrl).buffer(true).parse((r, cb) => {
      const chunks = [];
      r.on('data', (c) => chunks.push(c));
      r.on('end', () => cb(null, Buffer.concat(chunks)));
    });
    assert.equal(served.status, 200);
    assert.equal(served.headers['content-type'], 'image/png');
    const meta = await sharp(served.body).metadata();
    assert.equal(meta.width, 512);
    assert.equal(meta.hasAlpha, true);

    const profile = await api(parish.admin).get('/parish/settings/profile');
    assert.equal(profile.body.profile.sealUrl, res.body.sealUrl);

    const audit = await pool.query(`SELECT 1 FROM audit_log WHERE parish_id = $1 AND action = 'parish.logo_changed'`, [parish.id]);
    assert.equal(audit.rowCount, 1);
  });

  it('gives a new address for every upload, and keeps a photo without transparency as JPEG', async () => {
    const before = await sealUrl();
    const res = await api(parish.admin)
      .put('/parish/settings/logo')
      .set('Content-Type', 'image/jpeg')
      .send(await image({ width: 300, alpha: false, format: 'jpeg' }));
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.notEqual(res.body.sealUrl, before);
    const served = await api().get(res.body.sealUrl);
    assert.equal(served.headers['content-type'], 'image/jpeg');
  });

  it('refuses files that are not images and staff accounts', async () => {
    const notImage = await api(parish.admin)
      .put('/parish/settings/logo')
      .set('Content-Type', 'image/png')
      .send(Buffer.from('not really a png'));
    assert.equal(notImage.status, 400);

    const staff = await api(parish.staff)
      .put('/parish/settings/logo')
      .set('Content-Type', 'image/png')
      .send(await image());
    assert.equal(staff.status, 403);
  });

  it('removes the logo everywhere', async () => {
    const res = await api(parish.admin).delete('/parish/settings/logo');
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(await sealUrl(), null);
    const gone = await api().get(`/parishes/${parish.id}/logo`);
    assert.equal(gone.status, 404);
    const profile = await api(parish.admin).get('/parish/settings/profile');
    assert.equal(profile.body.profile.sealUrl, undefined);
  });
});
