// Digitized Ledger: register books, their scanned pages, and reading a page so its rows can
// be saved as records.
//
//   1. Start a book            POST /ledgers/books
//   2. Upload its pages        POST /ledgers/books/:bookId/pages?pageNumber=N   (body: the photo)
//   3. Read a page             POST /ledgers/pages/:pageId/read  → rows to check and save
//
// Photos are kept in ledger_page (bytea), re-encoded as JPEG with a small thumbnail for the
// book's page grid. The last reading of each page is kept too, so it isn't paid for twice
// and so the ledger search can look through it.
const crypto = require('crypto');
const sharp = require('sharp');
const pool = require('../config/db');
const { writeAudit } = require('../utils/audit');
const { readRegisterPhoto, isReaderSetUp } = require('../services/ledgerOcr/readRegister');

const SACRAMENTS = ['baptism', 'confirmation', 'marriage', 'death'];
const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp', 'heif']);
const MAX_SIDE = 4000; //   px; enough to read handwriting, small enough to store
const THUMB_WIDTH = 480;

// Each read is a paid Gemini call, so one person can't run up the bill by accident.
const READS_PER_HOUR = Number(process.env.LEDGER_SCAN_READS_PER_HOUR || 40);
const HOUR = 60 * 60 * 1000;
const recentReads = new Map(); // userId → timestamps of reads in the last hour
const reading = new Set(); //     pageIds being read right now

const isUuid = (v) => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v);

function fail(res, status, error) {
  return res.status(status).json({ error });
}

function toBook(row) {
  return {
    id: row.id,
    parishId: row.parish_id,
    sacramentType: row.sacrament_type,
    title: row.title,
    volumeLabel: row.volume_label,
    yearStart: row.year_start,
    yearEnd: row.year_end,
    pageCount: Number(row.page_count || 0),
    status: Number(row.page_count || 0) > 0 ? 'ready' : 'scanning',
  };
}

function toPage(row) {
  return {
    id: row.id,
    parishId: row.parish_id,
    bookId: row.book_id,
    pageNumber: row.page_number,
    width: row.image_width,
    height: row.image_height,
    scannedAt: row.uploaded_at.toISOString().slice(0, 10),
    readAt: row.read_at ? row.read_at.toISOString() : null,
    recordCount: Number(row.record_count || 0),
  };
}

const BOOK_COLUMNS = `b.*, (SELECT COUNT(*) FROM ledger_page p WHERE p.book_id = b.id) AS page_count`;
const PAGE_COLUMNS = `p.id, p.parish_id, p.book_id, p.page_number, p.image_width, p.image_height,
  p.uploaded_at, p.read_at,
  (SELECT COUNT(*) FROM baptism r WHERE r.ledger_page_id = p.id AND r.archived_at IS NULL) AS record_count`;

async function findBook(parishId, bookId) {
  if (!isUuid(bookId)) return null;
  const { rows } = await pool.query(`SELECT ${BOOK_COLUMNS} FROM ledger_book b WHERE b.id = $1 AND b.parish_id = $2`, [
    bookId,
    parishId,
  ]);
  return rows[0] || null;
}

async function findPage(parishId, pageId, columns = PAGE_COLUMNS) {
  if (!isUuid(pageId)) return null;
  const { rows } = await pool.query(`SELECT ${columns} FROM ledger_page p WHERE p.id = $1 AND p.parish_id = $2`, [
    pageId,
    parishId,
  ]);
  return rows[0] || null;
}

// ---- Books ------------------------------------------------------------------------------

async function listBooks(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT ${BOOK_COLUMNS} FROM ledger_book b WHERE b.parish_id = $1 ORDER BY b.year_start DESC, b.volume_label`,
      [req.parishId],
    );
    res.json({ books: rows.map(toBook) });
  } catch (err) {
    console.error('listBooks failed:', err);
    fail(res, 500, "Couldn't load the register books.");
  }
}

async function getBook(req, res) {
  try {
    const row = await findBook(req.parishId, req.params.bookId);
    if (!row) return fail(res, 404, 'Book not found.');
    res.json({ book: toBook(row) });
  } catch (err) {
    console.error('getBook failed:', err);
    fail(res, 500, "Couldn't load this book.");
  }
}

async function createBook(req, res) {
  const body = req.body || {};
  const sacramentType = body.sacramentType;
  const volumeLabel = String(body.volumeLabel || '').trim();
  const title = String(body.title || '').trim();
  const yearStart = Number(body.yearStart);
  const yearEnd = body.yearEnd === undefined || body.yearEnd === '' ? yearStart : Number(body.yearEnd);

  if (!SACRAMENTS.includes(sacramentType)) return fail(res, 400, 'Choose which register this is.');
  if (!volumeLabel) return fail(res, 400, 'Enter the book label, e.g. Book 7.');
  if (volumeLabel.length > 60 || title.length > 200) return fail(res, 400, 'The book label is too long.');
  const validYear = (y) => Number.isInteger(y) && y >= 1500 && y <= 2100;
  if (!validYear(yearStart) || !validYear(yearEnd)) return fail(res, 400, 'Enter the years as four digits, e.g. 2006.');

  try {
    const { rows } = await pool.query(
      `INSERT INTO ledger_book (parish_id, sacrament_type, title, volume_label, year_start, year_end, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *, 0 AS page_count`,
      [
        req.parishId,
        sacramentType,
        title || volumeLabel,
        volumeLabel,
        Math.min(yearStart, yearEnd),
        Math.max(yearStart, yearEnd),
        req.user.id,
      ],
    );
    const book = toBook(rows[0]);
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'ledger_book.created',
      entityType: 'ledger_book',
      entityId: book.id,
      metadata: { sacramentType, volumeLabel },
    });
    res.status(201).json({ book });
  } catch (err) {
    if (err.code === '23505')
      return fail(res, 409, `There is already a ${sacramentType} register called ${volumeLabel}.`);
    console.error('createBook failed:', err);
    fail(res, 500, "Couldn't start this book.");
  }
}

// ---- Pages ------------------------------------------------------------------------------

async function listPages(req, res) {
  try {
    const book = await findBook(req.parishId, req.params.bookId);
    if (!book) return fail(res, 404, 'Book not found.');
    const { rows } = await pool.query(
      `SELECT ${PAGE_COLUMNS} FROM ledger_page p WHERE p.book_id = $1 ORDER BY p.page_number`,
      [book.id],
    );
    res.json({ pages: rows.map(toPage) });
  } catch (err) {
    console.error('listPages failed:', err);
    fail(res, 500, "Couldn't load the pages.");
  }
}

// POST /ledgers/books/:bookId/pages?pageNumber=N   (body: the photo, Content-Type image/*)
async function uploadPage(req, res) {
  const pageNumber = Number(req.query.pageNumber);
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > 99999) {
    return fail(res, 400, 'Enter the page number written in the book.');
  }
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) return fail(res, 400, 'Choose a photo of the page.');

  let image;
  let thumbnail;
  let size;
  try {
    const meta = await sharp(req.body).metadata();
    if (!ACCEPTED_FORMATS.has(meta.format)) return fail(res, 400, 'Use a JPEG, PNG, WebP or HEIC photo.');
    // Upright, at most MAX_SIDE on its longer side, as JPEG.
    const out = await sharp(req.body)
      .rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 88 })
      .toBuffer({ resolveWithObject: true });
    image = out.data;
    size = { width: out.info.width, height: out.info.height };
    thumbnail = await sharp(image).resize({ width: THUMB_WIDTH }).jpeg({ quality: 75 }).toBuffer();
  } catch {
    return fail(res, 400, "That file isn't a photo we can read.");
  }

  try {
    const book = await findBook(req.parishId, req.params.bookId);
    if (!book) return fail(res, 404, 'Book not found.');
    const { rows } = await pool.query(
      `INSERT INTO ledger_page (parish_id, book_id, page_number, image, image_type, image_width, image_height, thumbnail, uploaded_by)
       VALUES ($1, $2, $3, $4, 'image/jpeg', $5, $6, $7, $8)
       RETURNING id, parish_id, book_id, page_number, image_width, image_height, uploaded_at, read_at, 0 AS record_count`,
      [req.parishId, book.id, pageNumber, image, size.width, size.height, thumbnail, req.user.id],
    );
    await pool.query('UPDATE ledger_book SET updated_at = NOW() WHERE id = $1', [book.id]);
    const page = toPage(rows[0]);
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'ledger_page.uploaded',
      entityType: 'ledger_page',
      entityId: page.id,
      metadata: { bookId: book.id, volumeLabel: book.volume_label, pageNumber },
    });
    res.status(201).json({ page });
  } catch (err) {
    if (err.code === '23505') return fail(res, 409, `Page ${pageNumber} is already in this book.`);
    console.error('uploadPage failed:', err);
    fail(res, 500, "Couldn't save this page.");
  }
}

// GET /ledgers/pages/:pageId/image?size=thumb
async function getPageImage(req, res) {
  try {
    const column = req.query.size === 'thumb' ? 'thumbnail' : 'image';
    const row = await findPage(req.parishId, req.params.pageId, `p.${column} AS data, p.image_type`);
    if (!row) return fail(res, 404, 'Page not found.');
    res.set('Content-Type', column === 'thumbnail' ? 'image/jpeg' : row.image_type);
    res.set('Cache-Control', 'private, max-age=3600');
    res.send(row.data);
  } catch (err) {
    console.error('getPageImage failed:', err);
    fail(res, 500, "Couldn't load this page's photo.");
  }
}

// DELETE /ledgers/pages/:pageId — for a photo uploaded by mistake. Records made from the
// page stay; they just lose the link to it.
async function deletePage(req, res) {
  try {
    const page = await findPage(req.parishId, req.params.pageId);
    if (!page) return fail(res, 404, 'Page not found.');
    await pool.query('DELETE FROM ledger_page WHERE id = $1', [page.id]);
    await writeAudit({
      parishId: req.parishId,
      actorId: req.user.id,
      action: 'ledger_page.deleted',
      entityType: 'ledger_page',
      entityId: page.id,
      metadata: { bookId: page.book_id, pageNumber: page.page_number, records: Number(page.record_count) },
    });
    res.status(204).end();
  } catch (err) {
    console.error('deletePage failed:', err);
    fail(res, 500, "Couldn't remove this page.");
  }
}

// GET /ledgers/search-text → every page's read text, for the ledger search.
async function listSearchText(req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT p.id, p.parish_id, p.book_id, p.page_number, p.uploaded_at, p.search_text
       FROM ledger_page p WHERE p.parish_id = $1 AND p.search_text <> ''`,
      [req.parishId],
    );
    res.json({
      pages: rows.map((r) => ({
        id: r.id,
        parishId: r.parish_id,
        bookId: r.book_id,
        pageNumber: r.page_number,
        scannedAt: r.uploaded_at.toISOString().slice(0, 10),
        ocrText: r.search_text,
      })),
    });
  } catch (err) {
    console.error('listSearchText failed:', err);
    fail(res, 500, "Couldn't search the registers.");
  }
}

// ---- Reading a page ---------------------------------------------------------------------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function searchDate(iso, written) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : written || '';
}

// One line per detail, joined with " · ", so the search's field filter (name, date, priest,
// sponsor) can match a single line. See ledgersHelpers.searchLedgerPages on the client.
function searchTextOf(entries) {
  const lines = [];
  for (const e of entries) {
    const n = `Entry ${e.entryNumber || e.row}`;
    const add = (text) => text && lines.push(`${n}: ${text}`.replace(/\s*·\s*/g, ', '));
    add(e.childFullName);
    const born = searchDate(e.dateOfBirthIso, e.dateOfBirthAsWritten);
    add([born && `born ${born}`, e.placeOfBirth && `at ${e.placeOfBirth}`].filter(Boolean).join(' '));
    add(e.fatherName && `father ${e.fatherName}`);
    add(e.motherName && `mother ${e.motherName}`);
    add(e.residence && `of ${e.residence}`);
    const baptized = searchDate(e.dateOfBaptismIso, e.dateOfBaptismAsWritten);
    add(baptized && `baptized ${baptized}`);
    add(e.minister && `Minister ${e.minister}`);
    const sponsors = [e.sponsor1, e.sponsor2].filter(Boolean).join(', ');
    add(sponsors && `Sponsors ${sponsors}`);
  }
  return lines.join(' · ');
}

function tooManyReads(userId) {
  const now = Date.now();
  const list = (recentReads.get(userId) || []).filter((t) => now - t < HOUR);
  recentReads.set(userId, list);
  if (list.length >= READS_PER_HOUR) {
    const minutes = Math.ceil((HOUR - (now - list[0])) / 60000);
    return `You've read ${READS_PER_HOUR} pages in the last hour. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
  }
  list.push(now);
  return null;
}

// The rows of this page already saved as records: { row, recordId }.
async function recordsFromPage(pageId) {
  const { rows } = await pool.query(
    `SELECT id, ledger_row FROM baptism WHERE ledger_page_id = $1 AND archived_at IS NULL ORDER BY ledger_row`,
    [pageId],
  );
  return rows.map((r) => ({ row: r.ledger_row, recordId: r.id }));
}

async function pageContext(row) {
  const book = await pool.query(`SELECT ${BOOK_COLUMNS} FROM ledger_book b WHERE b.id = $1`, [row.book_id]);
  return { book: toBook(book.rows[0]), page: toPage(row), records: await recordsFromPage(row.id) };
}

// GET /ledgers/pages/:pageId/reading → the page, its book, the saved reading (or null) and
// which rows are already records.
async function getPageReading(req, res) {
  try {
    const row = await findPage(req.parishId, req.params.pageId, `${PAGE_COLUMNS}, p.reading`);
    if (!row) return fail(res, 404, 'Page not found.');
    res.json({ ...(await pageContext(row)), reading: row.reading, readerAvailable: isReaderSetUp() });
  } catch (err) {
    console.error('getPageReading failed:', err);
    fail(res, 500, "Couldn't load this page.");
  }
}

// POST /ledgers/pages/:pageId/read → reads the page with Gemini and keeps the reading.
async function readPage(req, res) {
  if (!isReaderSetUp()) return fail(res, 503, "Reading register pages isn't set up on this server yet.");
  const userId = req.user.id;
  let row;
  try {
    row = await findPage(req.parishId, req.params.pageId, `${PAGE_COLUMNS}, p.image`);
  } catch (err) {
    console.error('readPage lookup failed:', err);
    return fail(res, 500, "Couldn't load this page.");
  }
  if (!row) return fail(res, 404, 'Page not found.');
  const book = await pool.query('SELECT sacrament_type FROM ledger_book WHERE id = $1', [row.book_id]);
  if (book.rows[0].sacrament_type !== 'baptism') {
    return fail(res, 400, 'Only baptism registers can be read so far.');
  }
  if (reading.has(row.id)) return fail(res, 429, 'This page is already being read. Wait for it to finish.');
  const limit = tooManyReads(userId);
  if (limit) return fail(res, 429, limit);

  reading.add(row.id);
  const started = Date.now();
  try {
    const result = await readRegisterPhoto(row.image);
    const seconds = Number(((Date.now() - started) / 1000).toFixed(1));
    const { usage, ...kept } = result;
    const saved = { ...kept, side: 'spread', seconds };
    await pool.query(
      `UPDATE ledger_page SET reading = $2, read_at = NOW(), read_by = $3, search_text = $4 WHERE id = $1`,
      [row.id, JSON.stringify(saved), userId, searchTextOf(result.entries)],
    );
    await writeAudit({
      parishId: req.parishId,
      actorId: userId,
      action: 'ledger_page.read',
      entityType: 'ledger_page',
      entityId: row.id,
      metadata: {
        model: result.model,
        rows: result.entries.length,
        toCheck: result.entries.filter((e) => e.uncertainFields.length || e.checks.length).length,
        seconds,
        tokens: usage || null,
        readId: crypto.randomUUID(),
      },
    });
    const fresh = await findPage(req.parishId, row.id);
    res.json({ ...(await pageContext(fresh)), reading: saved, readerAvailable: true });
  } catch (err) {
    console.error('Register page read failed:', err.message);
    // Set-up problems (key, model, Gemini down) are for whoever runs the server, not the
    // office, so the office gets a plain message and the details stay in the server log.
    if (err.status && err.status >= 500) {
      return fail(
        res,
        502,
        "The page couldn't be read right now. Try again later. If it keeps happening, tell your system administrator.",
      );
    }
    // 429 (usage limit) and 422 (Gemini declined the page) explain themselves; anything
    // else usually means the photo didn't fit the register layout.
    return fail(res, err.status || 422, err.message);
  } finally {
    reading.delete(row.id);
  }
}

module.exports = {
  listBooks,
  getBook,
  createBook,
  listPages,
  uploadPage,
  getPageImage,
  deletePage,
  listSearchText,
  getPageReading,
  readPage,
  searchTextOf,
};
