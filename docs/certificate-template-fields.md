# Printed certificate templates: data the database doesn't have yet

The new printed templates (`client/src/features/parish-admin/components/certificate/ParishCertificate.tsx`,
data types in `certificateData.ts`) print the parish's current wording for three certificates:

| Type | Paper | Title |
| --- | --- | --- |
| `BAPTISM` | A5 (148 × 210 mm) | CERTIFICATE OF BIRTH & BAPTISM |
| `CONFIRMATION` | Letter (8.5 × 11 in) | CERTIFICATE OF CONFIRMATION |
| `DEATH` | Letter (8.5 × 11 in) | CERTIFICATE OF DEATH |
| `MARRIAGE` | Two pages of 8.5 × 13 in | CERTIFICATE OF MARRIAGE: the government's Municipal Form No. 97 (Revised August 2016), `MarriageCertificate.tsx` |

Preview with dummy data: `/{parishSlug}/admin/certificate-templates` (staff sign-in needed).

Values the database has no column for print as a blank underline. These are the gaps, written
as migrations in the style of `server/migrations/`.

## Missing columns

| Printed field | Where it should live | Suggested migration |
| --- | --- | --- |
| City in "Issued this … at [Parish Name], **[City]** …" (Confirmation, Death) | Parish settings. `parish.address` is one free-text line, so the city can't be picked out of it reliably. | `ALTER TABLE parish ADD COLUMN IF NOT EXISTS city VARCHAR(100);` |
| **Parish of Origin** (Confirmation) | `confirmation` | `ALTER TABLE confirmation ADD COLUMN IF NOT EXISTS parish_of_origin VARCHAR(255);` |
| **Son of / Daughter of** label (Death): needs the deceased's sex | `death` has no `sex` (baptism and confirmation do) | `ALTER TABLE death ADD COLUMN IF NOT EXISTS sex VARCHAR(10);` Without it the label prints "Son/Daughter of". |
| **Son/Daughter of** value: the deceased's parents (Death) | Only as free-text `death_kin` rows today (relation typed by hand, e.g. "Father"), so they can't be found reliably. | Either `ALTER TABLE death ADD COLUMN IF NOT EXISTS father_name VARCHAR(255), ADD COLUMN IF NOT EXISTS mother_name VARCHAR(255);` or fix `death_kin.relation_to_deceased` to a set list that includes `father` and `mother`. |
| Signatory from "the issuing staff's assigned priest" | No link from a staff account to a priest. Today the name and title come from `certificate_configuration.signatory_name` / `signatory_title` for each sacrament, which works. | Only if wanted: `ALTER TABLE app_user ADD COLUMN IF NOT EXISTS assigned_priest_id UUID REFERENCES parish_personnel(id);` |

### Certificate of Marriage (Form 97)

The form's wording, boxes and red ink (`#e4367f`, sampled from the form) are kept as printed;
typed values are black. Items the register doesn't keep print blank, to be completed by hand:

| Form item | Status |
| --- | --- |
| Province, City/Municipality, Registry No. (header) | Assigned by the civil registrar; blank. |
| 3. Place of Birth: City / Province / Country | `marriage_party.birthplace` is one line; it prints across the three boxes. |
| 8, 10, 12. Middle name of father, mother, consent giver | Only a middle initial is stored (`father_middle_initial`, …). |
| 15. Place of Marriage: City / Province | `marriage.marriage_address` is one line; it prints across both boxes. |
| 18. Marriage settlement boxes, signatures, fingerprint | By hand. |
| 19. Marriage license no., date and place; Art. under E.O. 209 | Not stored: `ALTER TABLE marriage ADD COLUMN IF NOT EXISTS license_no VARCHAR(50), ADD COLUMN IF NOT EXISTS license_issued_on DATE, ADD COLUMN IF NOT EXISTS license_issued_at VARCHAR(255);` |
| 19. Officer's position, registry no. and expiry | Not stored. Religion prints "Roman Catholic". |
| 20a/20b. Witnesses | Two stored (`witness_one`, `witness_two`); the form has room for 12. |
| 21, 22, Remarks/Annotations, the code boxes, both affidavits on page 2 | Civil registrar / by hand; blank. |

The parish name, register line (Book, Page, Line), issue date and the QR verification area
print in a strip under the form on page 2.

## Present, but not wired up

- **Confirmation sponsors**: `sacrament_sponsor_assignment` accepts `sacrament_type = 'confirmation'`,
  but the confirmation form and `confirmationController.js` don't save or return sponsors.
- **Baptism "Line"**: this is `baptism.entry_number` (also on `confirmation` and `death`).
- **Remarks / Annotations**: `baptism.remarks` plus the `annotation` table.
- **Verification**: `certificate.id`, `certificate.certificate_code` (Control No.) and `certificate.hash` all exist.

## Mismatches to decide

1. **Number of baptism sponsors.** The printed form says "Sponsors" and has room for 4.
   The app calls them godparents and allows at most 2, one godfather and one godmother
   (can. 873; see `server/src/utils/baptismGodparents.js`). The template keeps the printed
   wording and prints up to 4, but the app will only ever supply 2.
2. **What the QR code points to.** The spec says `{APP_URL}/verify/{certificateId}`. The
   existing public page is `/verify/:hash`, and `GET /certificates/verify/:hash` looks the
   certificate up by its hash. Issued certificates therefore keep encoding the stored verify
   link (`certificate.qr_code`, which ends in the hash), so every printed QR code resolves
   today. `CertificateVerification.certificateId` is there for when the endpoint accepts ids.
   The caption's "SHA-256" line shows the first 16 characters of `certificate.hash`, which is
   currently 16 random bytes in hex, not a SHA-256 digest of the certificate.
3. **Who is listed as the baptism minister.** `baptism.minister` is free text. The line
   prints "by the Rev." before it, so a leading "Rev." in the stored name is dropped to avoid
   "Rev. Rev."; a stored "Fr. Jose Ramirez" still reads "by the Rev. Fr. Jose Ramirez".
4. **Footer / disclaimer setting.** The new baptism, confirmation and death certificates
   follow the parish's printed wording and don't print the footer text from Settings
   (marriage prints the government form, which has none).
