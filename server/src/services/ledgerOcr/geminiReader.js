// Reads ledger pages with Gemini. It looks at the whole page and returns the fields
// directly, so the grid finder isn't used for reading.
//
//   readWithGemini({ images: [{ buffer, side }], mode })  →  { entries, model, usage, cached }
//     mode 'left' | 'right'  one page
//     mode 'spread'          both pages of one spread in one request; rows are joined
//
// Settings (server/.env):
//   GEMINI_API_KEY     required. Use a key on a PAID (billing-enabled) project for real
//                      registers: on the free tier Google may use what is sent to improve
//                      its products.
//   GEMINI_MODEL       optional; which Gemini model to use
//   GEMINI_CACHE_DIR   optional, for development only: keep each answer in this folder,
//                      keyed by the image bytes, mode, model and prompt version, so
//                      re-scoring the test pages costs nothing. Leave it unset on a real
//                      server: the answers hold people's names and dates.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const PROMPT_VERSION = 'gemini-v1';
// Scored 81% exact / 98% chars on the p01 pages. Pro models have no free-tier quota.
const DEFAULT_MODEL = 'gemini-3.5-flash';
const API = 'https://generativelanguage.googleapis.com/v1beta/models';
const cacheDir = () => (process.env.GEMINI_CACHE_DIR ? path.resolve(process.env.GEMINI_CACHE_DIR) : null);
// Answers took 47–212 s per page on the free tier in testing (mostly queueing), so allow 5 minutes.
const TIMEOUT_MS = 300000;

const model = () => process.env.GEMINI_MODEL || DEFAULT_MODEL;
const hasGeminiKey = () => Boolean(process.env.GEMINI_API_KEY);

// ---- What each page holds -------------------------------------------------------------

const FIELDS = {
  left: {
    entryNumber: 'The number written in the NO. column, digits only.',
    childFullName: 'NAME OF CHILD.',
    placeOfBirth: 'PLACE & DATE OF BIRTH: the place (upper line of the cell).',
    dateOfBirthAsWritten: 'PLACE & DATE OF BIRTH: the date (lower line), exactly as written.',
    dateOfBirthIso: 'The same date as YYYY-MM-DD, only if every part is clearly readable; otherwise null.',
    legitimacy: 'L or ILL: "L" if the L box is ticked, "ILL" if the ILL box is ticked, null if neither or both.',
    fatherName: "NAME OF PARENTS: the father (upper line).",
    motherName: "NAME OF PARENTS: the mother, by maiden name (lower line).",
  },
  right: {
    residence: 'RESIDENTS OF.',
    dateOfBaptismAsWritten: 'DATE OF BAPTISM, exactly as written.',
    dateOfBaptismIso: 'The same date as YYYY-MM-DD, only if every part is clearly readable; otherwise null.',
    minister: 'MINISTER, including the title (e.g. "Rev. Fr.").',
    sponsor1: 'SPONSORS: the first sponsor (upper line).',
    sponsor2: 'SPONSORS: the second sponsor (lower line).',
    observations: 'OBSERVATIONS, word for word; null if empty.',
  },
};

const PAGE_DESCRIPTION = {
  left:
    'The image is the LEFT page of a Catholic parish baptism register from the Philippines, headed "Baptismal". ' +
    'Columns: NO. | NAME OF CHILD | PLACE & DATE OF BIRTH | L or ILL (two tick boxes) | NAME OF PARENTS.',
  right:
    'The image is the RIGHT page of a Catholic parish baptism register from the Philippines, headed "Register". ' +
    'Columns: RESIDENTS OF | DATE OF BAPTISM | MINISTER | SPONSORS | OBSERVATIONS.',
  spread:
    'The two images are the LEFT page ("Baptismal") and the RIGHT page ("Register") of ONE spread of a Catholic ' +
    'parish baptism register from the Philippines. Each ruled entry row continues across both pages: row 1 on the ' +
    'left page and row 1 on the right page are the same baptism. Left columns: NO. | NAME OF CHILD | PLACE & DATE OF ' +
    'BIRTH | L or ILL | NAME OF PARENTS. Right columns: RESIDENTS OF | DATE OF BAPTISM | MINISTER | SPONSORS | OBSERVATIONS.',
};

function fieldsFor(mode) {
  return mode === 'spread' ? { ...FIELDS.left, ...FIELDS.right } : FIELDS[mode];
}

function buildPrompt(mode) {
  const fields = fieldsFor(mode);
  const list = Object.entries(fields)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');
  return `${PAGE_DESCRIPTION[mode]}
The entries are handwritten. Read every entry row that has writing in it and fill in the schema.

Fields:
- row: the position of the entry row on the page, counting ruled entry rows from the top (first entry row = 1). Skip blank rows but keep counting them.
${list}
- uncertainFields: the names of every field above that you are not sure you read correctly.

Rules:
- Copy text EXACTLY as written: keep the original spelling, abbreviations, punctuation and accents, even if a word looks misspelled (e.g. keep "Febuary"). Do not correct, translate, expand or complete anything.
- If a cell is empty, use null. If you cannot read it, use null and list it in uncertainFields. Never guess a name, place or date.
- If you are unsure about any letter in a field, list that field in uncertainFields.
- If writing runs onto a second line inside the same cell, join it with a single space.
- Keep the rows in order from top to bottom.`;
}

function buildSchema(mode) {
  const props = { row: { type: 'INTEGER' } };
  for (const k of Object.keys(fieldsFor(mode))) {
    props[k] = k === 'legitimacy' ? { type: 'STRING', enum: ['L', 'ILL'], nullable: true } : { type: 'STRING', nullable: true };
  }
  props.uncertainFields = { type: 'ARRAY', items: { type: 'STRING' } };
  const ordering = Object.keys(props);
  return {
    type: 'OBJECT',
    properties: {
      entries: {
        type: 'ARRAY',
        items: { type: 'OBJECT', properties: props, required: ordering, propertyOrdering: ordering },
      },
    },
    required: ['entries'],
  };
}

// ---- Calling Gemini -------------------------------------------------------------------

class GeminiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function callGemini(parts, schema) {
  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: schema },
  };
  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await fetch(`${API}/${model()}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) return json;

    const msg = (json.error && json.error.message) || `HTTP ${res.status}`;
    if ((res.status === 503 || res.status === 500) && attempt === 1) continue; // busy: try once more
    if (res.status === 400 && /API key/i.test(msg)) throw new GeminiError('Gemini rejected the API key. Check GEMINI_API_KEY in server/.env.', 502);
    if (res.status === 401 || res.status === 403) throw new GeminiError(`Gemini refused the request: ${msg}`, 502);
    if (res.status === 404) throw new GeminiError(`Gemini model "${model()}" wasn't found. Set GEMINI_MODEL in server/.env.`, 502);
    if (res.status === 429) throw new GeminiError('The reading service is at its usage limit. Try again later.', 429);
    throw new GeminiError(`Gemini error: ${msg}`, 502);
  }
  throw new GeminiError('Gemini is busy. Try again in a minute.', 503);
}

function parseAnswer(json) {
  const blocked = json.promptFeedback && json.promptFeedback.blockReason;
  if (blocked) throw new GeminiError(`Gemini declined this page (${blocked}).`, 422);
  const cand = (json.candidates || [])[0];
  if (!cand) throw new GeminiError('Gemini returned no answer.', 502);
  if (cand.finishReason === 'MAX_TOKENS') throw new GeminiError('Gemini\'s answer was cut off (too long).', 502);
  const text = ((cand.content && cand.content.parts) || []).map((p) => p.text || '').join('');
  try {
    return JSON.parse(text);
  } catch {
    throw new GeminiError('Gemini\'s answer was not valid JSON.', 502);
  }
}

// ---- Public ---------------------------------------------------------------------------

async function prepare(buffer) {
  // Same orientation fix as the other engines; JPEG keeps the upload small.
  return sharp(buffer).rotate().jpeg({ quality: 90 }).toBuffer();
}

async function readWithGemini({ images, mode }) {
  if (!hasGeminiKey()) throw new GeminiError('GEMINI_API_KEY is not set in server/.env.', 503);
  const jpegs = await Promise.all(images.map((img) => prepare(img.buffer)));

  const hash = crypto.createHash('sha256');
  for (const j of jpegs) hash.update(j);
  hash.update(`|${mode}|${model()}|${PROMPT_VERSION}`);
  const dir = cacheDir();
  const cacheFile = dir && path.join(dir, `${hash.digest('hex')}.json`);
  if (cacheFile && fs.existsSync(cacheFile)) {
    return { ...JSON.parse(fs.readFileSync(cacheFile, 'utf8')), cached: true };
  }

  const parts = [
    ...jpegs.map((j) => ({ inlineData: { mimeType: 'image/jpeg', data: j.toString('base64') } })),
    { text: buildPrompt(mode) },
  ];
  const json = await callGemini(parts, buildSchema(mode));
  const answer = parseAnswer(json);
  const result = {
    entries: Array.isArray(answer.entries) ? answer.entries : [],
    model: json.modelVersion || model(),
    promptVersion: PROMPT_VERSION,
    usage: json.usageMetadata
      ? { input: json.usageMetadata.promptTokenCount, output: json.usageMetadata.candidatesTokenCount }
      : null,
  };
  if (cacheFile) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(cacheFile, JSON.stringify(result, null, 2));
  }
  return { ...result, cached: false };
}

module.exports = { readWithGemini, hasGeminiKey, GeminiError, PROMPT_VERSION, FIELDS, buildPrompt, buildSchema };
