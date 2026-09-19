# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two primary audiences, treated equally as two surfaces of one product:

- **Parishioners** of a Philippine Catholic parish, in the situation of needing a sacramental certificate (for school, civil, or family use), keeping certificates they already received, giving to the parish, or offering a Mass intention. They find their parish, sign in or register, and act in that parish’s portal.
- **Parish office** — parish admin and staff (priest, parish secretary, admin staff) running daily operations: searching and maintaining sacramental registers, fulfilling certificate requests (online and walk-in), scheduling, recording donations, and managing staff accounts and fees.

Public visitors can donate or request a Mass intention without an account via the give flow. A platform **super_admin** is the head of the installation: they sign in separately (`/super-admin/login`) and can see every parish’s accounts (admin, staff, and parishioner) across HolyApp. Audit, reports, and parish onboarding from the HTML prototype are not built yet.

## Product Purpose

HolyApp exists so a parish can keep sacramental records operationally in software, and so people can request certificates that the office matches to the parish register and issues — into a digital wallet or for physical pickup — without the parishioner having to return to the office for every copy.

Success means the office can find and verify a register entry, issue a certificate that matches the book, and the parishioner can receive and keep that certificate. Donations, Mass intentions, and the parish schedule support parish life around that job.

## Positioning

HolyApp’s mechanism is parish-scoped: the office digitizes the sacramental register; parishioners (or walk-ins) request a certificate; staff match the request to the register entry and issue or release it (digital wallet or sealed pickup). A generic church website, CMS, or folder of scanned register pages cannot truthfully copy that request-to-register-to-wallet loop. Giving, intentions, and schedule are supporting, not the claim.

The physical parish register remains the canonical source of truth. The app is the operational copy staff enter and verify against (including book, page, and line when recorded).

## Operating Context

- Catholic parish office in the Philippines: secretary or staff at a desk, parishioners at the window or on a phone, priest overseeing.
- Sacramental registers for baptism, confirmation, marriage, and death; later annotations (e.g. a later sacrament noted on a baptismal record).
- Certificate request lifecycle: pending → processing → released or rejected; payment may be required; delivery is digital or pickup (print/seal before “ready for pickup”).
- Per-parish identity: name, address, diocese/archdiocese, patron, seal, tagline. The parish is the face people see; HolyApp is the platform.
- Public giving without login (`/give`): donate (GCash in current copy) or request a Mass intention.
- Logged-in parishioner portal: requests, certificate wallet, donate, intentions, account.
- Parish admin: dashboard, requests (find record, issue, release), registers, schedule, donations, settings (profile, fees, staff, account security).
- Mock operating locale in the repo: Cebu / Archdiocese of Cebu, PHP contact patterns, GCash among donation methods.

## Capabilities and Constraints

Confirmed in the current frontend prototype:

- Roles: `parishioner`, `parish_admin`, `parish_staff`, `super_admin`.
- Auth: find parish, parish login, parishioner register, OTP verification (mock). Super admin has a separate login and is rejected on the parish portal.
- Parishioner: certificate request wizard, request list/tracker, certificate wallet, donations, Mass intentions, account.
- Admin: baptism, confirmation, marriage, and death registers (search, create, edit, detail, annotations); request queue with find-record, issue, and release; schedule; donations; parish profile; service fees; staff accounts; certificate configuration (per-sacrament signatory, footer, numbering); account security.
- Settings stubs not yet built: Mass intention rules, marriage application requirements, payment configuration, data & privacy.
- Certificate verify route (`/verify/:hash`) is a placeholder.
- Super admin: separate login; HTML-style dashboard (parishes, admins, audit, register/request counts from current mocks); parish list and cross-parish accounts directory. Audit page, reports, certificate templates, and parish onboarding are not built.

Constraints:

- Built for Philippine Catholic parishes, not a generic global church product.
- This repository is a frontend prototype on mock APIs. There is no live backend, live payments, or real certificate PDF generation yet. Do not treat mock fulfillment as production-ready issuance.
- Do not design unbuilt surfaces (super admin audit/reports/onboarding, live payments, PDF certificates, disabled settings) as if they exist.
- Identity follows the current database: `app_user` has first/middle/last name and `active`/`suspended`; the `parishioner` table was dropped; parishioners are users with that role. Parish has no subscription/status column. Certificate configuration is per-parish, not a platform template library.

Undecided: production accessibility standard; diocesan rollout scope beyond a single parish; real payment and certificate-file pipelines.

## Brand Commitments

- Product name: **HolyApp** (repo: `holyapp`).
- Voice: pastoral and careful; scripture-friendly; not corporate SaaS tone. Each parish’s name, seal, and tagline brand the experience.
- Existing product line (login panel): “Your sacramental records, kept with care and always within reach.” Fallback scripture when a parish has no tagline: “Let all that you do be done in love.” (1 Corinthians 16:14).

## Evidence on Hand

- Mock parishes and profile data under `src/services/mocks/` (e.g. Santuario Arquidiocesano de Nuestra Señora del Carmen; San Nicolas de Tolentino Parish; Sto. Niño de Cebu Parish profile). Parish seal asset: `src/assets/mtcarmelllogo.png`.
- Mock users, registers, requests, certificates, schedule, donations, staff, and login activity. These are demo fixtures, not live parish records.
- No real testimonials, case studies, press, pricing, or production metrics. Future work must not fabricate them.

## Product Principles

1. The parish register is canonical; the product is the operational copy and the path from request to verified issue — never a replacement for the book.
2. Parishioner and parish-office surfaces are equal halves of one product; when they conflict, keep both jobs complete rather than collapsing one into the other.
3. The parish’s identity is what people trust; HolyApp stays the platform behind it.
4. Design for Philippine Catholic parish life (GCash, diocese, office window, walk-in and online) rather than generic church software.
5. Do not pretend unbuilt capabilities exist: mock data, missing PDFs, and the super_admin surface stay labeled as such.
