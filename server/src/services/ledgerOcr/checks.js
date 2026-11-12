// The app's own checks on a reading, on top of what the engine says it's unsure of.
// Gemini sounds equally sure when it's wrong, so these look for mistakes from outside:
//
//   blank cell     the page is empty there, but something was read (e.g. a name that
//                  slid into the wrong cell)
//   missed writing there's writing on the page, but nothing was read
//   tick box       the ticked box (measured by ink) disagrees with what was read
//   dates          a date that wasn't understood, a birth after the baptism, or a baptism
//                  year that differs from the rest of the page
//   entry number   doesn't follow the number on the row above
//
//   addChecks(entries, cells) → entries, each with checks: [{ field, message }]
//   field is the entry's field name (dates: <name>AsWritten), or null for the whole row.
const { EMPTY_INK, TICK_INK } = require('./layout');
const { TEMPLATES } = require('./templates');

const WRITING_INK = 0.02; // blank cells measure ~0, written ones 0.04+; this leaves room for specks

// legitimateTick → { field: 'legitimacy', value: 'L' }, from every template's tick groups.
const TICK_BOXES = {};
for (const t of Object.values(TEMPLATES)) {
  for (const [field, boxes] of Object.entries(t.ticks || {})) {
    for (const [box, value] of Object.entries(boxes)) TICK_BOXES[box] = { field, value };
  }
}

const valueField = (cell) => (cell.kind === 'date' ? `${cell.field}AsWritten` : cell.field);
const filled = (v) => typeof v === 'string' && v.trim() !== '';
const yearOf = (iso) => (typeof iso === 'string' ? Number(iso.slice(0, 4)) : null);

function mostCommon(values) {
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1);
  let best = null;
  for (const [v, n] of counts) if (!best || n > best.n) best = { v, n };
  return best;
}

function addChecks(entries, cells = []) {
  const byRow = new Map();
  for (const c of cells) {
    if (!byRow.has(c.entry)) byRow.set(c.entry, []);
    byRow.get(c.entry).push(c);
  }

  // Rows with writing that the engine skipped get an empty entry, so a person sees them.
  const out = entries.map((e) => ({ ...e, checks: [...(e.checks || [])] }));
  const readRows = new Set(out.map((e) => e.row));
  for (const [row, rowCells] of byRow) {
    if (readRows.has(row)) continue;
    if (rowCells.some((c) => c.kind !== 'tick' && c.ink > WRITING_INK)) {
      out.push({
        row,
        entryNumber: null,
        confidence: {},
        uncertainFields: [],
        checks: [{ field: null, message: 'This row has writing on the page, but nothing was read from it.' }],
      });
    }
  }
  out.sort((a, b) => a.row - b.row);

  for (const entry of out) {
    const add = (field, message) => {
      if (!entry.checks.some((c) => c.field === field && c.message === message)) entry.checks.push({ field, message });
    };
    const rowCells = byRow.get(entry.row) || [];

    // Blank cells and missed writing.
    for (const cell of rowCells) {
      if (cell.kind === 'tick') continue;
      const field = valueField(cell);
      if (!(field in entry)) continue; // this side of the page wasn't read
      if (cell.ink < EMPTY_INK && filled(entry[field])) {
        add(field, 'The page looks empty here, but something was read. It may belong to another cell.');
      } else if (cell.ink > WRITING_INK && !filled(entry[field])) {
        add(field, "There's writing here on the page, but nothing was read.");
      }
    }

    // Tick boxes, measured by ink.
    const groups = {};
    for (const cell of rowCells) {
      const tick = TICK_BOXES[cell.field];
      if (!tick) continue;
      (groups[tick.field] = groups[tick.field] || []).push({ ...tick, ticked: cell.ink > TICK_INK });
    }
    for (const [field, boxes] of Object.entries(groups)) {
      if (!(field in entry)) continue;
      const ticked = boxes.filter((b) => b.ticked);
      if (ticked.length > 1) add(field, 'More than one box looks ticked on the page.');
      else if (ticked.length === 1 && entry[field] !== ticked[0].value) {
        add(field, `The ticked box on the page looks like ${ticked[0].value}.`);
      } else if (ticked.length === 0 && entry[field]) add(field, 'No box looks ticked on the page.');
    }

    // Dates.
    for (const base of ['dateOfBirth', 'dateOfBaptism']) {
      if (filled(entry[`${base}AsWritten`]) && !entry[`${base}Iso`]) {
        add(`${base}AsWritten`, "The date wasn't understood. Check it and enter it as a date.");
      }
    }
    if (entry.dateOfBirthIso && entry.dateOfBaptismIso && entry.dateOfBirthIso > entry.dateOfBaptismIso) {
      add('dateOfBirthAsWritten', 'Birth date is after the baptism date.');
      add('dateOfBaptismAsWritten', 'Baptism date is before the birth date.');
    }
  }

  // Baptism years that differ from the rest of the page.
  const years = out.map((e) => yearOf(e.dateOfBaptismIso)).filter(Boolean);
  const usual = mostCommon(years);
  if (usual && years.length >= 3 && usual.n > years.length / 2) {
    for (const e of out) {
      const y = yearOf(e.dateOfBaptismIso);
      if (y && y !== usual.v) {
        e.checks.push({ field: 'dateOfBaptismAsWritten', message: `The year differs from the other baptisms on this page (mostly ${usual.v}).` });
      }
    }
  }

  // Entry numbers that don't follow the row above (left page only: it has the number column).
  if (cells.some((c) => c.field === 'entryNumber')) {
    for (let i = 1; i < out.length; i++) {
      const prev = Number(out[i - 1].entryNumber);
      const cur = Number(out[i].entryNumber);
      const gap = out[i].row - out[i - 1].row;
      if (Number.isInteger(prev) && out[i].entryNumber && cur !== prev + gap) {
        out[i].checks.push({ field: 'entryNumber', message: `Expected ${prev + gap}, following the row above.` });
      }
    }
  }

  return out;
}

module.exports = { addChecks, WRITING_INK };
