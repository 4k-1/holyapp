# Database migrations

Changes to the database structure live in `server/migrations/` as numbered SQL files
(`001_create_core_identity.sql` … `028_ledger_books_pages.sql`). The runner in
`server/scripts/migrate.js` applies them in number order and records each one in the
`schema_migrations` table, so every database can be brought up to date with one command.

## Commands

Run from `server/` (or inside the server container, as shown).

| Command | What it does |
| --- | --- |
| `npm run migrate` | Runs every migration that hasn't run yet, in number order |
| `npm run migrate:status` | Lists each migration as applied or pending. Changes nothing |
| `npm run migrate:baseline -- 028` | Marks 001–028 as applied **without running them** |

With Docker:

```bash
docker compose exec server npm run migrate
```

## Bringing a database up to date

- **A new, empty database:** run `npm run migrate`. All files run from 001.
- **A database that was updated by hand before the runner existed:** first check which migrations
  it already has, then record them once with `npm run migrate:baseline -- <last number>`. After
  that, use `npm run migrate` as normal.

## Adding a migration

1. Create the next number: `029_short_description.sql`. Never reuse or skip-fill a number.
2. Write plain SQL. Don't add `BEGIN` / `COMMIT`; the runner wraps each file in a transaction, so a
   failing file is undone completely.
3. Run `npm run migrate` locally, then commit the file with the code that uses it.
4. **Never edit a migration after it has been committed.** Other databases have already run it.
   Put any fix in a new migration. The runner warns when an applied file has changed.

## Things to watch for

- **New enum values:** Postgres can add a value with `ALTER TYPE … ADD VALUE` inside a transaction,
  but can't use that value until the transaction commits. Add the value in one migration and use it
  in the next.
- **Two people adding migrations at once:** if two branches both add `029_…`, renumber one before
  merging. The runner refuses to run when two files share a number.
- **Two runs at the same time** (e.g. two servers starting) are safe: the runner takes a database
  lock, so the second waits for the first.
