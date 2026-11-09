// Scores the register reader (Gemini) against the hand-checked truth files.
//
// Usage:
//   node scripts/ocr-score.js [--show] [--no-checks]
//     --show       list every field: what the page says vs what was read
//     --no-checks  count only Gemini's own flags, not the app's checks (checks.js)
//
// For every <prefix>-spread.jpg in test-fixtures/ledgers/ (ONE photo of both pages, dummy
// data) that has <prefix>-left.truth.json and <prefix>-right.truth.json next to it.
// Answers are kept in out/gemini-cache/ (unless GEMINI_CACHE_DIR says otherwise), so
// re-scoring costs nothing. Per field it prints:
//   exact     share of entries where the reading matches the truth (ignoring case and punctuation)
//   chars     average share of characters right, which shows "nearly right" readings too
//   flagged   wrong readings marked for checking (fine: a reviewer will look)
//   missed    wrong readings NOT marked (the dangerous kind)
require('dotenv').config({ quiet: true }); // GEMINI_API_KEY / GEMINI_MODEL from server/.env
const fs = require('fs');
const path = require('path');

process.env.GEMINI_CACHE_DIR = process.env.GEMINI_CACHE_DIR || path.join('out', 'gemini-cache');
const { readRegisterPhoto } = require('../src/services/ledgerOcr/readRegister');

const FIXTURES = path.join('test-fixtures', 'ledgers');
const args = process.argv.slice(2);
const show = args.includes('--show');

function editDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

const norm = (v) =>
  v == null
    ? ''
    : String(v)
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '') // ñ and n count as the same letter here
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

function charScore(truth, read) {
  const a = norm(truth);
  const b = norm(read);
  if (!a && !b) return 1;
  return Math.max(0, 1 - editDistance(a, b) / Math.max(a.length, b.length));
}

// A field is flagged if Gemini was unsure of it or one of the app's checks points at it
// (or at the whole row). A date's ISO field counts as flagged if either half was flagged.
// --no-checks scores Gemini's own flags only.
const useChecks = !args.includes('--no-checks');
function isFlagged(entry, field) {
  const checks = useChecks ? entry.checks || [] : [];
  const list = [...(entry.uncertainFields || []), ...checks.map((c) => c.field)];
  if (list.includes(null)) return true;
  if (list.includes(field)) return true;
  const base = field.replace(/(AsWritten|Iso)$/, '');
  return base !== field && (list.includes(`${base}AsWritten`) || list.includes(`${base}Iso`));
}

const pct = (n) => `${Math.round(n * 100)}%`.padStart(5);
const sideOf = (name) => (/-right$/.test(name) ? 'right' : 'left');

function scorePage(name, truth, result, totals) {
  // Rows are matched by position on the page: truth entry N ↔ row N.
  // The Register page has no number column, so its "entry number" is the row.
  const right = sideOf(name) === 'right';
  const byRow = new Map(result.entries.map((e) => [e.row, right ? { ...e, entryNumber: String(e.row) } : e]));
  const fields = Object.keys(truth.entries[0]);
  const stats = Object.fromEntries(fields.map((f) => [f, { n: 0, exact: 0, chars: 0, flagged: 0, missed: 0 }]));
  const details = [];

  truth.entries.forEach((t, i) => {
    const r = byRow.get(i + 1) || { uncertainFields: [] };
    for (const f of fields) {
      const s = stats[f];
      const ok = norm(t[f]) === norm(r[f]);
      s.n++;
      s.chars += charScore(t[f], r[f]);
      if (ok) s.exact++;
      else if (isFlagged(r, f)) s.flagged++;
      else s.missed++;
      if (show) {
        const mark = ok ? '✓' : isFlagged(r, f) ? '?' : '✗';
        details.push(`  ${String(i + 1).padStart(2)} ${f.padEnd(22)} ${mark}  page: ${t[f] ?? '—'}  |  read: ${r[f] ?? '—'}`);
      }
    }
  });

  const how = `${result.model}${result.cached ? ', cached' : ''}`;
  console.log(`\n${name}  (${truth.pageHeading}, ${truth.entries.length} entries, ${result.entries.length} rows read · ${how})`);
  console.log(`  ${'field'.padEnd(24)}exact  chars  flagged  missed`);
  for (const f of fields) {
    const s = stats[f];
    console.log(`  ${f.padEnd(24)}${pct(s.exact / s.n)}  ${pct(s.chars / s.n)}  ${String(s.flagged).padStart(7)}  ${String(s.missed).padStart(6)}`);
    totals.fields += s.n;
    totals.exact += s.exact;
    totals.chars += s.chars;
    totals.flagged += s.flagged;
    totals.missed += s.missed;
  }
  if (show) console.log(`\n${details.join('\n')}`);
}

async function main() {
  const prefixes = fs
    .readdirSync(FIXTURES)
    .filter((f) => f.endsWith('-spread.jpg'))
    .map((f) => f.replace('-spread.jpg', ''))
    .sort();
  if (!prefixes.length) throw new Error(`No *-spread.jpg photos in ${FIXTURES}.`);

  const truthOf = (name) => JSON.parse(fs.readFileSync(path.join(FIXTURES, `${name}.truth.json`), 'utf8'));
  const totals = { fields: 0, exact: 0, chars: 0, flagged: 0, missed: 0 };
  fs.mkdirSync('out', { recursive: true });

  for (const prefix of prefixes) {
    const has = (side) => fs.existsSync(path.join(FIXTURES, `${prefix}-${side}.truth.json`));
    if (!has('left') || !has('right')) {
      console.log(`
${prefix}: skipped (needs ${prefix}-left and ${prefix}-right truth files)`);
      continue;
    }
    const result = await readRegisterPhoto(path.join(FIXTURES, `${prefix}-spread.jpg`));
    const { x, gapFrom, gapTo, leftColumns, rightColumns, confirmed } = result.split;
    console.log(
      `
${prefix}-spread.jpg cut at x=${x} (gap ${gapFrom}–${gapTo}), columns ${leftColumns}/${rightColumns}${confirmed ? '' : ' — NOT confirmed'}`
    );
    fs.writeFileSync(path.join('out', `${prefix}.result.json`), JSON.stringify(result, null, 2));
    scorePage(`${prefix}-left`, truthOf(`${prefix}-left`), result, totals);
    scorePage(`${prefix}-right`, truthOf(`${prefix}-right`), result, totals);
  }

  console.log(
    `
All pages: ${totals.fields} fields · exact ${pct(totals.exact / totals.fields).trim()} · ` +
      `chars ${pct(totals.chars / totals.fields).trim()} · wrong but flagged ${totals.flagged} · wrong and missed ${totals.missed}`
  );
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
