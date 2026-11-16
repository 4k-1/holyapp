// The church photo: uploaded or removed by the parish admin in Parish settings, shown at the top of the
// parishioner dashboard. Served publicly, like the logo.
//
//   PUT    /parish/settings/photo   (body: the image, Content-Type image/*)  → { photoUrl }
//   DELETE /parish/settings/photo                                           → { photoUrl: null }
//   GET    /parishes/:parishId/photo                                        → the image
//
// The image lives in parish.photo_image (migration 045). Its address carries photo_updated_at as a version.
const sharp = require('sharp');
const pool = require('../config/db');
const { writeAudit } = require('../utils/audit');

const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp', 'heif']);
const MAX_BYTES = 10 * 1024 * 1024; // phone photos are often 4–8 MB
const MAX_WIDTH = 1600; // px; the dashboard shows it at most about 520 px wide, at up to 3× on phones
const MAX_HEIGHT = 1200;

/** SQL for the photo's address, or NULL without a photo. Used wherever a parish is read. */
const PHOTO_URL_SQL = `CASE WHEN photo_type IS NOT NULL
  THEN '/parishes/' || id || '/photo?v=' || FLOOR(EXTRACT(EPOCH FROM photo_updated_at) * 1000)::bigint END`;

const isUuid = (v) => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v);

function fail(res, status, error) {
  return res.status(status).json({ error });
}

/** Upright, at most MAX_WIDTH × MAX_HEIGHT, as a JPEG (a photo has no see-through parts to keep). */
async function preparePhoto(buffer) {
  const meta = await sharp(buffer).metadata();
  if (!ACCEPTED_FORMATS.has(meta.format)) return null;
  const data = await sharp(buffer)
    .rotate()
    .resize({ width: MAX_WIDTH, height: MAX_HEIGHT, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
  return { data, type: 'image/jpeg' };
}

async function uploadPhoto(req, res) {
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) return fail(res, 400, 'Choose a photo of your church.');
  if (req.body.length > MAX_BYTES) return fail(res, 400, 'That photo is over 10 MB. Choose a smaller one.');

  let photo;
  try {
    photo = await preparePhoto(req.body);
  } catch {
    return fail(res, 400, "That file isn't a photo we can read.");
  }
  if (!photo) return fail(res, 400, 'Use a JPG, PNG or WebP photo.');

  try {
    const { rows } = await pool.query(
      `UPDATE parish
       SET photo_image = $1, photo_type = $2, photo_updated_at = clock_timestamp(), updated_at = NOW()
       WHERE id = $3
       RETURNING ${PHOTO_URL_SQL} AS photo_url`,
      [photo.data, photo.type, req.parishId]
    );
    if (rows.length === 0) return fail(res, 404, 'Parish not found.');
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'parish.photo_changed',
      entityType: 'parish',
      entityId: req.parishId,
      metadata: { bytes: photo.data.length },
    });
    res.json({ photoUrl: rows[0].photo_url });
  } catch (err) {
    console.error('uploadPhoto failed:', err);
    fail(res, 500, "Couldn't save the photo.");
  }
}

async function removePhoto(req, res) {
  try {
    const { rowCount } = await pool.query(
      `UPDATE parish
       SET photo_image = NULL, photo_type = NULL, photo_updated_at = NULL, updated_at = NOW()
       WHERE id = $1`,
      [req.parishId]
    );
    if (rowCount === 0) return fail(res, 404, 'Parish not found.');
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'parish.photo_removed',
      entityType: 'parish',
      entityId: req.parishId,
    });
    res.json({ photoUrl: null });
  } catch (err) {
    console.error('removePhoto failed:', err);
    fail(res, 500, "Couldn't remove the photo.");
  }
}

async function getPhoto(req, res) {
  if (!isUuid(req.params.parishId)) return fail(res, 404, 'No photo.');
  try {
    const { rows } = await pool.query(
      'SELECT photo_image, photo_type FROM parish WHERE id = $1 AND photo_type IS NOT NULL',
      [req.params.parishId]
    );
    if (rows.length === 0) return fail(res, 404, 'No photo.');
    res.set('Content-Type', rows[0].photo_type);
    // The address carries a version, so a new photo is a new address and this one never changes.
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(rows[0].photo_image);
  } catch (err) {
    console.error('getPhoto failed:', err);
    fail(res, 500, "Couldn't load the photo.");
  }
}

module.exports = { uploadPhoto, removePhoto, getPhoto, PHOTO_URL_SQL, MAX_BYTES };
