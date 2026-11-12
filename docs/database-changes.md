# Database changes from the build plan (029–038)

The database changes made while working through the build plan. That is ten migrations, 029 to
038. Earlier migrations (001–028) are not listed here. The SQL is in `server/migrations/`, and how
to run it is in [migrations.md](migrations.md).

Two things hold for all of them:
- No existing data is lost. Where a change touches rows that already exist, those rows are filled
  in (described under each one).
- Only one new table was added: `certificate_reprint` (030). The rest are new columns on existing
  tables.

Funeral booking (C7) needed no database change: it uses the existing `event` and `mass_intention`
tables.

## 029 — Running numbers and donation voids (foundations)

`029_running_numbers_and_donation_voids.sql` · committed

- **New function `next_number(parish, prefix, digits)`:** gives the next number in a series, like
  `DON-2026-000231`. It uses the `reference_counter` table from migration 026, so each parish
  counts from 1 every year (Philippine time), and two saves at the same moment can't get the same
  number.
- **`donation`, new columns:**
  - `receipt_no` is the receipt number. It is unique per parish.
  - `voided_at`, `voided_by` and `void_reason` mean a gift is voided, not deleted. It stays on
    record and drops out of totals.
  - `replaces_id` is set on a correction and points at the gift it replaces. Each gift can be
    replaced only once.
- **Checks:** a void must have a time, a person and a reason, all three together.
- **Existing rows:** gifts already received were numbered, oldest first. Unpaid online gifts get
  their number when they are paid.

## 030 — Certificate numbers and reprints (A2)

`030_certificate_numbers_and_reprints.sql` · committed

- **`reference_counter.prefix`** is widened to 12 characters, to fit keys like `CERT-BAP`.
- **New function `next_count(parish, key)`** returns the next count together with its year.
- **`certificate.certificate_code`:** each issued copy gets a number per parish, sacrament and year,
  like `BAP-2026-000143`. It is unique per parish. The count is kept per sacrament, so changing the
  prefix in Settings doesn't restart it.
- **New table `certificate_reprint`:** one row per reprint of a copy, with who printed it, when and
  why. A reprint is not a new copy.
- **Existing rows:** older copies keep their `CF-` codes, which are already on paper. This year's
  count starts after the copies already issued this year.

## 031 — Did it print correctly? (A3)

`031_certificate_print_confirmation.sql` · committed

- **`certificate`, new columns:**
  - `print_confirmed_at` and `print_confirmed_by` record who checked the printed paper, and when.
  - `void_kind` is either `revoked` or `spoiled` (misprinted). A spoiled copy keeps its number, so
    the count has no gap.
- **Index:** copies still waiting to be confirmed, for the dashboard.
- **Existing rows:** copies issued before this are counted as confirmed. Copies that were already
  void are marked `revoked`.

## 032 — Cheques and bank transfers (D4)

`032_donation_clearing.sql` · committed

- **`donation`, new columns:**
  - `reference` holds the cheque number or the transfer reference.
  - `bank` is the bank the cheque is drawn on.
  - `clearing_status` is `pending`, `cleared` or `bounced`, and starts as `cleared`.
  - `clearing_changed_at` and `clearing_changed_by` record who changed the status, and when.
  - `bounce_reason` is required when a gift bounced.
- Only cleared gifts count in totals. Cash and GCash are cleared from the start.
- **Index:** gifts still pending, for the admin's list.
- **Existing rows:** all counted as cleared.

## 033 — Several titles per staff member (item 4)

`033_personnel_titles.sql` · committed

- **`parish_personnel`, new columns:**
  - `honorific` is the title before the name, like "Rev. Fr.", "Msgr." or "Sr.".
  - `post_nominals` are the letters after the name, like "SVD".
  - `clergy_rank` is `priest`, `deacon`, `religious` or `lay`. It is worked out from the honorific
    on every save.
  - `role_scope` is where the main title applies, like a chapel or a school.
  - `other_titles` is a list of further titles, each with a place.
- **Existing rows:** honorifics and letters after the name were moved out of `full_name`, and each
  person's clergy rank was worked out. Priests and deacons without an honorific got one.
- Only one active Parish Priest per parish. The server checks this, not the database.

## 034 — Marriage requirements each parish can set (5a)

`034_marriage_requirement_rules.sql` · committed

- **`marriage_requirement_type`, new columns:**
  - `template_key` is a permanent key for each built-in item, unique per parish.
  - `condition` means the item applies only when an answer is yes (for example, widowed adds the
    late spouse's death certificate).
  - `skip_when` means the item no longer applies when an answer is yes (for example, the Art. 34
    affidavit replaces the marriage licence).
  - `valid_for_days` is how long a document stays valid.
  - `sort_order`, `note` and `active` (turned off rather than deleted).
- **`marriage_application_requirement.document_date`** is the date on the document. Staff enter it
  when they mark the document received.
- **`marriage_application.circumstances`** holds the couple's yes/no answers.
- **Existing rows:** built-in items were matched to their keys and given notes. The CENOMAR was
  split into one for the groom and one for the bride. On open applications, the bride's copy has
  the same "received" status as the old one.

## 035 — Schedule assignments point at the person (C2)

`035_schedule_person_links.sql` · committed

- **`parish_recurring_commitment.assigned_to`** (regular Masses) and
  **`parish_schedule_override.assigned_to`** (a change to one Mass) link to `parish_personnel`. The
  name shown always comes from the staff record.
- The typed-name columns now hold only a guest's name, such as a visiting priest.
- **Existing rows:** typed names that matched a staff member were linked to them. The rest stay as
  guests.

## 036 — Record each sacrament in the register (C11)

`036_register_from_schedule.sql` · committed

- **`baptism`, `confirmation`, `marriage` and `death`** each get `schedule_event_id`, the schedule
  event the entry was recorded from. Baptisms and confirmations are done in batches, so many
  entries can share one event. Each table has an index on this column.
- **Existing rows:** upcoming sacrament events are marked as still to be recorded. Past events are
  left as they were.

## 037 — The parish's own feast days (B5 + C5)

`037_parish_local_dates.sql` · committed

- **`parish_settings`, new columns:**
  - `fiesta_date` is kept as month and day ("MM-DD"), because it comes round every year.
  - `local_feasts` is a list of other local feasts, such as a chapel's patron.
- The Church calendar itself is worked out in code, not stored.

## 038 — Banns (5b)

`038_marriage_banns.sql` · committed

- **`marriage_application`, new columns:**
  - `banns` holds:
    - where each party lives;
    - the three Sundays;
    - which Sundays have been announced;
    - whether each party's banns came back signed and stamped from their parish;
    - whether the bishop waived the banns.
  - `wedding_elsewhere` marks a couple who marry in another parish but have their banns announced
    here. These applications don't appear in the main list and have no requirements checklist.
  - `wedding_parish` is the parish where they will marry.
