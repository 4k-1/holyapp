// Supporting documents on a certificate request: photos of an old certificate or a family record that help
// staff find the entry. Only the parishioner who made the request and office staff with Certificates access
// in the same parish can see them.
//
//   GET    /requests/:id/documents            → { documents: [...] }    the requester, or the office
//   POST   /requests/:id/documents            (body: the photo)          the requester, while the request is new
//   GET    /requests/:id/documents/:docId     → the photo (JPEG)         the requester, or the office
//   DELETE /requests/:id/documents/:docId                                the requester, while the request is new
//
// Each photo is re-saved as a JPEG (which drops location and camera data and anything hidden in the file),
// then encrypted before it is stored (migration 046). Office views are written to the audit log.
const sharp = require('sharp');
const pool = require('../config/db');
const { ROLES } = require('../constants/roles');
const { writeAudit } = require('../utils/audit');
const { canEncryptFiles, encryptBuffer, decryptBuffer } = require('../utils/fieldCrypto');

const MAX_DOCUMENTS = 5;
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_SIDE = 2400; // px; enough to read a certificate's handwriting when zoomed in
const MAX_INPUT_PIXELS = 60_000_000; // refuses "decompression bomb" images
const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp', 'heif']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(res, status, error) {
  return res.status(status).json({ error });
}

const isOffice = (req) => req.user.role === ROLES.PARISH_ADMIN || req.user.role === ROLES.PARISH_STAFF;

/** The file name as the parishioner's device gave it, without folders or odd characters. */
function cleanFileName(raw) {
  let name = '';
  try {
    name = decodeURIComponent(String(raw || ''));
  } catch {
    name = String(raw || '');
  }
  name = name.split(/[\\/]/).pop().replace(/[\u0000-\u001f\u007f<>"]/g, '').trim();
  return name.slice(0, 100) || 'Photo';
}

const sealName = (name) => encryptBuffer(Buffer.from(name, 'utf8')).toString('base64');

function openName(sealed) {
  try {
    return decryptBuffer(Buffer.from(sealed, 'base64')).toString('utf8');
  } catch {
    return 'Photo';
  }
}

/** Upright, at most MAX_SIDE on its longer side, re-saved as a JPEG. Null when it isn't a photo we take. */
async function preparePhoto(buffer) {
  const options = { limitInputPixels: MAX_INPUT_PIXELS };
  const meta = await sharp(buffer, options).metadata();
  if (!ACCEPTED_FORMATS.has(meta.format)) return null;
  const { data, info } = await sharp(buffer, options)
    .rotate()
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/**
 * The request, if this person may see its documents: the parishioner who made it, or anyone in the
 * office (the route already checked staff have Certificates access).
 */
async function findRequest(req, db = pool, lock = false) {
  if (!UUID.test(req.params.id || '')) return null;
  const params = [req.params.id, req.parishId];
  let owner = '';
  if (!isOffice(req)) {
    params.push(req.user.id);
    owner = ' AND requested_by = $3';
  }
  const { rows } = await db.query(
    `SELECT id, status, record_id, requested_by FROM certificate_request
     WHERE id = $1 AND parish_id = $2${owner}${lock ? ' FOR UPDATE' : ''}`,
    params
  );
  return rows[0] || null;
}

/** A parishioner can add or remove photos only until staff start working on the request. */
const stillNew = (request) => request.status === 'pending' && !request.record_id;

function toDocument(row) {
  return {
    id: row.id,
    name: openName(row.file_name),
    size: row.byte_size,
    width: row.width,
    height: row.height,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

/** Every document on a request, oldest first. */
async function documentsFor(requestId) {
  const { rows } = await pool.query(
    `SELECT id, file_name, byte_size, width, height, created_at
     FROM certificate_request_document WHERE request_id = $1 ORDER BY created_at, id`,
    [requestId]
  );
  return rows.map(toDocument);
}

async function listDocuments(req, res) {
  try {
    const request = await findRequest(req);
    if (!request) return fail(res, 404, 'Request not found.');
    res.set('Cache-Control', 'private, no-store');
    return res.json({ documents: await documentsFor(request.id), canChange: !isOffice(req) && stillNew(request) });
  } catch (err) {
    console.error('listDocuments failed:', err);
    return fail(res, 500, "Couldn't load the documents.");
  }
}

async function addDocument(req, res) {
  if (isOffice(req)) return fail(res, 403, 'Only the parishioner who made the request can add documents.');
  if (!canEncryptFiles()) {
    console.error('addDocument refused: DATA_ENCRYPTION_KEY is not set.');
    return fail(res, 503, "Uploads aren't available right now. Bring the documents to the parish office instead.");
  }
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) return fail(res, 400, 'Choose a photo to attach.');
  if (req.body.length > MAX_BYTES) return fail(res, 400, 'That photo is over 10 MB. Choose a smaller one.');

  let photo;
  try {
    photo = await preparePhoto(req.body);
  } catch {
    return fail(res, 400, "That file isn't a photo we can read. Use a JPG or PNG photo.");
  }
  if (!photo) return fail(res, 400, 'Use a JPG or PNG photo.');

  const name = cleanFileName(req.get('x-file-name'));
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const request = await findRequest(req, client, true);
    if (!request) {
      await client.query('ROLLBACK');
      return fail(res, 404, 'Request not found.');
    }
    if (!stillNew(request)) {
      await client.query('ROLLBACK');
      return fail(res, 409, 'The office has started on this request, so documents can no longer be added.');
    }
    const count = await client.query('SELECT COUNT(*)::int AS n FROM certificate_request_document WHERE request_id = $1', [
      request.id,
    ]);
    if (count.rows[0].n >= MAX_DOCUMENTS) {
      await client.query('ROLLBACK');
      return fail(res, 409, `A request can have up to ${MAX_DOCUMENTS} photos.`);
    }
    const { rows } = await client.query(
      `INSERT INTO certificate_request_document
         (request_id, parish_id, uploaded_by, file_name, content, byte_size, width, height)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, file_name, byte_size, width, height, created_at`,
      [request.id, req.parishId, req.user.id, sealName(name), encryptBuffer(photo.data), photo.data.length, photo.width, photo.height]
    );
    await client.query('COMMIT');
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'certificate_request.document_added',
      entityType: 'certificate_request',
      entityId: request.id,
      metadata: { documentId: rows[0].id, bytes: photo.data.length },
    });
    return res.status(201).json({ document: toDocument(rows[0]) });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('addDocument failed:', err);
    return fail(res, 500, "Couldn't save the photo.");
  } finally {
    client.release();
  }
}

async function getDocument(req, res) {
  if (!UUID.test(req.params.docId || '')) return fail(res, 404, 'Document not found.');
  try {
    const request = await findRequest(req);
    if (!request) return fail(res, 404, 'Document not found.');
    const { rows } = await pool.query(
      'SELECT id, content FROM certificate_request_document WHERE id = $1 AND request_id = $2',
      [req.params.docId, request.id]
    );
    if (rows.length === 0) return fail(res, 404, 'Document not found.');

    let image;
    try {
      image = decryptBuffer(rows[0].content);
    } catch (err) {
      console.error('getDocument could not decrypt:', err.message);
      return fail(res, 500, "Couldn't open this document.");
    }

    if (isOffice(req)) {
      await writeAudit({
        parishId: req.parishId,
        actorId: req.user.id,
        action: 'certificate_request.document_viewed',
        entityType: 'certificate_request',
        entityId: request.id,
        metadata: { documentId: rows[0].id },
      });
    }
    res.set('Content-Type', 'image/jpeg');
    res.set('Content-Disposition', 'inline; filename="supporting-document.jpg"');
    res.set('Cache-Control', 'private, no-store');
    return res.send(image);
  } catch (err) {
    console.error('getDocument failed:', err);
    return fail(res, 500, "Couldn't open this document.");
  }
}

async function removeDocument(req, res) {
  if (isOffice(req)) return fail(res, 403, 'Only the parishioner who made the request can remove documents.');
  if (!UUID.test(req.params.docId || '')) return fail(res, 404, 'Document not found.');
  try {
    const request = await findRequest(req);
    if (!request) return fail(res, 404, 'Document not found.');
    if (!stillNew(request)) {
      return fail(res, 409, 'The office has started on this request, so documents can no longer be removed.');
    }
    const { rowCount } = await pool.query(
      'DELETE FROM certificate_request_document WHERE id = $1 AND request_id = $2',
      [req.params.docId, request.id]
    );
    if (rowCount === 0) return fail(res, 404, 'Document not found.');
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'certificate_request.document_removed',
      entityType: 'certificate_request',
      entityId: request.id,
      metadata: { documentId: req.params.docId },
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error('removeDocument failed:', err);
    return fail(res, 500, "Couldn't remove the photo.");
  }
}

module.exports = { listDocuments, addDocument, getDocument, removeDocument, MAX_DOCUMENTS, MAX_BYTES };
