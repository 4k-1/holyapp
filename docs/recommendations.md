# HolyApp recommendations

Everything suggested so far, with its status. Started 2026-11-05.

| # | Topic | Status |
|---|-------|--------|
| 1 | [HolyApp logo in the admin topbar](#1-holyapp-logo-in-the-admin-topbar) | Done |
| 2 | [Hot reload in Docker on Windows](#2-hot-reload-in-docker-on-windows) | Done |
| 3 | [E-signatures on certificates](#3-e-signatures-on-certificates) | Proposed |
| 4 | [Several titles per staff member](#4-several-titles-per-staff-member) | Done (no title history) |
| 5 | [Marriage requirements](#5-marriage-requirements) | Proposed |
| 6 | [Admin pages fill the screen](#6-admin-pages-fill-the-screen) | Done |
| 7 | [Short reference numbers](#7-short-reference-numbers) | Done, with follow-ups |
| 8 | [Super admin and diocesan rollout](#8-super-admin-and-diocesan-rollout) | Proposed |

Everything marked Done is committed on the `sprint-5` branch. The hosting, email and database plan is in `holyapp-tech-stack-plan.pdf`.

---

## 1. HolyApp logo in the admin topbar

**Done.** `client/src/features/parish-admin/components/AdminTopbar.tsx`

- A round white HolyApp logo sits before the parish seal, with a thin divider between them, matching the parishioner navbar.
- Clicking the logo goes to the admin dashboard.

## 2. Hot reload in Docker on Windows

**Done.** `client/vite.config.ts`, `docker-compose.yml`

- Edits weren't showing because Docker on Windows doesn't pass file-change events into the container, so Vite kept serving the old file.
- Vite now polls for changes when `VITE_USE_POLLING` is set, and the compose file sets it for the client.

## 3. E-signatures on certificates

**Proposed.**

### Starting point
- `certificate_configuration` already stores the signer's name and title for each certificate type, and has an unused `digital_signature_enabled` flag.
- Issued certificates save a copy of the signer's details in `certificate.snapshot`, so old certificates keep the signer they were issued with.
- There is no file storage yet; the seal upload is still a placeholder.

### Database
- New table `certificate_signature`: `id`, `parish_id`, `signatory_name`, `signatory_title`, `image` (bytea), `mime_type`, `sha256`, `uploaded_by`, `uploaded_at`, `retired_at`.
- Rows are never edited. Replacing a signature adds a new row and retires the old one.
- Store images in Postgres for now (a cleaned signature PNG is under 200 KB). Move to object storage once file storage exists.
- `certificate_configuration.signature_id` points to the active signature for each certificate type.
- `certificate.signature_id` is set when a certificate is issued.
- `digital_signature_enabled` becomes the "print signature" switch.

### API
- `POST /parishes/:id/settings/signatures`: parish admin only. Checks the real file type (PNG or JPEG), not just the extension, and writes to the audit log. Needs a higher size limit than Express's default 100 KB, or multipart upload.
- `PUT …/certificate-config/:type/signature`: choose the active signature or turn it off.
- `GET …/signatures/:id/image`: office staff only, for the preview. The PDF embeds the image on the server.

### UI (Settings → Certificates)
- A "Signature" card where the admin uploads an image or draws on a signature pad.
- The browser trims the edges, makes the background transparent and shrinks the image to about 600px wide before upload.
- Live preview of the signature on the certificate.
- "Apply to all certificate types" option.
- Required checkbox: "I am the signatory or have their permission."

### Safety
- Never show the signature image on the public verify page; show "Signed by Fr. X, Parish Priest" instead.
- An image of a signature proves nothing by itself. The QR code and hash check are what prove a certificate is real. Cryptographically signing the PDF is a separate, later project.

### Still to decide
- One signer per certificate type, or one for the whole parish? Suggested: per type, with "apply to all" as the default.
- Can only parish admins upload, or can the priest upload his own?

## 4. Several titles per staff member

**Done (2026-11-09), simpler than proposed below.** Migration 033 adds `honorific`, `post_nominals`,
`clergy_rank`, `role_scope` and `other_titles` (a JSON list) to `parish_personnel`; no `personnel_title`
table. `role_title` stays as the primary title. Clergy comes from `clergy_rank`, so a chaplain stays
clergy. Only one active Parish Priest per parish, and only a priest (checked in the app, on both the
Staff list and Staff accounts). Up to 6 titles, each with an optional "where". The staff list shows the
full name, the primary title and a "+N" chip. **Parked:** dated titles and history ("who was pastor in
2019?"); add the table from the design below if that is needed.

### Problem
- `parish_personnel.role_title` holds one title, and it also decides whether someone is clergy (`isClergy()`).
- A priest who is both Parish Priest and School Chaplain can't be recorded, and changing his title to "Chaplain" would stop the app treating him as clergy.

### How other systems do it
- Church directories and parish software split a name into honorific (Rev. Fr., Msgr.), plain name, post-nominals (SVD, OP), clergy status, and a list of assignments with dates and one primary.
- HR systems do the same: one person, many positions, one primary.

### Database
- New columns on `parish_personnel`: `honorific`, `post_nominals`, `clergy_rank` (`priest`, `deacon`, `religious`, `lay`). `full_name` holds only the plain name.
- New table `personnel_title`: `id`, `parish_id`, `personnel_id`, `title`, `scope` (e.g. "St. Jude School"), `is_primary`, `sort_order`, `start_date`, `end_date`.
- Database rules: one primary title per person; one current Parish Priest per parish.
- Ending a title sets `end_date` instead of deleting, which keeps a history ("who was pastor in 2019?").
- Migration: copy each `role_title` into `personnel_title` as the primary title, update the personnel, staff and schedule code to read the primary title, then drop `role_title`.

### Display
- Staff list: "Rev. Fr. Juan Santos, SVD", primary title below, a "+2" chip for other titles, clergy badge from `clergy_rank`.
- Person form: a Titles section to add, reorder, set primary and end titles.
- Small spaces (schedule picker, notifications) show the primary title only.
- Later: pick the certificate signer from staff with the right title.

### Keep separate
- The account role (`parish_admin`, `parish_staff`) controls what someone can do in the app. The title describes their job in the parish. Keep the link between them loose (today `staffController` matches them through `JOB_TITLES`).

## 5. Marriage requirements

**Proposed.**

### What the research found
- **Universal Church law** sets who may marry, what blocks a marriage and the form of the ceremony. Canon 1066 requires the priest to confirm nothing blocks the marriage; canon 1067 leaves the method to each country's bishops.
- **Countries differ.** The US requires an approved preparation program and dropped the banns. Ireland has its own enquiry form.
- **Dioceses and parishes** set the practical details.
- **In the Philippines** every parish asks for: baptismal and confirmation certificates marked "for marriage purposes", a PSA CENOMAR, a marriage license, Pre-Cana, the canonical interview, and banns on three Sundays. Validity periods differ (certificates 3 or 6 months, CENOMAR about 6 months, license 120 days).

### Problems in HolyApp today
- CENOMAR is listed once, but both parties need one.
- No expiry dates, so an old certificate can be marked verified.
- No special cases: widowed, previously married, one party not Catholic, foreigner, living together 5+ years (Family Code Art. 34 affidavit replaces the license), wedding outside the home parish.
- **Bug:** `ensureRequirementTypes` matches defaults by name, so a default a parish renamed or removed comes back on the next page load.
- The defaults are Philippine rules applied to every parish.

### Suggestion
1. Ship a "Philippines – standard" template. Each parish gets its own editable copy. Each item keeps a stable `template_key`, so removed or renamed items stay that way and new template items arrive as suggestions.
2. Add to `marriage_requirement_type`:
   - `applies_to`: `groom`, `bride`, `each_party` (one row per person) or `couple`
   - `valid_for_days`, checked against the **wedding date**
   - `condition`: `always`, `widowed`, `previously_married`, `mixed_religion`, `foreign_party`, `cohabiting_5yrs`, `outside_home_parish`
   - `replaces`: e.g. the Art. 34 affidavit replaces the license
   - `category`, `sort_order`, and a short note for the couple
3. Ask a few yes/no questions on the application form; the answers decide which conditional requirements appear.
4. Record the document's issue date when staff verify it, and flag "Expired before the wedding".
5. Treat the banns as a parish step with the three Sunday dates, not a document the couple brings.

Existing rows become `couple`, `always`, no expiry.

### Sources
- [Manila Cathedral – Wedding Requirements](https://manilacathedral.com.ph/wedding_requirements)
- [St. Michael BGC – Weddings](https://stmichaelbgc.squarespace.com/weddings)
- [FilipiKnow – Church Wedding Requirements Checklist (PDF)](https://filipiknow.net/wp-content/uploads/2021/06/Church-Wedding-Requirements-Checklist.pdf)
- [Respicio – Getting married without a baptismal certificate](https://www.respicio.ph/commentaries/how-to-get-married-without-a-baptismal-certificate-in-the-philippines)
- [Weddings at Work – Church requirements for marriage with foreigners](https://weddingsatwork.com/?p=113)
- [USCCB – Canon 1067](https://www.usccb.org/beliefs-and-teachings/what-we-believe/canon-law/complementary-norms/canon-1067-the-investigation-of-freedom-to-marry)
- [Adoremus – Canon 1067 and the banns](https://adoremus.org/2007/12/canon-1067/)
- [California Catholic Conference – U.S. Norms for Marriage Preparation](https://cacatholic.org/teachings/marriage-family-life/us-norms-marriage-preparation/)
- [Irish Bishops – Complementary Norm on Canon 1067 (PDF)](https://www.catholicbishops.ie/wp-content/uploads/2012/11/Complementary-Norm-with-Regard-to-Canon-1067-1.pdf)
- [Vatican – Code of Canon Law, canons 1063–1072](https://www.vatican.va/archive/cod-iuris-canonici/esp/documents/cic_libro4_cann1063-1072_sp.html)

## 6. Admin pages fill the screen

**Done.** `client/src/features/parish-admin/components/adminPageStyles.ts` and nine list pages.

- Pages were capped at 1180px, so collapsing the sidebar only added empty margins.
- Pages now fill the space next to the sidebar, up to 1920px. Narrow forms stay at 760px.
- Not yet checked on screen (the seeded test login is rejected by the local database).

## 7. Short reference numbers

**Done, with follow-ups.** `server/migrations/026_reference_numbers.sql`

### What was built
- Format `CR-2026-00042` (certificate requests), `MA-` (marriage applications), `MI-` (Mass intentions). Numbers start at 1 for each parish and restart every year, by Philippine time.
- A database trigger assigns the number on insert, so every code path gets one. A counter table prevents duplicates when two requests are saved at once.
- Existing rows were numbered oldest first. The UUID stays the key in URLs and the API.
- Shown in the requests table ("Request no.", searchable and sortable), the request detail, issue and release modals, the pickup receipt, the find-record page, the parishioner request cards, and the marriage application detail page. Marriage applications can be searched by it.
- Migration 026 has been applied to the local database only.

### Follow-ups
- Show the MI number on the Mass intention pages.
- Certificates issued before this change still store the old long ID.
- Payment receipt numbers (`HA-…`) are a separate system and were left as they are.
- Run migration 026 on every other database.
- At diocese level, add a parish code so numbers are unique everywhere, e.g. `MTC-CR-2026-00042` (see section 8).

## 8. Super admin and diocesan rollout

**Proposed.**

### Where it stands
- No diocese or vicariate in the database; only a free-text `diocese` field.
- One top-level role, `super_admin`, used by HolyApp operators. No role for the chancery or a vicar forane.
- Each user has one `parish_id`, and emails are unique system-wide, so a parishioner who moves or a priest serving two parishes doesn't fit.
- Certificate themes and the "can edit records" switch only fake a save (`delay()` in `superAdminApi.ts`); the Templates page uses sample parishes.
- Migrations are applied by hand.

### 8.1 Diocese → vicariate → parish
- New `diocese` and `vicariate` tables, with `parish.vicariate_id` and `parish.diocese_id`.
- Parish data stays separated by `parish_id`. `scopeParish` gains a diocese scope for people who look across parishes.
- A short code per parish (e.g. `MTC`) for diocese-wide reference numbers.

### 8.2 Role assignments
- Replace `app_user.role` and `parish_id` with a `role_assignment` table: user, role, scope type (platform, diocese, vicariate, parish), scope ID.
- New roles: `diocesan_admin` (chancery), `chancellor` (read-only records, approves exceptions), `vicar_forane` (reports for their vicariate).
- `super_admin` is for HolyApp support only and does not open sacramental records by default. An emergency "view as" needs a reason, shows a banner and is audited.

### 8.3 Diocese-wide standards
- The diocese sets defaults; parishes override them except for locked fields: certificate template and wording, marriage requirements, stole fee ranges, record retention.
- The Templates page shows which parishes have overridden what.

### 8.4 Onboarding many parishes
- A step-by-step onboarding wizard and CSV import of parishes.
- A readiness checklist per parish: seal, signer, fees, at least one admin, staff trained, first ledger digitized.
- Parish status: draft → onboarding → live → suspended, to roll out one vicariate at a time.
- A full page per parish instead of `ManageParishModal`.

### 8.5 Work between parishes
- Notations sent to the baptism parish automatically when a marriage, ordination or profession is recorded.
- Certificate requests sent to the parish that holds the record.
- Marriage permits and letters of freedom to marry passed between parishes.
- Parishioner transfer between parishes.

### 8.6 Parish health dashboard
- Per parish: last activity, overdue requests, average time to issue, ledger digitization progress, failed payments.
- Grouped by vicariate, highlighting parishes that need attention.

### 8.7 Security and the Data Privacy Act
- Required 2FA for every admin role.
- Quarterly access reviews.
- Data Privacy Officer contact, a log of data requests and corrections, a breach log.
- Audit logs exportable and filterable by parish and vicariate, with alerts on unusual logins.

### 8.8 Super admin screens
- One search box across parishes, users and reference numbers.
- A scope picker in the topbar (Diocese › Vicariate › Parish).
- Tables with saved filters, bulk actions and CSV export.
- Announcements to every parish admin's notification bell.

### 8.9 Technical groundwork
- A migration runner (e.g. `node-pg-migrate`) that records which migrations have run.
- File storage for seals, signatures and ledger scans.
- A background job queue for emails and notations.
- Rate limiting on login and public pages.
- Indexes on `parish_id` for the heavy tables.
- Backups and per-parish data export.
- Feature flags per parish.
- Cebuano and Filipino for the parishioner side.

### Suggested order
1. **Groundwork:** finish the unbuilt super admin parts, add the migration runner and file storage, require 2FA.
2. **Structure:** dioceses and vicariates, role assignments, parish codes, scope picker, parish pages.
3. **Rollout tools:** onboarding wizard, CSV import, readiness checklist, health dashboard, announcements.
4. **Shared work:** inherited standards, notations, cross-parish requests and transfers.

Phase 2 should come early: moving from "one user, one parish" to role assignments touches sign-in and every access check, and gets more expensive the longer it waits.
