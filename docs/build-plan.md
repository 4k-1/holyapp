# HolyApp build plan

How to build the recommendations in:

- [recommendations.md](recommendations.md): items **1–8** (8.1–8.9)
- [parish-operations-recommendations.md](parish-operations-recommendations.md): **A1–A7**, **B1–B9**,
  **C1–C12**, **D1–D11**, **E1–E7**

Overlapping items are merged. Each phase builds on the one before.

---

## Starting point

Two things in the codebase decide where to start:

- **No safety net.** The server has no tests (`"test": "echo …"` in `server/package.json`) and no
  migration runner; migrations are applied by hand. Nearly every item adds tables.
- **Uncommitted work.** Branch `ocr-local` holds a large amount of uncommitted work (OCR/ledgers,
  the new certificate templates, record pages). Phase 1 changes the same files
  (`AdminGenerateCertificateModal.tsx`, `certificateController.js`), so this work must reach
  `master` first.

## Merged items

| Merged | Built as |
| --- | --- |
| A4 + D5 | One daily close screen: certificates, receipts, cash and Sunday collections |
| B5 + C5 | One liturgical calendar dataset |
| B6 + C10 | One `place` table for the church and chapels |
| B7 + C7 | Funeral fast booking and emergency sick calls together |
| B8 + D10 | Finance council view and reports |
| E1 + 8.2 | Per-area access built on diocese-ready role assignments |
| E5 | Covered by A4, D1 and E1; no separate work |
| E3 | Already done |

---

## Phase 0 — Foundations

Makes the later phases cheap and safe.

| Item | Work |
| --- | --- |
| Land `ocr-local` | Split into separate commits (OCR/ledgers, certificate templates, record pages, seed data) and merge to `master` |
| 8.9 Migration runner | e.g. `node-pg-migrate`; records which migrations have run; mark 001–028 as applied |
| Server tests | supertest and a throwaway test database; start with the endpoints that handle money and registers |
| Void / correct block | One pattern: never overwrite, void or correct with a reason, audited. Used by B1, D1, A3 |
| Running numbers | Extend the counter from migration 026 for any sequence. Used by A2, D2 |
| 8.9 File storage | For seals, signatures (item 3) and ledger scans. **Postponed:** waits on the hosting decision; build it just before e-signatures (item 3) |
| E7 | Fix the "Priest" fallback label in `staffController.jobTitle()` |

## Phase 1 — Certificates and money you can trust

What the parish is struggling with now.

| Item | Work | Needs |
| --- | --- | --- |
| A1 | Issue & print in one step; unissued previews print "SPECIMEN – NOT VALID"; reprint keeps the code | — |
| A3 | "Did it print correctly?" Yes / Reprint / Spoiled; unconfirmed list on dashboard | Void block |
| A2 | Numbered copies; reprints logged against the original | Running numbers |
| D1 | Void or correct a donation | Void block |
| D2 | Receipt numbers for office gifts | Running numbers |
| D3 | Fixed list of funds; "must remit" funds tracked | — |
| D4 | Cheque / transfer reference and Pending / Cleared / Bounced | — |
| A4 + D5 | Daily close: copies, receipts, cash, counted collections; two sign-offs | A2, D2 |
| A7 | List of all issued certificates, with export | A2 |

## Phase 2 — Who can do what

| Item | Work | Needs |
| --- | --- | --- |
| E1 + 8.2 | Per-area access per person, on a `role_assignment` table (parish scope only for now) | — |
| 4 | Several titles per staff member; records who the parish priest is | — |
| E6 | Parish priest approves without being the admin | 4, E1 |
| E4 | Staff-added register entries wait for approval; no certificate until approved | E6 |
| E2 | Handover when someone leaves | — |
| 8.7 (part) | Two-step sign-in for staff | — |

Do E1 + 8.2 early: moving from "one user, one parish" touches sign-in and every access check,
and gets more expensive the longer it waits.

## Phase 3 — Registers and certificate validity

| Item | Work | Needs |
| --- | --- | --- |
| B1 | More annotation types, corrections as margin notes, sealed adoption records | Void block, E1 |
| B2 | Purpose on each request; No Record, Sponsor's Certificate, letter of release, banns | — |
| B3 | Godparent checks; late baptism entries | E6 |
| 3 | E-signatures on certificates | File storage, 4 |
| 5 | Marriage requirements | — |

## Phase 4 — Schedule

| Item | Work | Needs |
| --- | --- | --- |
| B6 + C10 | `place` table for church and chapels (also used by donations and intentions) | — |
| C2 | Assign staff by ID, not typed name | 4 |
| C1 | Change or cancel one occasion of a recurring event; date ranges for patterns | — |
| C4 | Notifications on changes; move intentions off cancelled Masses | Job queue (8.9) |
| B5 + C5 | Liturgical calendar and booking warnings | — |
| C3, C6 | Travel buffers; priests' Mass limits and days off | C2, place table |
| B7 + C7 | Funeral fast booking; emergency sick calls | C2 |
| C11 | Reminder to record the sacrament in the register | — |

## Phase 5 — Parish life

| Item | Work |
| --- | --- |
| B4 | Mass intentions as a canonical ledger |
| B8 + D10 | Finance council view and reports |
| D6–D9 | Pledges, gifts in kind, donor privacy, year-end statements |
| B9 | Ministries and safeguarding |
| C8, C9, C12 | Group sessions, booking rules, printable and public views |
| A5, A6, D11 | Security paper, QR scan backstop, server-side donation filtering |

## Phase 6 — Diocesan rollout

| Item | Work |
| --- | --- |
| 8.1 | Diocese → vicariate → parish; parish codes |
| 8.3–8.8 | Diocese standards, onboarding, work between parishes, health dashboard, rest of security, super admin screens |
| 7 follow-ups | Parish codes on reference numbers, MI numbers on intention pages |

---

## How to run it

- **Pace:** Phases 0–2 take roughly 4–6 weeks for one developer. Phases 3 and 4 are similar.
  Phases 5 and 6 are open-ended.
- **Pull requests:** one per item, branched from `master`. Each ships with its migration, server
  tests and a check in the browser.
- **Tracking:** update the status tables in both recommendation files as items land, and the table
  below.

## Progress

| Phase | Status |
| --- | --- |
| 0 — Foundations | In progress: work committed to `feature/ocr`; migration runner done ([migrations.md](migrations.md)); server tests started ([testing.md](testing.md)); running numbers and void/correct blocks done, first used by donations (D1, D2); E7 done; file storage postponed until hosting is decided |
| 1 — Certificates and money | In progress: A1, A2, A3, D1, D2 done |
| 2 — Who can do what | Not started |
| 3 — Registers and validity | Not started |
| 4 — Schedule | Not started |
| 5 — Parish life | Not started |
| 6 — Diocesan rollout | Not started |
