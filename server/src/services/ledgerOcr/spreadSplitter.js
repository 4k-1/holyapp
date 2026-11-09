// Cuts one photo of an open register (both pages) into a left page and a right page.
//
// How it finds the middle: each page is a ruled table, so almost every column of pixels
// inside a page is crossed by many horizontal ruled lines. The gap between the two tables
// (the book's gutter) is crossed by few or none. Looking at ruled lines rather than plain
// darkness means the shadow along the spine doesn't confuse it.
//
// Then it checks each half with the grid finder: the Baptismal page has 6 columns and the
// Register page 5. If the counts don't match, the split is still returned but marked
// unconfirmed, so a person can check it.
const sharp = require('sharp');
const { findGrid } = require('./gridFinder');
const { TEMPLATES } = require('./templates');

const SEARCH_FROM = 0.3; // only look for the gutter in the middle part of the photo
const SEARCH_TO = 0.7;

// How many ruled horizontal lines cross each x position.
function lineProfile(grid) {
  const profile = new Int32Array(grid.width);
  for (const line of grid.hLines) {
    const hit = new Uint8Array(grid.width);
    for (const r of line.runs) for (let x = r.from; x <= r.to; x++) hit[x] = 1;
    for (let x = 0; x < grid.width; x++) profile[x] += hit[x];
  }
  return profile;
}

// The middle of the widest stretch where the profile is at its lowest.
function findGutter(profile, width) {
  const from = Math.floor(width * SEARCH_FROM);
  const to = Math.ceil(width * SEARCH_TO);
  let min = Infinity;
  for (let x = from; x < to; x++) min = Math.min(min, profile[x]);
  const quiet = min + 1; // allow one stray line (a pen stroke, a page edge)

  let best = null;
  let start = -1;
  for (let x = from; x <= to; x++) {
    const inGap = x < to && profile[x] <= quiet;
    if (inGap && start < 0) start = x;
    if (!inGap && start >= 0) {
      if (!best || x - start > best.width) best = { from: start, to: x - 1, width: x - start };
      start = -1;
    }
  }
  if (!best) return null;
  return { x: Math.round((best.from + best.to) / 2), from: best.from, to: best.to, linesCrossing: min };
}

async function splitSpread(input) {
  const image = await sharp(input).rotate().toBuffer();
  const { width, height } = await sharp(image).metadata();

  const grid = await findGrid(image);
  const gutter = findGutter(lineProfile(grid), width);
  if (!gutter) throw new Error("Couldn't find the middle of the book in this photo.");

  // A wide middle typically means a clean gap; a gap under 10 px is suspicious.
  const left = await sharp(image).extract({ left: 0, top: 0, width: gutter.x, height }).jpeg({ quality: 92 }).toBuffer();
  const right = await sharp(image)
    .extract({ left: gutter.x, top: 0, width: width - gutter.x, height })
    .jpeg({ quality: 92 })
    .toBuffer();

  const [leftGrid, rightGrid] = await Promise.all([findGrid(left), findGrid(right)]);
  const leftColumns = leftGrid.columns.length;
  const rightColumns = rightGrid.columns.length;
  const confirmed =
    leftColumns === TEMPLATES.baptismal.columns.length && rightColumns === TEMPLATES.register.columns.length;

  return {
    left,
    right,
    split: {
      x: gutter.x,
      gapFrom: gutter.from,
      gapTo: gutter.to,
      width,
      height,
      leftColumns,
      rightColumns,
      confirmed,
      note: confirmed
        ? null
        : `Expected 6 columns on the left page and 5 on the right, found ${leftColumns} and ${rightColumns}. Check where the photo was cut.`,
    },
  };
}

module.exports = { splitSpread, findGutter, lineProfile };
