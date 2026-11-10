# HolyApp build plan

HolyApp is getting ready for **one parish**, not a diocese. This plan lists only what that parish
needs before launch. Everything else waits until a parish asks for it.

The full ideas behind each item are in [recommendations.md](recommendations.md) (items 1–8) and
[parish-operations-recommendations.md](parish-operations-recommendations.md) (A–E).

## Before launch

| # | Item | Work | Status |
| --- | --- | --- | --- |
| 1 | 5b | Banns: three Sundays, banns returned from other parishes, waivers, the Sunday list, couples marrying elsewhere and their Certificate of Banns | Built; browser check and commit left |
| 2 | D5 | Counted Sunday collections, added to the day summary | To do |
| 3 | B2b | Certificate of No Record (for late PSA registration) | To do |
| 4 | 8.7 | Two-step sign-in for staff | To do, last |

## Done

- **Foundations:** migration runner ([migrations.md](migrations.md)), server tests
  ([testing.md](testing.md)), running numbers, void or correct with a reason, E7 staff label.
- **Certificates and money:** issue and print in one step, numbered copies and reprints, print
  check, list of issued certificates (A1, A2, A3, A7); purpose on every copy and marriage copies
  valid 6 months (B2a); donations voided or corrected, receipt numbers, fixed funds, cheque and
  transfer status (D1–D4); day summary (A4).
- **Staff:** several titles per person and one Parish Priest (4); handover when someone leaves (E2).
- **Marriage:** parish-editable requirements, special cases, document dates checked against the
  wedding (5a).
- **Schedule:** staff assigned by record (C2); Mass time changes carry booked intentions; Church
  calendar with booking warnings, parish fiesta and local feasts (B5 + C5); recording reminders
  (C11); fast funeral booking with follow-up Masses (C7).

## Later, only if a parish asks

Nothing here is planned. Pick one up when a parish needs it.

- **Documents:** Sponsor's Certificate, letter of release (rest of B2b); more annotation types and
  sealed adoption records (B1); godparent checks and late baptisms (B3); e-signatures (3).
- **Access and approvals:** per-area access (E1 + 8.2); parish priest approves (E6); staff entries
  wait for approval (E4).
- **Schedule:** chapels and BECs (B6 + C10); travel time (C3); priests' Mass limits and days off
  (C6); emergency sick calls (B7); notices when the schedule changes (C4); date ranges for Mass
  patterns (C1).
- **Money:** saved daily close with two sign-offs; remittance tracking; finance council view
  (B8 + D10); pledges, gifts in kind, donor privacy, year-end statements (D6–D9).
- **Parish life:** Mass intentions as a canonical ledger (B4); ministries and safeguarding (B9);
  group sessions, booking rules, public views (C8, C9, C12); security paper, QR backstop,
  server-side donation filtering (A5, A6, D11).
- **Diocese:** diocese and vicariate structure, standards, onboarding, work between parishes,
  dashboards, super admin screens (8.1, 8.3–8.8); parish codes on reference numbers (7).
- **Infrastructure:** file storage (waits on the hosting decision); job queue.

## How to work

- One item at a time: explain it, get approval, then build.
- Each item ships with its migration, server tests and a check in the browser.
- Commit on `feature/ocr`; don't push.
