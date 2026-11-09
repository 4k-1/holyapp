// Finds the ruled table on a scanned ledger page: its column edges, its row edges,
// and any short dividing lines inside cells (e.g. the line between father and mother).
//
// How it works:
//   1. Clean the scan (orientation, grayscale, contrast) and mark every dark pixel as ink.
//   2. Look for long straight runs of ink, horizontally and vertically. Handwriting
//      breaks up quickly; ruled lines don't.
//   3. Group runs that sit within a few pixels of each other into one line. That also
//      handles a slightly tilted scan and the double lines under the headings.
//   4. Long vertical lines are column edges. Horizontal lines that cross most of the
//      table are row edges. Everything else is kept for finding splits inside cells.

const sharp = require('sharp');

const DEFAULTS = {
  darkThreshold: 140, // 0–255 after contrast stretch; darker than this counts as ink
  spread: 1, //          px; thickens ink across the line so a tilted line stays one run
  gap: 4, //             px of white allowed inside one line (broken or faint print)
  minSegH: 0.05, //      shortest horizontal run kept, as a fraction of page width
  minSegV: 0.05, //      shortest vertical run kept, as a fraction of page height
  clusterTol: 12, //     px; runs this close together are the same line
  maxThickness: 35, //   px; a "line" thicker than this is a blob of ink, not a rule
  edgeMargin: 0.015, //  ignore lines this close to the image edge (page edge, shadows)
  minColumnEdge: 0.3, // a column edge must cover this fraction of the page height
  minRowCoverage: 0.6, // a row edge must cover this fraction of the table width
  minBandHeight: 0.02, // rows thinner than this fraction of page height are skipped
  minColumnWidth: 25, // px; narrower gaps between edges are double lines, not columns
};

async function loadInk(input, threshold) {
  const { data, info } = await sharp(input)
    .rotate()
    .grayscale()
    .normalize()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels: c } = info;
  const ink = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) ink[i] = data[i * c] < threshold ? 1 : 0;
  return { ink, w, h };
}

// Thicken ink by r pixels across the direction we're scanning.
function spreadInk(ink, w, h, r, acrossRows) {
  if (!r) return ink;
  const out = new Uint8Array(ink.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!ink[y * w + x]) continue;
      for (let d = -r; d <= r; d++) {
        if (acrossRows) {
          const yy = y + d;
          if (yy >= 0 && yy < h) out[yy * w + x] = 1;
        } else {
          const xx = x + d;
          if (xx >= 0 && xx < w) out[y * w + xx] = 1;
        }
      }
    }
  }
  return out;
}

// Straight runs of ink. For horizontal runs, `at` is the row (y) and from/to are x.
// For vertical runs, `at` is the column (x) and from/to are y.
function findRuns(ink, w, h, horizontal, gap, minLen) {
  const runs = [];
  const across = horizontal ? h : w;
  const along = horizontal ? w : h;
  for (let a = 0; a < across; a++) {
    let start = -1;
    let last = -1;
    for (let b = 0; b <= along; b++) {
      const on = b < along && ink[horizontal ? a * w + b : b * w + a];
      if (on) {
        if (start < 0) start = b;
        last = b;
      } else if (start >= 0 && (b - last > gap || b === along)) {
        if (last - start + 1 >= minLen) runs.push({ at: a, from: start, to: last });
        start = -1;
      }
    }
  }
  return runs;
}

// Group runs into lines. Runs arrive sorted by `at`.
// A line is at most `tol` px thick, measured from its first run. Without that cap a ruled
// line could keep absorbing handwriting that touches it, row after row, and stop
// looking like a line at all.
function groupRuns(runs, tol, joinGap) {
  const lines = [];
  for (const r of runs) {
    let line = null;
    for (let i = lines.length - 1; i >= 0; i--) {
      const l = lines[i];
      if (r.at - l.minAt > tol) continue;
      if (r.from <= l.to + joinGap && r.to >= l.from - joinGap) {
        line = l;
        break;
      }
    }
    if (!line) {
      line = { runs: [], from: r.from, to: r.to, minAt: r.at, maxAt: r.at };
      lines.push(line);
    }
    line.runs.push(r);
    line.from = Math.min(line.from, r.from);
    line.to = Math.max(line.to, r.to);
    line.minAt = Math.min(line.minAt, r.at);
    line.maxAt = Math.max(line.maxAt, r.at);
  }
  for (const l of lines) {
    let sum = 0;
    let len = 0;
    for (const r of l.runs) {
      const n = r.to - r.from + 1;
      sum += r.at * n;
      len += n;
    }
    l.at = sum / len;
  }
  return lines;
}

// How much of [from, to] the line actually covers, in pixels.
function coverage(line, from, to) {
  from = Math.max(0, Math.floor(from));
  to = Math.floor(to);
  if (to < from) return 0;
  const hit = new Uint8Array(to - from + 1);
  for (const r of line.runs) {
    const a = Math.max(r.from, from);
    const b = Math.min(r.to, to);
    for (let i = a; i <= b; i++) hit[i - from] = 1;
  }
  let n = 0;
  for (const v of hit) n += v;
  return n;
}

// Where the line sits (its thinnest and thickest `at`) over a stretch [from, to].
// Lets a tilted line give a slightly different position in each column or row.
function spanAt(line, from, to) {
  let min = Infinity;
  let max = -Infinity;
  for (const r of line.runs) {
    if (r.to < from || r.from > to) continue;
    if (r.at < min) min = r.at;
    if (r.at > max) max = r.at;
  }
  if (min === Infinity) return { min: line.minAt, max: line.maxAt };
  return { min, max };
}

async function findGrid(input, options = {}) {
  const o = { ...DEFAULTS, ...options };
  const { ink, w, h } = await loadInk(input, o.darkThreshold);

  const isRule = (l) => l.maxAt - l.minAt <= o.maxThickness;
  const hLines = groupRuns(
    findRuns(spreadInk(ink, w, h, o.spread, true), w, h, true, o.gap, Math.round(o.minSegH * w)),
    o.clusterTol,
    o.gap * 4
  ).filter(isRule);
  const vLines = groupRuns(
    findRuns(spreadInk(ink, w, h, o.spread, false), w, h, false, o.gap, Math.round(o.minSegV * h)),
    o.clusterTol,
    o.gap * 4
  ).filter(isRule);

  const margin = o.edgeMargin * w;
  const edges = vLines
    .filter((l) => l.at > margin && l.at < w - margin && coverage(l, 0, h - 1) >= o.minColumnEdge * h)
    .sort((a, b) => a.at - b.at);
  if (edges.length < 2) {
    return { width: w, height: h, hLines, vLines, edges, rows: [], bands: [], columns: [], error: 'Fewer than 2 column edges found.' };
  }

  const tx0 = edges[0].at;
  const tx1 = edges[edges.length - 1].at;
  const rows = hLines
    .filter((l) => coverage(l, tx0, tx1) >= o.minRowCoverage * (tx1 - tx0))
    .sort((a, b) => a.at - b.at);

  const bands = [];
  for (let i = 0; i + 1 < rows.length; i++) {
    if (rows[i + 1].at - rows[i].at < o.minBandHeight * h) continue;
    bands.push({ top: rows[i], bottom: rows[i + 1] });
  }

  const columns = [];
  for (let i = 0; i + 1 < edges.length; i++) {
    if (edges[i + 1].at - edges[i].at < o.minColumnWidth) continue;
    columns.push({ left: edges[i], right: edges[i + 1] });
  }

  return {
    width: w,
    height: h,
    hLines,
    edges,
    rows,
    bands,
    columns,
    table: { x0: tx0, x1: tx1, y0: rows.length ? rows[0].at : 0, y1: rows.length ? rows[rows.length - 1].at : h },
  };
}

// The inside of one cell, kept clear of its ruled lines by `inset` pixels.
function cellBox(band, column, inset) {
  const xa = column.left.at;
  const xb = column.right.at;
  const ya = band.top.at;
  const yb = band.bottom.at;
  return {
    x0: Math.round(spanAt(column.left, ya, yb).max + inset),
    x1: Math.round(spanAt(column.right, ya, yb).min - inset),
    y0: Math.round(spanAt(band.top, xa, xb).max + inset),
    y1: Math.round(spanAt(band.bottom, xa, xb).min - inset),
  };
}

// A short horizontal line across the middle part of a cell, if there is one.
function findSplit(grid, box) {
  const h = box.y1 - box.y0;
  const w = box.x1 - box.x0;
  let best = null;
  let bestCover = 0;
  for (const l of grid.hLines) {
    if (l.at <= box.y0 + 0.2 * h || l.at >= box.y1 - 0.2 * h) continue;
    const c = coverage(l, box.x0, box.x1);
    if (c >= 0.5 * w && c > bestCover) {
      best = l;
      bestCover = c;
    }
  }
  return best;
}

module.exports = { findGrid, cellBox, findSplit, spanAt, DEFAULTS };
