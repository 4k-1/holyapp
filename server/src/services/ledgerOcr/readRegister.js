// Reads one photo of an open baptism register (both pages) with Gemini.
//
//   readRegisterPhoto(image)  →  { engine, model, templateVersion, page, split, cells,
//                                  entries, layoutNote, usage }
//
// The photo is cut at the book's middle (spreadSplitter), both halves go to Gemini in one
// request, and Gemini joins each row of the left page to the same row of the right page.
// Each entry is { row, entryNumber, <fields…>, confidence: {}, uncertainFields: [], checks: [] }:
//   uncertainFields  what Gemini itself is unsure of
//   checks           what the app's own checks found (see checks.js)
// cells come from the grid finder (Gemini doesn't use the grid): where each cell is, which
// page it's on and how much ink it holds, for the row pictures and the checks.
const sharp = require('sharp');
const { TEMPLATES } = require('./templates');
const { readWithGemini, hasGeminiKey, FIELDS, PROMPT_VERSION } = require('./geminiReader');
const { measurePage } = require('./layout');
const { addChecks } = require('./checks');
const { splitSpread } = require('./spreadSplitter');

const TEMPLATE_FOR_SIDE = { left: TEMPLATES.baptismal, right: TEMPLATES.register };

function validIso(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(v);
}

// One Gemini row in the shape the check screen uses.
function fromGemini(raw, fieldNames, hasNumberColumn) {
  const entry = { row: Number(raw.row) || 0, confidence: {}, uncertainFields: [] };
  for (const f of fieldNames) {
    const v = raw[f];
    entry[f] = typeof v === 'string' && v.trim() ? v.trim() : null;
  }
  entry.entryNumber = hasNumberColumn ? entry.entryNumber : String(entry.row);
  entry.uncertainFields = (Array.isArray(raw.uncertainFields) ? raw.uncertainFields : []).filter((f) => fieldNames.includes(f));
  // A date the model couldn't put in YYYY-MM-DD properly is dropped and flagged.
  for (const f of fieldNames.filter((n) => n.endsWith('Iso'))) {
    if (entry[f] && !validIso(entry[f])) {
      entry[f] = null;
      if (!entry.uncertainFields.includes(f)) entry.uncertainFields.push(f);
    }
  }
  return entry;
}

async function pageSize(buffer) {
  const m = await sharp(buffer).rotate().metadata();
  // .rotate() fixes orientation on output; metadata reports the stored size, so swap for 90° turns.
  const turned = m.orientation && m.orientation >= 5;
  return turned ? { width: m.height, height: m.width } : { width: m.width, height: m.height };
}

// Where the cells are and how much ink each holds. If the grid can't be matched (a photo
// at an angle, a different register), the reading still works, only without the row
// pictures and the ink checks.
async function layoutFor(image, side, offsetX = 0) {
  try {
    return await measurePage(image, TEMPLATE_FOR_SIDE[side], { side, offsetX });
  } catch (err) {
    return { cells: [], note: `No row pictures or ink checks for the ${side} page: ${err.message}` };
  }
}

const joinNotes = (...layouts) => layouts.map((l) => l.note).filter(Boolean).join(' ') || null;

async function readSpreadRaw({ left, right }) {
  const [l, r] = await Promise.all(
    [left, right].map((img) => (Buffer.isBuffer(img) ? img : sharp(img).toBuffer()))
  );
  const result = await readWithGemini({
    images: [
      { buffer: l, side: 'left' },
      { buffer: r, side: 'right' },
    ],
    mode: 'spread',
  });
  const fieldNames = [...Object.keys(FIELDS.left), ...Object.keys(FIELDS.right)];
  return {
    engine: 'gemini',
    model: result.model,
    templateVersion: `${PROMPT_VERSION}-spread`,
    usage: result.usage,
    cached: result.cached,
    page: await pageSize(l),
    pages: { left: await pageSize(l), right: await pageSize(r) },
    cells: [],
    entries: result.entries
      .map((raw) => fromGemini(raw, fieldNames, true))
      .filter((e) => e.row > 0)
      .sort((a, b) => a.row - b.row),
  };
}

async function readRegisterPhoto(image) {
  const buffer = Buffer.isBuffer(image) ? image : await sharp(image).toBuffer();
  const { left, right, split } = await splitSpread(buffer);
  const page = { width: split.width, height: split.height };

  // The right half's boxes are moved back into the coordinates of the whole photo.
  const [ll, rl] = await Promise.all([layoutFor(left, 'left'), layoutFor(right, 'right', split.x)]);
  const cells = [...ll.cells, ...rl.cells];

  const result = await readSpreadRaw({ left, right });
  return { ...result, page, split, cells, entries: addChecks(result.entries, cells), layoutNote: joinNotes(ll, rl) };
}

module.exports = { readRegisterPhoto, isReaderSetUp: hasGeminiKey };
