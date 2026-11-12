// Finds every cell on a page and measures how much ink is in it, without reading any text.
// Gemini doesn't use the grid, but the check screen still needs to know where each row and
// cell is (to cut the row picture), and the checks need to know
// which cells are blank and which tick box is ticked.
//
//   measurePage(image, template, { side, offsetX })
//     → { page: {width, height}, cells: [{ entry, field, kind, side, box, ink }] }
//   offsetX moves the boxes right, e.g. for the right half of a one-photo spread.
const sharp = require('sharp');
const { findGrid } = require('./gridFinder');
const { buildCells } = require('./cells');

const INK_THRESHOLD = 110; // 0–255; darker than this is ink
const EMPTY_INK = 0.005; //   less ink than this share = blank cell
const TICK_INK = 0.01; //     more ink than this share in a tick box = ticked

async function measurePage(image, template, { side, offsetX = 0 } = {}) {
  const page = await sharp(image).rotate().toBuffer();
  const grid = await findGrid(page);
  const cells = buildCells(grid, template);

  // One grayscale copy of the page; each cell's ink is counted straight from it.
  const { data, info } = await sharp(page).grayscale().raw().toBuffer({ resolveWithObject: true });
  const inkIn = ({ x0, y0, x1, y1 }) => {
    const left = Math.max(0, x0);
    const right = Math.min(info.width, x1);
    const top = Math.max(0, y0);
    const bottom = Math.min(info.height, y1);
    if (right - left < 2 || bottom - top < 2) return 0;
    let dark = 0;
    for (let y = top; y < bottom; y++) {
      const rowStart = y * info.width;
      for (let x = left; x < right; x++) if (data[(rowStart + x) * info.channels] < INK_THRESHOLD) dark++;
    }
    return dark / ((right - left) * (bottom - top));
  };

  return {
    page: { width: grid.width, height: grid.height },
    cells: cells.map(({ entry, field, kind, box }) => ({
      entry,
      field,
      kind,
      side,
      box: { ...box, x0: box.x0 + offsetX, x1: box.x1 + offsetX },
      ink: Number(inkIn(box).toFixed(4)),
    })),
  };
}

module.exports = { measurePage, EMPTY_INK, TICK_INK };
