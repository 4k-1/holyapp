// The parish logo: uploaded or removed by the parish admin in Parish settings, served publicly because the
// sign-in page, the certificate check page and printed certificates all show it.
//
//   PUT    /parish/settings/logo   (body: the image, Content-Type image/*)  → { sealUrl }
//   DELETE /parish/settings/logo                                           → { sealUrl: null }
//   GET    /parishes/:parishId/logo                                        → the image
//
// The image lives in parish.logo_image; parish.seal_url, which every screen already reads, points at it with a
// version (?v=) that changes on every upload, so the image itself can be cached for good.
const sharp = require('sharp');
const pool = require('../config/db');
const { writeAudit } = require('../utils/audit');

const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp']);
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_SIDE = 512; // px; sharp in the top bar and on a printed certificate

const isUuid = (v) => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v);

function fail(res, status, error) {
  return res.status(status).json({ error });
}

/** Upright, at most MAX_SIDE square; PNG when it has see-through parts (most crests), JPEG otherwise. */
async function prepareLogo(buffer) {
  const meta = await sharp(buffer).metadata();
  if (!ACCEPTED_FORMATS.has(meta.format)) return null;
  const resized = sharp(buffer)
    .rotate()
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true });
  if (meta.hasAlpha) {
    return { data: await resized.png({ compressionLevel: 9 }).toBuffer(), type: 'image/png' };
  }
  return { data: await resized.jpeg({ quality: 90 }).toBuffer(), type: 'image/jpeg' };
}

async function uploadLogo(req, res) {
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) return fail(res, 400, 'Choose an image of your logo.');
  if (req.body.length > MAX_BYTES) return fail(res, 400, 'That image is over 5 MB. Choose a smaller one.');

  let logo;
  try {
    logo = await prepareLogo(req.body);
  } catch {
    return fail(res, 400, "That file isn't an image we can read.");
  }
  if (!logo) return fail(res, 400, 'Use a PNG, JPG or WebP image.');

  try {
    const { rows } = await pool.query(
      `UPDATE parish
       SET logo_image = $1, logo_type = $2, logo_updated_at = NOW(),
           seal_url = '/parishes/' || id || '/logo?v=' || FLOOR(EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::bigint,
           updated_at = NOW()
       WHERE id = $3
       RETURNING seal_url`,
      [logo.data, logo.type, req.parishId]
    );
    if (rows.length === 0) return fail(res, 404, 'Parish not found.');
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'parish.logo_changed',
      entityType: 'parish',
      entityId: req.parishId,
      metadata: { type: logo.type, bytes: logo.data.length },
    });
    res.json({ sealUrl: rows[0].seal_url });
  } catch (err) {
    console.error('uploadLogo failed:', err);
    fail(res, 500, "Couldn't save the logo.");
  }
}

async function removeLogo(req, res) {
  try {
    const { rowCount } = await pool.query(
      `UPDATE parish
       SET logo_image = NULL, logo_type = NULL, logo_updated_at = NOW(), seal_url = NULL, updated_at = NOW()
       WHERE id = $1`,
      [req.parishId]
    );
    if (rowCount === 0) return fail(res, 404, 'Parish not found.');
    // The older settings field is a fallback for seal_url, so clear it too or the old logo would come back.
    await pool.query('UPDATE parish_settings SET logo_url = NULL WHERE parish_id = $1', [req.parishId]);
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'parish.logo_removed',
      entityType: 'parish',
      entityId: req.parishId,
    });
    res.json({ sealUrl: null });
  } catch (err) {
    console.error('removeLogo failed:', err);
    fail(res, 500, "Couldn't remove the logo.");
  }
}

async function getLogo(req, res) {
  if (!isUuid(req.params.parishId)) return fail(res, 404, 'No logo.');
  try {
    const { rows } = await pool.query(
      'SELECT logo_image, logo_type FROM parish WHERE id = $1 AND logo_image IS NOT NULL',
      [req.params.parishId]
    );
    if (rows.length === 0) return fail(res, 404, 'No logo.');
    res.set('Content-Type', rows[0].logo_type);
    // The address carries a version, so a new logo is a new address and this one never changes.
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(rows[0].logo_image);
  } catch (err) {
    console.error('getLogo failed:', err);
    fail(res, 500, "Couldn't load the logo.");
  }
}

module.exports = { uploadLogo, removeLogo, getLogo, MAX_BYTES };
