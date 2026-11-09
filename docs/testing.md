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
| `day-summary.test.js` | The day summary counts copies, reprints and spoiled copies; adds cash, GCash and cheques by source; leaves voided gifts out; filters to one staff member; shows each copy's receipt on the record; flags unconfirmed prints; keeps parishes apart and parishioners out |
| `funds.test.js` | The server's fund list matches the app's; listed funds are saved under their own name, typed purposes tidied and grouped ignoring capitals; must-remit funds are marked in the report |
| `donation-clearing.test.js` | A cheque needs its number; cheques and transfers wait to clear and only count once cleared; bounced needs a reason, is logged and never counts; a status can't change twice; admins of the parish only |
| `personnel-titles.test.js` | Names are kept in parts and shown in full; an honorific typed into the name is split off; clergy status follows the honorific (Dcn., Sr., Mr., none; dropping Fr. makes them lay); only one active Parish Priest and only with Fr. or Msgr. (also through Staff accounts, with no sign-in left behind); the title can be handed over; a chaplain stays clergy in the schedule picker; unknown, repeated or no titles are refused; admins only |
| `mass-time-changes.test.js` | A changed Mass time moves future intentions to the new time and tells the person who booked; said and past ones stay; removing a time is refused until staff choose another Mass that day, and only a Mass that day is accepted; a day with no Mass left moves to another date the office chooses (not a past date, and only to a Mass that exists then), with the new day's label and a message to the person who booked; same-day choices offer only Masses still there; each move is in the audit log |
| `liturgical-calendar.test.js` | Easter and the days that hang on it; seasons, Sundays, holy days of obligation and Simbang Gabi; the Immaculate Conception moves off an Advent Sunday; funeral Masses on Sundays of Lent, Holy Thursday and holy days, and weddings on Good Friday, need "Book anyway" (also when reserving a wedding date); Lent weddings and parish dates are notes only; the fiesta and local feasts are saved, checked, kept when left out, and shown on the month |
| `schedule-recording.test.js` | Sacrament events start as needing recording, others don't; a baptism session stays open while children are recorded and lists them, until staff close it; a funeral closes when its death entry is saved; an event of the wrong kind or another parish's is refused and nothing is saved |
| `schedule-assign.test.js` | Events save the person's ID and show their current name after a rename; clashes found by ID; a guest with the same name doesn't clash with staff; staff from another parish or a bad ID refused; regular Masses and single-Mass changes link to the person; handover moves regular Masses and lists single-Mass changes; a removed person's name stays as a guest |
| `handover.test.js` | Lists upcoming events, the Parish Priest title and the signatory; moves events or leaves them unassigned (past events keep the name); passes on the title and the signatory; suspends the sign-in so refresh and sign-in fail; nothing changes if any part is refused; no second handover or your own; admins only; parishes kept apart |
| `purposes.test.js` | Purposes are tidied to the fixed list (old "Marriage preparation" and "Walk-in issuance" handled) and match the app's list; month counting; a walk-in copy needs a purpose; the purpose is saved with the copy and only marriage copies get an end date; the QR check shows the purpose and marks an old marriage copy expired while it stays valid |
| `marriage-requirements.test.js` | CENOMAR for each party; a renamed or turned-off item stays that way; the couple's answers add the right papers and the Art. 34 affidavit replaces the license; a dated document needs its date (not in the future), shows when it expires and flags one that expires before the wedding; the parish's own items reach open applications and can be turned off; only admins change the list; parishes kept apart |
| `certificate-register.test.js` | The register lists every copy newest first with its number, receipt, issuer, status and times printed; filters by the day issued; keeps parishes apart and parishioners out |
| `staff.test.js` | Staff sign-ins with no title show "Staff" (admins "Admin Staff"), and a chosen title shows |

Not covered yet: the client screens, and running the tests on GitHub for every push.
