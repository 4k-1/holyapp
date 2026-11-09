// Finds the table on a scan, labels every cell from the template, and draws it so you can check.
//
// Usage:
//   node scripts/ocr-grid.js test-fixtures/ledgers/baptism-p01-left.jpg [--template baptismal|register] [--crops]
//
// The template is picked from the file name (-left = baptismal, -right = register) unless given.
// Writes:
//   out/<name>-grid.png       the scan with found lines (red) and labelled cells (teal / amber)
//   out/crops/<name>/*.png    one image per cell, with --crops
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { findGrid } = require('../src/services/ledgerOcr/gridFinder');
const { buildCells } = require('../src/services/ledgerOcr/cells');

const TEMPLATES = {
  baptismal: require('../src/services/ledgerOcr/templates/baptismalLeft'),
  register: require('../src/services/ledgerOcr/templates/registerRight'),
};

function arg(name) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

async function main() {
  const file = process.argv[2];
  if (!file || file.startsWith('--')) throw new Error('Give the path to a scan.');
  const name = path.basename(file, path.extname(file));
  const templateKey = arg('--template') || (/-right$/.test(name) ? 'register' : 'baptismal');
  const template = TEMPLATES[templateKey];
  if (!template) throw new Error(`Unknown template "${templateKey}". Use baptismal or register.`);

  const started = Date.now();
  const grid = await findGrid(file);
  console.log(`${name}: ${grid.width}×${grid.height}, template ${template.id}`);
  console.log(`  column edges at x = ${grid.edges.map((e) => Math.round(e.at)).join(', ')}`);
  console.log(`  columns found: ${grid.columns.length} (template expects ${template.columns.length})`);
  console.log(`  row edges: ${grid.rows.length}, rows: ${grid.bands.length} (${template.headerBands} heading + ${grid.bands.length - template.headerBands} entry rows)`);

  let cells = [];
  let problem = null;
  try {
    cells = buildCells(grid, template);
  } catch (err) {
    problem = err.message;
  }

  // Drawing: found lines in red, cells in teal (amber where a split line wasn't found).
  const shapes = [];
  for (const e of grid.edges) shapes.push(`<line x1="${e.at}" y1="${e.from}" x2="${e.at}" y2="${e.to}" stroke="#e5484d" stroke-width="2"/>`);
  for (const r of grid.rows) shapes.push(`<line x1="${r.from}" y1="${r.at}" x2="${r.to}" y2="${r.at}" stroke="#e5484d" stroke-width="2"/>`);
  for (const c of cells) {
    const { x0, y0, x1, y1 } = c.box;
    const colour = c.splitFound === false ? '#f5a524' : '#0e9384';
    shapes.push(`<rect x="${x0}" y="${y0}" width="${Math.max(1, x1 - x0)}" height="${Math.max(1, y1 - y0)}" fill="${colour}" fill-opacity="0.08" stroke="${colour}" stroke-width="2"/>`);
    if (c.entry <= 3) {
      shapes.push(`<text x="${x0 + 3}" y="${y0 + 12}" font-family="Arial" font-size="11" fill="${colour}">${esc(c.field)}</text>`);
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${grid.width}" height="${grid.height}">${shapes.join('')}</svg>`;

  fs.mkdirSync('out', { recursive: true });
  const overlay = path.join('out', `${name}-grid.png`);
  const png = await sharp(file).rotate().composite([{ input: Buffer.from(svg) }]).png().toBuffer();
  fs.writeFileSync(overlay, png);
  console.log(`  overlay: ${overlay}`);

  if (problem) {
    console.error(`\n  Problem: ${problem}`);
    process.exitCode = 1;
    return;
  }

  const missingSplits = cells.filter((c) => c.splitFound === false).length / 2;
  console.log(`  cells: ${cells.length}, split lines not found (used the middle): ${missingSplits}`);

  if (process.argv.includes('--crops')) {
    const dir = path.join('out', 'crops', name);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const page = await sharp(file).rotate().toBuffer();
    for (const c of cells) {
      const { x0, y0, x1, y1 } = c.box;
      if (x1 - x0 < 2 || y1 - y0 < 2) continue;
      const out = path.join(dir, `e${String(c.entry).padStart(2, '0')}-${c.field}.png`);
      await sharp(page).extract({ left: x0, top: y0, width: x1 - x0, height: y1 - y0 }).png().toFile(out);
    }
    console.log(`  crops: ${dir}`);
  }
  console.log(`  ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
