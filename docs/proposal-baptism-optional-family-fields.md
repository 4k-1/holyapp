# Proposal: optional family fields on baptism records

**Status:** proposed. Tried on the local `ocr-local` branch only.
**Touches:** the `baptism` table, the baptism API, and the Add/Edit Baptismal Record form.

## Summary

Make the middle name, both parents and all four grandparents optional on a baptism record.
If **both** parents are blank, a remark becomes required, explaining why (for a foundling:
when, where and by whom the child was found).

Every other required field stays required.

## Why

The app currently requires fields that real baptism registers often don't have. Any row
digitized from an old ledger, or entered for a child of an unmarried mother or a foundling,
can't be saved as things stand.

The rule that governs what a baptism register must hold is **canon 877** of the Code of
Canon Law:

- **§1**: record the name of the baptized, the minister, the parents, the sponsors and any
  witnesses, the place and date of baptism, and the date and place of birth.
  **Grandparents are not asked for.**
- **§2**: for a child of an unmarried mother:
  - The mother's name is entered if her maternity is publicly known, or if she asks in
    writing or before two witnesses.
  - The father's name is entered only if a public document, or his own declaration before
    the pastor and two witnesses, proves paternity.
  - Otherwise no parent is entered.
- **§3**: for an adopted child, the adopting parents are entered.
- **Foundlings** (from a commentary on Philippine registers): the register should state when,
  where and by whom the child was found, and roughly when the child was born.

Other real-world gaps:

- **Middle names.** Old registers usually give only a middle initial ("R."). A child
  recognised by the mother alone carries her surname, with no middle name.
- **Grandparents.** Many register books have no grandparent column at all.

Sources:
- [Code of Canon Law, Book IV, cann. 834–878 (Vatican)](https://www.vatican.va/archive/cod-iuris-canonici/eng/documents/cic_lib4-cann834-878_en.html)
- [Commentary on baptismal registers, foundlings and legitimation (UP Diliman Main Library repository)](https://repository.mainlib.upd.edu.ph/omekas/files/original/941cf6342dc4a7b457ac34753e819f26267f00bd.pdf)

## Required fields, before and after

| Field | Before | After | Reason |
|---|---|---|---|
| First name, last name | Required | Required | Can. 877 §1 |
| Middle name | Required | **Optional** | Often only an initial, or none |
| Father's first / last name | Required | **Optional** | Can. 877 §2 |
| Mother's first / last name | Required | **Optional** | Can. 877 §2, foundlings |
| A parent's last name | — | Required **if** that parent's first name is given | Avoids half-entered names |
| Both parents blank | — | **Remarks required** | Foundling practice |
| Paternal / maternal grandparents (4) | Required | **Optional** | Not in can. 877 |
| Date of birth, date of baptism | Required | Required | Can. 877 §1 |
| Place of baptism, minister | Required | Required | Can. 877 §1 |
| Book, page, entry number | Required | Required | The register reference cited on certificates |
| Sex, place of birth, address, legitimacy, remarks | Optional | Optional (remarks: see above) | No change |

## Database change

New migration `server/migrations/027_baptism_optional_family.sql`:

```sql
ALTER TABLE baptism ALTER COLUMN middle_name DROP NOT NULL;
ALTER TABLE baptism ALTER COLUMN father_first_name DROP NOT NULL;
ALTER TABLE baptism ALTER COLUMN father_last_name DROP NOT NULL;
ALTER TABLE baptism ALTER COLUMN mother_first_name DROP NOT NULL;
ALTER TABLE baptism ALTER COLUMN mother_last_name DROP NOT NULL;
ALTER TABLE baptism ALTER COLUMN paternal_grandfather DROP NOT NULL;
ALTER TABLE baptism ALTER COLUMN paternal_grandmother DROP NOT NULL;
ALTER TABLE baptism ALTER COLUMN maternal_grandfather DROP NOT NULL;
ALTER TABLE baptism ALTER COLUMN maternal_grandmother DROP NOT NULL;
```

- Only constraints change: no columns are added or removed, and no existing rows are touched.
- It is safe to run on a database that already has records.
- The "remark required when both parents are blank" rule lives in the API, not the database,
  so it can change without another migration.

To apply locally (migrations here are run by hand):

```bash
docker compose exec -T postgres psql -U holyapp -d holyapp_db -v ON_ERROR_STOP=1 < server/migrations/027_baptism_optional_family.sql
```

### Undoing it

`SET NOT NULL` fails while any row has a blank in that column. Fill those rows first, and
agree on the placeholder with the team, because it will show on records and certificates:

```sql
UPDATE baptism SET middle_name = '' WHERE middle_name IS NULL;
-- …the same for each column, then:
ALTER TABLE baptism ALTER COLUMN middle_name SET NOT NULL;
-- …the same for each column
```

## Code changes that go with it

| Where | Change |
|---|---|
| `server/src/controllers/baptismController.js` | `parseBaptismBody` makes the fields above optional. It adds the "parent's last name if first name" and "remark if no parent" rules. `toBaptismalRecord` returns `''` for blank names, so existing screens keep receiving text. |
| `client/.../baptismal/AdminBaptismalRecordFormPage.tsx` | Removes `required` from those inputs. A parent's last name is required only when their first name is filled. Remarks are required when no parent is entered. Notes explain when parents may be blank. |
| `client/.../baptismal/AdminBaptismalRecordDetailPage.tsx` | Shows "Not recorded" for a missing parent and "—" for missing grandparents. |

Nothing else reads these columns in a way that breaks on blanks:
- Certificates build names with `filter(Boolean)`.
- The confirmation and marriage tables are separate and unchanged.

## Tested (local only)

- Saved a record with no father, only a middle initial and no grandparents. It saved, and the
  record page shows "Father's name: Not recorded".
- The API refuses "both parents blank, no remark" with: *Both parents are blank. Add a remark
  saying why (for a foundling: when, where and by whom the child was found).*
- The API refuses "mother's first name without a last name" with: *Mother's last name is
  required when a first name is given.*

## Questions for the team

1. **Certificates when a parent is blank.** Should the field print empty, print "—", or
   disappear from the certificate?
2. **Foundlings.** Is a remark enough, or should a "Foundling" option sit next to
   Legitimate / Illegitimate?
3. **Adopted children (can. 877 §3).** Should the form say which parents are adoptive?
4. **Godparents.** Can. 877 §1 asks for sponsors (godparents). On `ocr-local` they are now
   saved in the existing `sponsor` and `sacrament_sponsor_assignment` tables (no migration):
   at most two, one godfather and one godmother at most (can. 873), with a new sponsor row
   per baptism rather than matching people by name. Is that the behaviour the team wants?
5. **Date of birth.** It stays required. A foundling gets an approximate date with a remark.
   Is that acceptable, or should it be optional for foundlings?
