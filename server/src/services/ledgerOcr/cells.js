// Combines a found grid with a template into named boxes: one per field per entry row.
const { cellBox, findSplit, spanAt } = require('./gridFinder');

const INSET = 5; // px kept clear of every ruled line

function buildCells(grid, template, inset = INSET) {
  if (grid.error) throw new Error(grid.error);
  if (grid.columns.length !== template.columns.length) {
    throw new Error(
      `Template ${template.id} expects ${template.columns.length} columns but the page has ${grid.columns.length}. ` +
        'Run scripts/ocr-grid.js and look at the overlay to see which edges were found.'
    );
  }

  const cells = [];
  grid.bands.slice(template.headerBands).forEach((band, i) => {
    const entry = i + 1;
    template.columns.forEach((col, c) => {
      const box = cellBox(band, grid.columns[c], inset);
      if (!col.split) {
        cells.push({ entry, field: col.field, kind: col.kind, box });
        return;
      }
      const line = findSplit(grid, box);
      let topBottom;
      let bottomTop;
      if (line) {
        const s = spanAt(line, box.x0, box.x1);
        topBottom = Math.round(s.min - inset);
        bottomTop = Math.round(s.max + inset);
      } else {
        const mid = Math.round((box.y0 + box.y1) / 2);
        topBottom = mid;
        bottomTop = mid;
      }
      const [topField, bottomField] = col.split;
      // kind may be one value for both halves or [top kind, bottom kind].
      const [topKind, bottomKind] = Array.isArray(col.kind) ? col.kind : [col.kind, col.kind];
      cells.push({ entry, field: topField, kind: topKind, box: { ...box, y1: topBottom }, splitFound: !!line });
      cells.push({ entry, field: bottomField, kind: bottomKind, box: { ...box, y0: bottomTop }, splitFound: !!line });
    });
  });
  return cells;
}

module.exports = { buildCells, INSET };
