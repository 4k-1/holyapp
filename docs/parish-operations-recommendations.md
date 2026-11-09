# Parish operations recommendations

Proposals for HolyApp from a Catholic parish-office point of view. Nothing here is built yet.
These do not repeat the items in [recommendations.md](recommendations.md).

- **Part A:** accurate count of issued certificates
- **Part B:** parish operations
- **Part C:** parish schedule
- **Part D:** donations
- **Part E:** staff page

Canon law references are given from general knowledge; check them before relying on them.

---

## Part A — Accurate count of issued certificates

### The problem

Walk-in issuance is counted by staff pressing the print button, and printing sometimes fails.
In the code, the certificate window
(`client/src/features/parish-admin/records/AdminGenerateCertificateModal.tsx`) has two separate
buttons:

- **Print** opens the browser print dialog and records nothing.
- **Issue this copy** calls `POST /records/{type}/:id/certificates` (`issueFromRecord` in
  `server/src/controllers/certificateController.js`), which creates the walk-in request, the cash
  payment and the certificate row.

So a copy can be printed and handed out without ever being counted. If printing fails after a copy
is issued, the record and the paper don't match. The browser's print events can't fix this:
`afterprint` also fires when the user cancels, and some browsers don't fire it at all.

Rule of thumb: **count copies on the server when they're issued, never by the print button.**

### A1. Issue first, then print (priority: high)

- Replace the two buttons with one **Issue & print** button.
- It first saves the issuance on the server and gets back the certificate code and QR link. Only
  then does it open the print dialog.
- Before a copy is issued, Print gives only a preview, watermarked
  **"SPECIMEN – NOT VALID"**.
- If printing fails, **Reprint** prints the same copy again with the same code, and the count
  doesn't go up.

### A2. Number every copy and log reprints separately (priority: medium)

- Give each issued copy a running number per parish and sacrament, e.g. `BAP-2026-000143`, and
  print it on the certificate. This builds on the existing short reference numbers (migration
  `026_reference_numbers.sql`).
- Log each reprint against the original copy: who, when, why.
- Reports show issued copies and reprints separately ("143 issued, 9 reprinted").
- Gaps in the numbering show that something wasn't recorded.

### A3. Have staff confirm the printout (priority: high)

After printing, ask "Did the certificate print correctly?":

| Answer | Result |
| --- | --- |
| Yes | Copy marked **released** |
| No, reprint | Opens a reprint of the same copy (A1) |
| Spoiled | Copy is **voided** with a reason; its QR verification page shows "void" |

Copies with no answer stay on a **Printed – not confirmed** list on the dashboard until someone
answers.

### A4. Match copies to receipts (priority: medium)

- Walk-in issuance already records a cash payment. Have the certificate show its receipt number,
  and the receipt show its certificate number.
- **Day summary**: one read-only screen for any day, for the whole office or one staff member:
  copies issued, reprints, spoiled copies, receipts, and cash and GCash collected. Copies issued
  should match paid receipts, and receipts should add up to the cash in the drawer. Nothing is
  saved: the figures are worked out from the records each time, and the audit log keeps who did
  what. Staff can print it, count the drawer against it and sign the paper if the parish wants.

#### Parked for later: a saved daily close

Build this only if a parish needs a formal close. It needs its own table.

- Staff type in the cash actually counted; the shortage or overage and its reason are saved.
- Two sign-offs: the staff member submits the close, the parish priest or admin countersigns.
  (The priest can only sign on his own once E6 is built.)
- A closed day is locked: later voids and corrections go on the next day instead of changing it.
- A "days waiting for sign-off" card on the priest's or admin's dashboard.
- Counted Sunday collections (D5) join the same close once D5 exists.

### A5. Count security paper (priority: optional)

Only if the parish prints on pre-numbered security or watermarked paper:

- Record the sheet's serial number when issuing.
- Record paper stock as it comes in.
- Used sheets + spoiled sheets + unused sheets should equal sheets received.

### A6. Use QR scans as a backstop (priority: low)

Every certificate already has a `/verify/{code}` QR link. Flag scans of codes that aren't in the
issued list, or that are void. They point to copies that went out unrecorded, or to forged ones.

### A7. Keep a register of issued certificates (priority: medium)

Add a filterable list under Reports → Certificates with these columns: number, sacrament, holder,
purpose, issued by, receipt, status (issued / released / reprinted / void) and times printed. Allow
a monthly export for the parish priest or the diocese. This replaces the paper "certificates
issued" logbook.

### Suggested order

1. A1 and A3: small changes to the existing issue window and endpoint, and they make the count
   accurate.
2. A2, A4 and A7: for audits and reconciliation.
3. A5 only if the parish uses numbered paper; A6 whenever convenient.

---

## Part B — Parish operations

### B1. Make the baptism record the hub of a person's sacramental life (priority: high)

Canon 535 §2 says later events must be noted on the baptism entry. HolyApp records only
confirmation and marriage notes today.

- **More note types:** ordination, religious profession, declaration of nullity, convalidation
  (canon 1123), adoption and change of rite. Nullity notes matter most in practice: without one, a
  baptismal certificate shows the person as still married, and they can't marry again.
- **Correct entries without overwriting them:** a register is never rewritten. A correction is a
  dated note in the margin that keeps the original wording, with an audit trail.
- **Seal adopted children's original entries:** after an adoption, certificates show only the
  adoptive parents. Only the parish priest and the chancery can see the original entry.

### B2. Ask for the purpose on every certificate request (priority: high)

What a certificate is for decides what it may show and how long it's valid.

- **For marriage:** it must show every note on the record, and it's usually accepted only within
  6 months of issue. Print "For marriage purposes" and the date it expires.
- **For school or travel:** it can leave out sensitive notes.
- **Other documents parishes issue often:**
  - Certificate of No Record (for late PSA registration)
  - Sponsor's Certificate (confirms someone can be a godparent)
  - Letter of release, when a baptism or wedding happens in another parish
  - Certificate of Banns

### B3. Check godparent eligibility and allow late baptism entries (priority: high)

- **Godparent checks (canons 873–874):** at least 16, confirmed, has received First Communion,
  not the child's parent. Allow one godparent, or two of different sexes. When a godparent was
  baptized in this parish, link to their record.
- **Late entries (canon 876):** when no baptism entry exists, allow one recorded from a sworn
  witness statement, with an approval step.

### B4. Keep Mass intentions to canon law standard (priority: medium)

Canons 945–958 and the 1991 decree *Mos iugiter*.

- One offering means one Mass. Combined intentions are allowed at most twice a week, and the
  donors must be told.
- Track each intention: received, which priest is assigned, celebrated. Canon 958 requires this
  book.
- A priest who says more than one Mass a day keeps only one offering (canon 951).
- Flag intentions that can't be said within a year, since those must be passed on to another
  priest or the diocese (canons 953–956).

### B5. Use the liturgical calendar to catch scheduling conflicts (priority: low)

- Load the solemnities, seasons and holy days so HolyApp can warn about bookings that aren't
  allowed:
  - No funeral Masses on solemnities of obligation, during the Easter Triduum, or on Sundays of
    Advent, Lent and Easter (GIRM 380).
  - No weddings on Good Friday or Holy Saturday.
- Add local dates: the parish fiesta and each chapel's feast day.

### B6. Add chapels and Basic Ecclesial Communities (BECs) (priority: low)

Most Philippine parishes have a main church plus several chapels (*kapilya*) and BEC zones.

- Let Masses, intentions, collections and fiestas belong to a chapel.
- Group parishioners by BEC and send announcements to them.

### B7. Sick calls and the full funeral cycle (priority: medium)

- **Emergency sick call:** a "Request a priest now" button for Anointing and Viaticum. It alerts
  the priest on call with the address and a contact person, with no payment step.
- **Funerals:** link the death record, the funeral Mass and the burial niche. When the funeral is
  booked, offer the follow-up Masses families expect: *pasiyam*, the 40th day and anniversaries.

### B8. Run parish finances the way canon law expects (priority: low)

- Give the parish finance council (canon 537) a read-only view of the finances.
- Have two people count each collection and both sign off, then match it against the bank deposit.
- Keep collections meant for others separate: Peter's Pence, Alay Kapwa, Mission Sunday and the
  diocesan assessment.
- Produce the annual report to the bishop (canon 1287 §1) and a summary for parishioners
  (canon 1287 §2).

### B9. Ministry rosters and safeguarding (priority: low)

- Keep rosters for lectors, extraordinary ministers of Holy Communion, altar servers and choirs,
  with commissioning dates and when each term ends.
- Record each volunteer's safeguarding training and when it expires. Block scheduling anyone whose
  training has lapsed for ministry with minors.

### Suggested order

1. B1–B3: they affect whether certificates are valid, and they build on the certificate work.
2. B4 and B7: parishioners and auditors notice these.
3. B5, B6, B8 and B9: as the app grows and rolls out across a diocese.

---

## Part C — Parish schedule

### What exists today

- Weekly recurring commitments (`parish_recurring_commitment`), e.g. Weekday Mass at 6 AM and 6 PM.
- One-off events of nine types (`event`).
- Conflict checks for the same priest or the same place at overlapping times
  (`assertNoConflict` / `findConflict` in `server/src/services/scheduleService.js`).
- Weddings booked from marriage applications.
- A Pending / Recorded flag on sacrament events.
- Mass times parishioners can see (`GET /schedule/mass-times`).

### Fix the gaps first

#### C1. Change or cancel one date of a recurring event (priority: high)

- **Today:** the only per-date change saved is the assignee (`parish_schedule_override` stores just
  `assignee`). Staff can't cancel the 6 PM Mass on one date, move it, or add an extra Mass. Every
  holiday, power outage or fiesta means editing the whole weekly pattern.
- **Add:** cancel, change time, change place and add a note, all for one date.
- **Also:** give recurring patterns optional start and end dates, so a Lent or summer schedule runs
  for a set period and then reverts.

#### C2. Assign staff by record, not by typed name (priority: high)

- **Today:** `assignee` is plain text, matched to staff by name (`resolvePersonnelId`). A misspelling
  or a renamed staff member quietly breaks the conflict check.
- **Add:** store the staff ID. Mark visiting priests as guests.

#### C3. Count travel and preparation time in conflict checks (priority: medium)

- **Today:** only overlapping times count as a clash. A priest can be booked for a 9:00–10:00 Mass
  at a chapel 30 minutes away and a 10:00 baptism in the main church.
- **Add:** a buffer before and after each event, and travel time between places.

#### C4. Notify people of changes (priority: high)

- **Today:** nobody hears when a Mass is cancelled or a priest is reassigned.
- **Add:** notify the assigned priest, and every parishioner with a booking or a Mass intention at
  that time.
- When a Mass is cancelled, prompt staff to move its Mass intentions to another Mass, so no paid
  intention is left without a Mass.

### Parish-specific checks

#### C5. Use the liturgical calendar (priority: medium)

- Show the day's feast and season on the calendar.
- Warn about bookings that aren't allowed:
  - Funeral Masses on solemnities of obligation, during the Easter Triduum, or on Sundays of Advent,
    Lent and Easter (GIRM 380).
  - Weddings on Good Friday or Holy Saturday.
  - Weddings during Lent, which many dioceses discourage.
- Add the parish's own dates: the fiesta, chapel feasts, Simbang Gabi and Holy Week.

#### C6. Respect priests' limits (priority: medium)

- Canon 905: one Mass a day, or up to three on Sundays and holy days with the bishop's permission.
  Warn when a priest is booked past the limit.
- Let priests mark days off, retreats and leave. The schedule then won't assign them and suggests a
  substitute.

#### C7. Fast funeral booking (priority: medium)

- Funerals are booked 1–3 days ahead. Add a fast path that shows open slots for the next 3 days,
  free priests and church availability.
- Link the booking to the death record and the burial niche.
- Offer the follow-up Masses families expect: *pasiyam*, the 40th day and the first anniversary.

#### C8. Group baptisms and confirmations (priority: low)

- Many parishes baptize in batches, e.g. Sundays at 11 AM. Treat one baptism event as a session
  with a cap on the number of children.
- Show seats left, and put families on a waitlist when the session is full.
- Do the same for confirmation, scheduled around the bishop's visit.

#### C9. Booking rules for each sacrament (priority: low)

- Minimum notice, e.g. 2 weeks for a baptism, 3–6 months for a wedding.
- Days and times each sacrament can be booked.
- Steps required before the date is confirmed: baptism seminar, banns, wedding interviews (marriage
  applications already track some of these).

#### C10. Chapels (priority: low)

Add chapels as places, each with its own public Mass times, and filter the calendar by chapel.
(Ties in with B6.)

### Closing the loop

#### C11. Prompt staff to record the sacrament in the register (priority: medium)

After a baptism, wedding or funeral has taken place, keep a "Recorded in register?" reminder open
until the register entry is made. Ideally the entry is created from the event, with the names and
date filled in. This builds on the existing Pending / Recorded flag.

#### C12. Public and shared views (priority: low)

- A printable weekly schedule for the bulletin board and Sunday announcements.
- A calendar (iCal) feed for each priest, so their own events appear on their phone.
- A public Mass-times page for parishioners that shows changes made with C1.

### Suggested order

1. C1, C2 and C4: the gaps staff will hit first.
2. C5–C7: the checks a parish office cares most about.
3. C8–C12: improvements to add over time.

---

## Part D — Donations

### What exists today

- Staff record gifts by hand: donor (optional), method (Cash, GCash, Check, Bank Transfer), amount,
  date, free-text purpose and remarks (`POST /donations`, `recordDonation` in
  `server/src/controllers/donationController.js`).
- Parishioners and guests can give online through GCash (PayMongo); staff are notified.
- The staff page shows totals, named donors, average gift and a trend sparkline, with a date filter
  and a printable receipt.

Campaign goals with progress bars were considered and set aside for now.

### Fix the gaps first

#### D1. Correct or void a donation without deleting it (priority: high)

- **Today:** donations have no edit or delete routes. A wrong amount or a duplicate stays in the
  totals for good; staff can only add more entries.
- **Add:** a void with a reason, and a correction that keeps the original, both logged in the audit
  trail. Same rule as the registers: never overwrite.

#### D2. A numbered receipt for every gift (priority: high)

- **Today:** only online gifts get a `payment` row with a PayMongo receipt. Office gifts get a
  printable receipt but no running number.
- **Add:** a running receipt number, e.g. `DON-2026-000231`. Gaps show missing entries, and gifts can
  be matched to the cash box.

#### D3. A fixed list of funds (priority: high)

- **Today:** purpose is free text, so "church repair", "Church Repairs" and "renovation" count as
  three purposes.
- **Add:** a list of funds the parish manages, e.g. General fund, Building/renovation, Fiesta,
  Feeding program, Seminarians.
- **Collections that must be passed on in full:** Peter's Pence, Alay Kapwa, Mission Sunday, Holy
  Land and the diocesan assessment. Mark them "Must remit" and track when each was sent.
- **Built as:** a fixed list in the code (`server/src/constants/funds.js`, mirrored in
  `client/src/lib/funds.ts`), not a table. Staff pick a fund or choose "Other…" and type the
  purpose; a typed name that matches a fund is saved as that fund. The report totals must-remit
  funds apart under "To pass on in full". The diocesan assessment is left out: it's owed from the
  parish's own income, not given by people.

##### Parked for later: tracking remittances

Recording each time must-remit money is sent (date, amount, sent to, deposit slip reference, voided
with a reason, never edited) and showing collected vs sent vs still to send. Needs its own table.

#### D4. Cheque and bank transfer status (priority: high)

- **Today:** cheques and transfers count as received as soon as they're entered.
- **Add:** cheque number and bank, or transfer reference, plus a status of Pending, Cleared or
  Bounced. Only cleared gifts count in the totals.

### Parish-specific features

#### D5. Sunday collections as a counted batch (priority: medium)

- Most parish income is the plate collection, not individual gifts. Add a "Collection" entry for
  each Mass and chapel.
- Counters enter the count by denomination; two counters sign off.
- The batch is later matched to the bank deposit slip. (Ties in with B8.)

#### D6. Pledges and recurring giving (priority: low)

- Record pledges, e.g. ₱1,000 a month to the building fund for a year, show how much has been paid,
  and send gentle reminders.
- Allow recurring GCash gifts, if PayMongo supports it.

#### D7. Gifts in kind (priority: low)

Record rice, flowers, candles or construction materials with item, quantity and estimated value,
and print a thank-you receipt. Keep them out of the cash totals.

#### D8. Donor privacy and recognition (priority: medium)

- Let donors choose how they're credited: by name, "Anonymous" or "In memory of …".
- Show donor names only to the parish priest and finance staff.
- Optionally produce a list for publishing (fiesta *hermanos*, a renovation plaque) with only the
  donors who agreed.

#### D9. Year-end donor statement (priority: low)

- Parishioners download a summary of their gifts for the year; staff can produce one on request.
- Donations to a religious corporation can be tax-deductible in the Philippines. Confirm the
  parish's BIR status before printing any tax wording.

### Reporting and accountability

#### D10. Reports for the finance council and the bishop (priority: medium)

- Totals by fund, method and month, plus pending remittances.
- CSV or PDF export.
- A short summary for the bulletin (canon 1287 §2).
- A read-only finance view for finance council members (canon 537).

#### D11. Filter and total on the server (priority: low)

- **Today:** the staff page loads every donation and filters by date in the browser, which will slow
  down after a few years of entries.
- **Add:** filtering, totals and search by donor and fund on the server.

### Suggested order

1. D1–D4: make the figures trustworthy.
2. D5 and D10: the money and reports parishes actually need.
3. D6–D9 and D11: as the feature grows.

---

## Part E — Staff page

Several titles per person, honorifics and dated assignments are already covered by item 4 in
[recommendations.md](recommendations.md).

### E1. Access per area (priority: high)

- **Today:** a sign-in is either Admin or Staff, and every Staff sign-in can manage both registers and
  certificate requests. The `permission` / `role_permission` tables only switch a few broad rights
  on or off for a whole role, not for each person.
- **Add:** access set per person for each area: registers, certificates, finance and donations,
  schedule, Mass intentions, settings. Start from presets (Secretary, Cashier, Records encoder,
  Read-only) that the admin can adjust.

### E2. Handover when someone leaves (priority: high)

- **Today:** deactivating a person only changes their status. Their future schedule assignments and
  open requests stay with them.
- **Add:** when deactivating, list what they still hold (future Masses, assigned requests) and ask who
  takes each over. End their sign-in in the same step.

### E3. Always keep at least one admin (already done)

Already handled in `server/src/controllers/staffController.js`: an admin can't remove their own
admin access (`updateStaff`) or deactivate their own account (`setStaffStatus`), and only admins can
change other accounts. So the last admin can't be removed. No work needed.

### E4. Check new register entries before they count (priority: high)

- **Today:** Staff can add register entries, and each counts as final as soon as it's saved. (Staff
  can't edit or archive existing entries; only the admin can. That part is right.)
- **Add:** entries added by Staff show as **For verification** until the parish priest or admin
  approves them. No certificate can be issued from an entry still waiting for approval.
- **Why:** canon 535 §1 makes the parish priest answerable for the registers. This mirrors him
  signing the paper register.

### E5. A check on money handled by one person (priority: medium)

- **Today:** one Staff member can issue a certificate, take the cash and record the donation, and
  can also see every report and donor name.
- **Add:** in a small office, splitting these jobs isn't realistic, so add checks instead: the daily
  cash close (A4) and voids that need an admin (D1). Limit donor names and finance reports with E1.

### E6. Let the parish priest approve without being the admin (priority: medium)

- **Today:** "Admin" covers two jobs: running the system (often the secretary) and approving things
  (the parish priest). A parish priest who doesn't manage accounts gets no say.
- **Add:** an approver right for the parish priest, covering register entries (E4) and voids (D1),
  without full admin access. Fits with E1.

### E7. Staff without a title are labelled "Priest" (priority: low, small fix)

- **Today:** `jobTitle()` in `server/src/controllers/staffController.js` falls back to "Priest" for
  any Staff sign-in without a recognised title, so a secretary without a title shows as a priest.
- **Fix:** fall back to a neutral "Staff".

---

## Status

| Item | Status |
| --- | --- |
| A1 | Done: one Issue & print button; previews print "SPECIMEN – NOT VALID" with no QR; Reprint keeps the code |
| A2 | Done: BAP-2026-000143 numbers (migration 030), reprints logged with a reason and printed as issued, issued and reprinted counted apart in the report |
| A3 | Done: "Did it print correctly?" after each print (Yes / No, reprint / Spoiled); unanswered copies on the dashboard; spoiled copies void with a reason, keep their number and scan as void (migration 031) |
| A4 | Done: day summary (read-only, printable) and receipt numbers shown with each copy. The saved close with sign-offs is parked |
| A5–A7 | Proposed |
| B1–B9 | Proposed |
| C1–C12 | Proposed |
| D1, D2 | Done: void or correct (admins only, with a reason) and DON- receipt numbers (migration 029) |
| D3 | Done: fixed fund list with "Other…"; must-remit funds totalled apart in the report. Remittance tracking parked |
| D4–D11 | Proposed |
| Donation campaign goals | Set aside for now |
| E1, E2 | Proposed |
| E3 | Already done |
| E4–E6 | Proposed |
| E7 | Done: untitled staff sign-ins show "Staff"; the edit form asks for a real title |
