# Server tests

The tests in `server/test/` call the API the way the app does and check the answers: who can do
what, that one parish can't reach another's data, walk-in certificate issuing, office donations
and sign-in.

## Running them

From `server/`, with the Docker Postgres running:

```bash
npm test
```

Each run:

1. Drops and recreates the test database `holyapp_test`, then builds it with the migration runner
   (see [migrations.md](migrations.md)). Your real database is never touched.
2. Runs every `*.test.js` file in `server/test/`, one file at a time.

It takes about 20 seconds. A failing test prints what it expected and what it got.

To run one file, or tests whose name matches some text:

```bash
node test/run.js --test-name-pattern="Parish separation"
```

## Safety

- The test database is `TEST_DATABASE_URL`, defaulting to
  `postgresql://holyapp:holyapp_dev@localhost:5432/holyapp_test`. Its name **must end in `_test`**,
  or the tests refuse to start.
- Email, PayMongo and Gemini are switched off during tests, so nothing leaves the computer.

Inside the server container, point at the `postgres` service instead (after a rebuild, so the
container has the test packages):

```bash
docker compose exec -e TEST_DATABASE_URL=postgresql://holyapp:holyapp_dev@postgres:5432/holyapp_test server npm test
```

## Adding a test

- Put it in `server/test/<area>.test.js`.
- Start with `createParish()` from `test/helpers.js`. It makes a new parish with an admin, a staff
  member and a parishioner, each already signed in, so test files never share data.
- Call the API with `api(user).get(...)`, `.post(...)` and so on, and check the database with
  `pool.query(...)` when the response alone doesn't prove it.
- End each file's `describe` with `after(() => pool.end())`.
- Write the test name as the rule it protects, e.g. "stops staff from editing a register entry".

## What's covered

| File | Checks |
| --- | --- |
| `access.test.js` | Signed-out, parishioner, staff and admin access to the register, staff accounts and settings |
| `parish-separation.test.js` | Another parish's records, certificates and donations can't be listed, opened, changed or issued |
| `certificates.test.js` | A walk-in issue creates request, paid receipt and certificate together, at the parish's fee |
| `donations.test.js` | Donations save and list; bad amounts, methods and dates are refused |
| `auth.test.js` | Sign-in with right and wrong passwords, unknown emails and suspended accounts |
| `donation-voids.test.js` | Receipt numbers never repeat or skip, even when saved at once; void and correct are admin-only, need a reason, are logged and leave the totals |
| `certificate-copies.test.js` | Certificate numbers count per parish and year without repeats, even when issued at once, and carry on after a prefix change; reprints need a reason, are logged, stay one copy and print as issued; the report counts copies and reprints apart; Settings refuses a prefix another sacrament uses or has printed |
| `certificate-prints.test.js` | New printed copies stay unconfirmed until someone confirms; a reprint asks again; spoiled copies need a reason, keep their number, scan as void and can't be reprinted; other parishes and parishioners are kept out |
| `staff.test.js` | Staff sign-ins with no title show "Staff" (admins "Admin Staff"), and a chosen title shows |

Not covered yet: the client screens, and running the tests on GitHub for every push.
