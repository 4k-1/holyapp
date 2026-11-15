// The signatory's signature on certificates: uploaded or removed by the parish admin in Settings -> Certificates.
//
//   PUT    /parish/settings/certificates/signature?types=baptism,confirmation  (body: the image, image/*)
//   DELETE /parish/settings/certificates/signature?types=baptism
//   → { certificates } (the same shape as GET /parish/settings/certificates)
//
// A photo of a signature on paper is turned into ink on a see-through background, so it sits on the
// certificate's signature line. It is sent only as a data URL inside signed-in responses, never from a
// public address, so it can't be picked up and pasted elsewhere by anyone who knows the parish id.
const sharp = require('sharp');
const pool = require('../config/db');
const { writeAudit } = require('../utils/audit');

const SACRAMENTS = ['baptism', 'confirmation', 'marriage', 'death'];
const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp']);
const MAX_BYTES = 8 * 1024 * 1024;
const WORK_SIDE = 1600; // px; enough detail to find the ink in a phone photo
const MAX_WIDTH = 900; // px; prints about 50-70 mm wide
const MAX_HEIGHT = 320;

function fail(res, status, error) {
  return res.status(status).json({ error });
}

function typesFrom(req) {
  const raw = String(req.query.types || '').split(',').map((t) => t.trim()).filter(Boolean);
  const types = [...new Set(raw)];
  if (types.length === 0 || types.some((t) => !SACRAMENTS.includes(t))) return null;
  return types;
}

function percentile(sorted, p) {
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)))];
}

/**
 * Paper becomes transparent and the ink becomes one even colour (its own average, so blue ink stays blue).
 * Returns a PNG buffer, or null when there is no ink to find (a blank page, a photo of something else).
 */
async function cleanSignature(buffer) {
  const meta = await sharp(buffer).metadata();
  if (!ACCEPTED_FORMATS.has(meta.format)) return { error: 'Use a PNG, JPG or WebP image.' };

  const { data, info } = await sharp(buffer)
    .rotate()
    .resize({ width: WORK_SIDE, height: WORK_SIDE, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = info.width * info.height;
  const light = new Float32Array(pixels);
  for (let i = 0; i < pixels; i += 1) {
    light[i] = 0.299 * data[i * 3] + 0.587 * data[i * 3 + 1] + 0.114 * data[i * 3 + 2];
  }
  const sorted = Float32Array.from(light).sort();
  const paper = percentile(sorted, 0.6); // most of a signature photo is paper
  const ink = percentile(sorted, 0.005);
  if (paper - ink < 45) return null;

  // Anything a little darker than the paper starts to show; the darkest strokes are fully solid.
  const start = paper - (paper - ink) * 0.18;
  const solid = ink + (paper - ink) * 0.35;
  const alpha = new Uint8Array(pixels);
  let inkR = 0;
  let inkG = 0;
  let inkB = 0;
  let inkWeight = 0;
  let inked = 0;
  for (let i = 0; i < pixels; i += 1) {
    const a = Math.max(0, Math.min(1, (start - light[i]) / (start - solid)));
    alpha[i] = Math.round(a * 255);
    if (a > 0.6) {
      inkR += data[i * 3] * a;
      inkG += data[i * 3 + 1] * a;
      inkB += data[i * 3 + 2] * a;
      inkWeight += a;
      inked += 1;
    }
  }
  // A signature covers a small part of the page; nothing, or most of it, means this isn't one.
  if (inked < pixels * 0.0005 || inked > pixels * 0.35) return null;

  // The average ink colour, darkened so a pale ballpen still prints clearly.
  const darken = (v) => Math.round((v / inkWeight) * 0.55);
  const [r, g, b] = [darken(inkR), darken(inkG), darken(inkB)];
  const rgba = Buffer.alloc(pixels * 4);
  for (let i = 0; i < pixels; i += 1) {
    rgba[i * 4] = r;
    rgba[i * 4 + 1] = g;
    rgba[i * 4 + 2] = b;
    rgba[i * 4 + 3] = alpha[i];
  }

  const raw = { raw: { width: info.width, height: info.height, channels: 4 } };
  let image = sharp(rgba, raw);
  try {
    const trimmed = await image.trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 10 }).toBuffer({ resolveWithObject: true });
    image = sharp(trimmed.data, { raw: { width: trimmed.info.width, height: trimmed.info.height, channels: 4 } });
  } catch {
    // Nothing to trim: keep the whole picture.
  }
  return {
    png: await image
      .resize({ width: MAX_WIDTH, height: MAX_HEIGHT, fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 9, palette: true, colours: 64 })
      .toBuffer(),
  };
}

const toDataUrl = (image) => (image ? `data:image/png;base64,${Buffer.from(image).toString('base64')}` : null);

async function uploadSignature(req, res, next) {
  const types = typesFrom(req);
  if (!types) return fail(res, 400, 'Say which certificates this signature is for.');
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) return fail(res, 400, 'Choose a photo of the signature.');
  if (req.body.length > MAX_BYTES) return fail(res, 400, 'That image is over 8 MB. Choose a smaller one.');

  let result;
  try {
    result = await cleanSignature(req.body);
  } catch {
    return fail(res, 400, "That file isn't an image we can read.");
  }
  if (!result) {
    return fail(res, 400, "We couldn't find a signature in that photo. Sign on plain white paper and take the photo straight on, close up.");
  }
  if (result.error) return fail(res, 400, result.error);

  try {
    await pool.query(
      `UPDATE certificate_configuration
       SET signature_image = $1, signature_updated_at = NOW(), updated_by = $2, updated_at = NOW()
       WHERE parish_id = $3 AND certificate_type = ANY($4::text[])`,
      [result.png, req.user.id, req.parishId, types]
    );
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'parish.certificate_signature_changed',
      entityType: 'certificate_configuration',
      entityId: req.parishId,
      metadata: { types, bytes: result.png.length },
    });
    return next();
  } catch (err) {
    console.error('uploadSignature failed:', err);
    return fail(res, 500, "Couldn't save the signature.");
  }
}

async function removeSignature(req, res, next) {
  const types = typesFrom(req);
  if (!types) return fail(res, 400, 'Say which certificates to remove the signature from.');
  try {
    await pool.query(
      `UPDATE certificate_configuration
       SET signature_image = NULL, signature_updated_at = NOW(), updated_by = $1, updated_at = NOW()
       WHERE parish_id = $2 AND certificate_type = ANY($3::text[])`,
      [req.user.id, req.parishId, types]
    );
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'parish.certificate_signature_removed',
      entityType: 'certificate_configuration',
      entityId: req.parishId,
      metadata: { types },
    });
    return next();
  } catch (err) {
    console.error('removeSignature failed:', err);
    return fail(res, 500, "Couldn't remove the signature.");
  }
}

module.exports = { uploadSignature, removeSignature, cleanSignature, toDataUrl, MAX_BYTES };
