// UAT only: writes what the in-app test guide recorded for each tester, as CSV, for the researchers.
// One row per tester and task: done or skipped, how easy they said it was, whether they opened the
// hint, and how long it took from first seeing the task to HolyApp seeing it done.
//
//   node scripts/export-test-guide.js > test-guide-results.csv
//
// Tasks a tester never reached are listed with empty columns, so every tester has every task.

require('dotenv').config({ quiet: true });

const { Client } = require('pg');
const { allTesters, STEPS } = require('../src/testing/testers');

function csv(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const testers = allTesters();
    const { rows } = await client.query(
      `SELECT lower(u.email) AS email, s.step, s.status, s.rating, s.hint_used, s.started_at, s.finished_at,
              CASE WHEN s.started_at IS NOT NULL AND s.finished_at IS NOT NULL
                   THEN GREATEST(0, EXTRACT(EPOCH FROM (s.finished_at - s.started_at)))::int END AS seconds
         FROM test_guide_step s JOIN app_user u ON u.id = s.user_id
        WHERE lower(u.email) = ANY($1)`,
      [testers.map((t) => t.email.toLowerCase())]
    );
    const byKey = new Map(rows.map((r) => [`${r.email}|${r.step}`, r]));

    const out = [['tester', 'email', 'parish', 'task_no', 'task', 'status', 'rating', 'hint_used', 'seconds', 'started_at', 'finished_at']];
    for (const t of testers) {
      STEPS.forEach((step, i) => {
        const r = byKey.get(`${t.email.toLowerCase()}|${step}`);
        out.push([
          t.n,
          t.email,
          t.parishSlug,
          i + 1,
          step,
          r?.status,
          r?.rating,
          r ? (r.hint_used ? 'yes' : 'no') : '',
          r?.seconds,
          r?.started_at?.toISOString(),
          r?.finished_at?.toISOString(),
        ]);
      });
    }
    process.stdout.write(out.map((row) => row.map(csv).join(',')).join('\n') + '\n');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
