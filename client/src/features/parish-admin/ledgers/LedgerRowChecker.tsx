// Check a register reading one row at a time and save it as a baptismal record in the
// same pass. Each page's handwriting for the row sits right above the record fields filled
// from it (names already split into first / middle / last), so there's one check, not a
// check and then a form. Enter saves the row and moves on.
//
// Field states: amber = needs a look (the engine was unsure, an app check caught something,
// or it's needed to save), teal = corrected by a person, plain = fine.
// Saving needs both pages (the names are on the left, the baptism on the right); with one
// page the screen checks rows without saving.
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AdminButton,
  AdminInput,
  AdminSelect,
  AdminTextarea,
} from "@/features/parish-admin/components/AdminForm";
import type {
  OcrEntry,
  OcrPageSide,
  LedgerScanResult,
} from "@/features/parish-admin/ledgers/api/ledgerScanApi";
import {
  LEFT_COLUMNS,
  RIGHT_COLUMNS,
  fieldNames,
  reasonsFor,
  rowReasons,
  valueOf,
} from "@/features/parish-admin/ledgers/ocrColumns";
import {
  draftFromValues,
  godparentsOf,
  problemsToSave,
  type DraftGroup,
  type DraftNote,
  type LedgerRowHandoff,
  type RecordDraft,
} from "@/features/parish-admin/ledgers/ledgerToRecord";
import { RowStrip } from "@/features/parish-admin/ledgers/RowStrip";
import {
  createBaptismalRecord,
  listBaptismalRecords,
} from "@/features/parish-admin/records/api/baptismalRecordsApi";
import { useAsync } from "@/hooks/useAsync";
import type { Parish } from "@/types";

type DraftKey = keyof RecordDraft;

interface Field {
  name: DraftKey;
  label: string;
  kind?: "date" | "legitimacy" | "long" | "role";
  /** Its width in the group's grid when that differs by form width (literal classes). */
  span?: string;
}

/** One part of the record, shown under the page it was read from. */
interface Group {
  key: DraftGroup;
  label: string;
  side: OcrPageSide;
  /** The register columns it comes from: for the engine's doubts and the box on the strip. */
  source: string[];
  fields: Field[];
  /** How its inputs sit side by side on wider screens (literal classes, so Tailwind keeps
   *  them). Names stay on one line: first, middle, last (and role). */
  layout: string;
  /** The register's value to show as "written as", for dates. */
  written?: string;
}

const GROUPS: Group[] = [
  {
    key: "entryNumber",
    label: "Entry no.",
    side: "left",
    source: ["entryNumber"],
    fields: [{ name: "entryNumber", label: "Entry no." }],
    layout: "grid-cols-[8rem]",
  },
  {
    key: "child",
    label: "Child",
    side: "left",
    source: ["childFullName"],
    fields: [
      {
        name: "firstName",
        label: "First name",
        span: "col-span-2 @min-[22rem]:col-span-1",
      },
      { name: "middleName", label: "Middle" },
      { name: "lastName", label: "Last name" },
    ],
    layout:
      "grid-cols-[4.5rem_minmax(0,1fr)] @min-[22rem]:grid-cols-[minmax(0,1fr)_4.5rem_minmax(0,1fr)]",
  },
  {
    key: "placeOfBirth",
    label: "Place of birth",
    side: "left",
    source: ["placeOfBirth"],
    fields: [{ name: "placeOfBirth", label: "Place of birth" }],
    layout: "grid-cols-1",
  },
  {
    key: "dateOfBirth",
    label: "Date of birth",
    side: "left",
    source: ["dateOfBirth"],
    fields: [{ name: "dateOfBirth", label: "Date of birth", kind: "date" }],
    layout: "@min-[14rem]:grid-cols-[12rem]",
    written: "dateOfBirthAsWritten",
  },
  {
    key: "legitimacy",
    label: "Legitimacy",
    side: "left",
    source: ["legitimacy"],
    fields: [
      { name: "legitimacyStatus", label: "Legitimacy", kind: "legitimacy" },
    ],
    layout: "@min-[14rem]:grid-cols-[12rem]",
  },
  {
    key: "father",
    label: "Father",
    side: "left",
    source: ["fatherName"],
    fields: [
      { name: "fatherFirstName", label: "First name" },
      { name: "fatherLastName", label: "Last name" },
    ],
    layout: "grid-cols-2",
  },
  {
    key: "mother",
    label: "Mother",
    side: "left",
    source: ["motherName"],
    fields: [
      { name: "motherFirstName", label: "First name" },
      { name: "motherLastName", label: "Last name" },
    ],
    layout: "grid-cols-2",
  },
  {
    key: "address",
    label: "Address",
    side: "right",
    source: ["residence"],
    fields: [{ name: "address", label: "Address" }],
    layout: "grid-cols-1",
  },
  {
    key: "dateOfBaptism",
    label: "Date of baptism",
    side: "right",
    source: ["dateOfBaptism"],
    fields: [{ name: "dateOfBaptism", label: "Date of baptism", kind: "date" }],
    layout: "@min-[14rem]:grid-cols-[12rem]",
    written: "dateOfBaptismAsWritten",
  },
  {
    key: "minister",
    label: "Minister",
    side: "right",
    source: ["minister"],
    fields: [{ name: "minister", label: "Minister" }],
    layout: "grid-cols-1",
  },
  // The register's "sponsors" are the godparents.
  ...([1, 2] as const).map((n): Group => ({
    key: `godparent${n}`,
    label: `Godparent ${n}`,
    side: "right",
    source: [`sponsor${n}`],
    fields: [
      {
        name: `godparent${n}First`,
        label: "First name",
        span: "col-span-2 @min-[22rem]:col-span-1",
      },
      { name: `godparent${n}Middle`, label: "Middle" },
      { name: `godparent${n}Last`, label: "Last name" },
      {
        name: `godparent${n}Role`,
        label: "Role",
        kind: "role",
        span: "col-span-2 @min-[22rem]:col-span-3 @min-[32rem]:col-span-1",
      },
    ],
    layout:
      "grid-cols-[4.5rem_minmax(0,1fr)] @min-[22rem]:grid-cols-[minmax(0,1fr)_4.5rem_minmax(0,1fr)] @min-[32rem]:grid-cols-[minmax(0,1fr)_4.5rem_minmax(0,1fr)_7.5rem]",
  })),
  {
    key: "remarks",
    label: "Remarks",
    side: "right",
    source: ["observations"],
    fields: [{ name: "remarks", label: "Remarks", kind: "long" }],
    layout: "grid-cols-1",
  },
];

const SIDE_LABEL: Record<OcrPageSide, string> = {
  left: "Baptismal (left page)",
  right: "Register (right page)",
};

const ALL_COLUMNS = [...LEFT_COLUMNS, ...RIGHT_COLUMNS];
const columnFor = (field: string) => ALL_COLUMNS.find((c) => c.field === field);

function sidesOf(result: LedgerScanResult): OcrPageSide[] {
  return result.side === "spread" ? ["left", "right"] : [result.side];
}

/** The register's own fields for an entry (dates as AsWritten / Iso). */
function ledgerValues(entry: OcrEntry) {
  return Object.fromEntries(
    ALL_COLUMNS.flatMap(fieldNames).map((f) => [f, valueOf(entry, f)]),
  ) as Record<string, string | null>;
}

/** Why the engine or the app's checks want a look at a group. */
function ocrReasons(entry: OcrEntry, group: Group) {
  return group.source.flatMap((f) => {
    const column = columnFor(f);
    return column ? reasonsFor(entry, column) : [];
  });
}

/** Groups flagged by the engine, a check, or a "check" note (before any correction). */
function flaggedGroups(
  entry: OcrEntry,
  notes: DraftNote[],
  sides: OcrPageSide[],
) {
  return GROUPS.filter(
    (g) =>
      sides.includes(g.side) &&
      g.fields.length > 0 &&
      (ocrReasons(entry, g).length > 0 ||
        notes.some((n) => n.group === g.key && n.tone === "check")),
  );
}

const inputId = (name: string) => `rec-${name}`;

export function LedgerRowChecker({
  result,
  imageUrl,
  imageBlob,
  source,
  parish,
}: {
  result: LedgerScanResult;
  /** The uploaded photo; null when there's no single picture to cut rows from. */
  imageUrl: string | null;
  /** The page photo, handed to the full record form for its row picture. */
  imageBlob: Blob | null;
  /** The stored page being read: where it sits in the register, and the rows already saved
   *  as records from it. */
  source: {
    pageId: string;
    bookNumber: string;
    pageNumber: string;
    savedRows: Record<number, string>;
  };
  parish: Parish;
}) {
  const navigate = useNavigate();
  const { entries } = result;
  const sides = sidesOf(result);
  const groups = GROUPS.filter((g) => sides.includes(g.side));
  // The names are on the left page and the baptism on the right: saving needs both.
  const canSave = sides.length === 2;

  // What the reading gives, per row: the record draft and notes on it.
  const initial = useMemo(
    () =>
      Object.fromEntries(
        entries.map((e) => [e.row, draftFromValues(ledgerValues(e), e.row)]),
      ) as Record<number, { draft: RecordDraft; notes: DraftNote[] }>,
    [entries],
  );

  // Start at the first row that needs a look.
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      entries.findIndex(
        (e) => flaggedGroups(e, initial[e.row].notes, sides).length > 0,
      ),
    ),
  );
  const [edits, setEdits] = useState<Record<number, Partial<RecordDraft>>>({});
  const [register, setRegister] = useState({
    bookNumber: source.bookNumber,
    pageNumber: source.pageNumber,
    placeOfBaptism: parish.name,
  });
  const [saved, setSaved] = useState<Record<number, string>>(source.savedRows);
  const [confirmed, setConfirmed] = useState<Set<number>>(() => new Set());
  const [showProblems, setShowProblems] = useState<Set<number>>(
    () => new Set(),
  );
  const [focusGroup, setFocusGroup] = useState<DraftGroup | null>(null);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Records already in the parish, to stop a second record for the same entry.
  const { data: existing } = useAsync(
    () => (canSave ? listBaptismalRecords(parish.id) : Promise.resolve([])),
    [parish.id, canSave],
  );

  // Alt + ↓ / ↑ move between rows without leaving the keyboard.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!e.altKey) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIndex((i) => Math.min(entries.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [entries.length]);

  const entry = entries[index];

  function draftOf(row: number): RecordDraft {
    return {
      ...initial[row].draft,
      ...edits[row],
      bookNumber: register.bookNumber.trim(),
      pageNumber: register.pageNumber.trim(),
    };
  }

  function corrected(row: number, group: Group) {
    const before = initial[row].draft;
    const now = draftOf(row);
    return group.fields.some(
      (f) => (now[f.name] ?? "") !== (before[f.name] ?? ""),
    );
  }

  // Groups that still want a look: flagged, and nobody has corrected them yet.
  function openGroups(e: OcrEntry) {
    return flaggedGroups(e, initial[e.row].notes, sides).filter(
      (g) => !corrected(e.row, g),
    );
  }

  function duplicateOf(row: number) {
    const d = draftOf(row);
    if (!d.bookNumber || !d.pageNumber) return undefined;
    return existing?.find(
      (r) =>
        r.bookNumber === d.bookNumber &&
        r.pageNumber === d.pageNumber &&
        r.entryNumber === d.entryNumber.trim(),
    );
  }

  function setField(name: DraftKey, value: string) {
    if (!entry) return;
    setEdits((prev) => ({
      ...prev,
      [entry.row]: { ...prev[entry.row], [name]: value },
    }));
    setSaveError("");
  }

  function goTo(i: number) {
    if (i < 0 || i >= entries.length) return;
    setIndex(i);
    setFocusGroup(null);
    setSaveError("");
  }

  // Next row not yet done, after this one, wrapping round to the top.
  function goToNextOpen(done: (row: number) => boolean) {
    for (let step = 1; step < entries.length; step++) {
      const i = (index + step) % entries.length;
      if (!done(entries[i].row)) return goTo(i);
    }
    return undefined;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!entry || saving) return;
    const row = entry.row;

    if (!canSave) {
      const now = new Set(confirmed).add(row);
      setConfirmed(now);
      goToNextOpen((r) => now.has(r));
      return;
    }
    if (saved[row] || duplicateOf(row)) {
      goToNextOpen((r) => Boolean(saved[r]));
      return;
    }

    const draft = draftOf(row);
    const problems = problemsToSave({
      ...draft,
      placeOfBaptism: register.placeOfBaptism,
    });
    const firstGroup = groups.find((g) => problems[g.key]);
    if (firstGroup || problems.register) {
      setShowProblems((prev) => new Set(prev).add(row));
      const id = firstGroup
        ? inputId(firstGroup.fields[0]?.name ?? "")
        : inputId(
            !register.bookNumber.trim()
              ? "bookNumber"
              : !register.pageNumber.trim()
                ? "pageNumber"
                : "placeOfBaptism",
          );
      document.getElementById(id)?.focus();
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      const record = await createBaptismalRecord(parish.id, {
        firstName: draft.firstName.trim(),
        middleName: draft.middleName.trim(),
        lastName: draft.lastName.trim(),
        sex: undefined,
        dateOfBirth: draft.dateOfBirth,
        placeOfBirth: draft.placeOfBirth.trim() || undefined,
        dateOfBaptism: draft.dateOfBaptism,
        placeOfBaptism: register.placeOfBaptism.trim(),
        legitimacyStatus: draft.legitimacyStatus || undefined,
        address: draft.address.trim() || undefined,
        minister: draft.minister.trim(),
        fatherFirstName: draft.fatherFirstName.trim(),
        fatherLastName: draft.fatherLastName.trim(),
        motherFirstName: draft.motherFirstName.trim(),
        motherLastName: draft.motherLastName.trim(),
        paternalGrandfather: "",
        paternalGrandmother: "",
        maternalGrandfather: "",
        maternalGrandmother: "",
        withMarriageCertificate: false,
        withBirthCertificate: false,
        bookNumber: draft.bookNumber,
        pageNumber: draft.pageNumber,
        entryNumber: draft.entryNumber.trim(),
        remarks: draft.remarks.trim() || undefined,
        godparents: godparentsOf(draft),
        ledgerPageId: source.pageId,
        ledgerRow: row,
      });
      const now = { ...saved, [row]: record.id };
      setSaved(now);
      goToNextOpen((r) => Boolean(now[r]));
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Couldn't save this record.",
      );
    } finally {
      setSaving(false);
    }
  }

  // For the rare row that needs more (grandparents, sex, documents on file).
  function openFullForm() {
    if (!entry) return;
    const handoff: LedgerRowHandoff = {
      source: "ledger-ocr",
      file: imageUrl ? imageBlob : null,
      ledgerPageId: source.pageId,
      page: result.page,
      cells: result.cells.filter((c) => c.entry === entry.row),
      row: entry.row,
      values: ledgerValues(entry),
      bookNumber: register.bookNumber.trim(),
      pageNumber: register.pageNumber.trim(),
      draft: draftOf(entry.row),
    };
    navigate(`/${parish.slug}/admin/records/baptismal/new`, { state: handoff });
  }

  if (!entry) return null;

  const row = entry.row;
  const draft = draftOf(row);
  const problems = showProblems.has(row)
    ? problemsToSave({ ...draft, placeOfBaptism: register.placeOfBaptism })
    : {};
  const duplicate = canSave && !saved[row] ? duplicateOf(row) : undefined;
  // A row is done once it's in records: saved here, or already there before.
  const isDone = (r: number) =>
    canSave ? Boolean(saved[r] || duplicateOf(r)) : confirmed.has(r);
  const doneCount = entries.filter((e) => isDone(e.row)).length;
  const whole = rowReasons(entry);
  const q = query.trim().toLowerCase();
  const listed = entries
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => {
      if (!q) return true;
      const d = draftOf(e.row);
      return [d.firstName, d.middleName, d.lastName, d.entryNumber, d.address]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[16rem_minmax(0,1fr)]">
      {/* The page as a whole: where it is in the register, and every row on it. */}
      <nav
        aria-label="Rows"
        className="admin-dash__card self-start overflow-hidden bg-white"
      >
        <div className="border-b border-[var(--dash-border)] px-4 py-3">
          <p className="text-[0.85rem] font-semibold text-[var(--dash-ink)]">
            {doneCount} of {entries.length} rows{" "}
            {canSave ? "in records" : "checked"}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--dash-cream)]">
            <div
              className="h-full rounded-full bg-[var(--dash-green)] transition-[width]"
              style={{ width: `${(doneCount / entries.length) * 100}%` }}
            />
          </div>
        </div>

        {canSave && (
          <div
            className={`grid grid-cols-2 gap-2 border-b border-[var(--dash-border)] px-4 py-3 ${
              problems.register ? "bg-[var(--dash-amber-soft)]" : ""
            }`}
          >
            <SmallField
              id="bookNumber"
              label="Book no."
              value={register.bookNumber}
              onChange={(v) => setRegister((r) => ({ ...r, bookNumber: v }))}
            />
            <SmallField
              id="pageNumber"
              label="Page no."
              value={register.pageNumber}
              onChange={(v) => setRegister((r) => ({ ...r, pageNumber: v }))}
            />
            <div className="col-span-2">
              <SmallField
                id="placeOfBaptism"
                label="Place of baptism"
                value={register.placeOfBaptism}
                onChange={(v) =>
                  setRegister((r) => ({ ...r, placeOfBaptism: v }))
                }
              />
            </div>
            {problems.register && (
              <p className="col-span-2 text-[0.72rem] font-medium text-[var(--dash-amber)]">
                {problems.register}
              </p>
            )}
          </div>
        )}

        <div className="border-b border-[var(--dash-border)] px-4 py-2.5">
          <AdminInput
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a name or entry no."
            aria-label="Find a row"
            className="!px-3 !py-1.5"
          />
        </div>

        <ul className="max-h-[52vh] overflow-y-auto py-1">
          {listed.map(({ e, i }) => {
            const open = openGroups(e).length;
            const d = draftOf(e.row);
            const name =
              [d.firstName, d.lastName].filter(Boolean).join(" ") ||
              d.address ||
              "—";
            const done = isDone(e.row);
            return (
              <li key={e.row}>
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-current={i === index ? "true" : undefined}
                  className={`flex w-full items-center gap-2 px-4 py-2 text-left text-admin-support ${
                    i === index
                      ? "bg-[var(--dash-green-soft)]"
                      : "hover:bg-[var(--dash-cream)]"
                  }`}
                >
                  <span className="w-6 shrink-0 tabular-nums text-[var(--dash-ink-soft)]">
                    {e.row}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[var(--dash-ink)]">
                    {name}
                  </span>
                  {done ? (
                    <span
                      className="shrink-0 font-medium text-[var(--dash-green)]"
                      aria-label={canSave ? "In records" : "Checked"}
                    >
                      ✓
                    </span>
                  ) : open > 0 ? (
                    <span
                      className="shrink-0 rounded-full bg-[var(--dash-amber-soft)] px-2 text-[0.7rem] font-semibold text-[var(--dash-amber)]"
                      aria-label={`${open} to check`}
                    >
                      {open}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
          {listed.length === 0 && (
            <li className="admin-dash__muted px-4 py-3 text-admin-support">
              No row matches.
            </li>
          )}
        </ul>
      </nav>

      <form
        onSubmit={submit}
        onKeyDown={(e) => {
          // Enter saves from any field. Handled here because some fields keep Enter to
          // themselves (date inputs, the remarks box). Shift+Enter is a new line in remarks.
          if (
            e.key !== "Enter" ||
            e.shiftKey ||
            e.altKey ||
            e.nativeEvent.isComposing
          )
            return;
          const tag = (e.target as HTMLElement).tagName;
          if (tag === "BUTTON" || tag === "A") return;
          e.preventDefault();
          e.currentTarget.requestSubmit();
        }}
        className="admin-dash__card overflow-hidden bg-white"
        noValidate
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--dash-border)] px-5 py-3 sm:px-6">
          <h2 className="text-[0.95rem] font-semibold text-[var(--dash-ink)]">
            Row {row}
            {draft.entryNumber && sides.includes("left") ? (
              <span className="font-normal text-[var(--dash-ink-soft)]">
                {" "}
                · entry no. {draft.entryNumber}
              </span>
            ) : null}
          </h2>
          <RowStatus
            recordsBase={`/${parish.slug}/admin/records/baptismal`}
            savedId={saved[row]}
            duplicateId={duplicate?.id}
            confirmed={!canSave && confirmed.has(row)}
            onUndo={() =>
              setConfirmed((prev) => {
                const next = new Set(prev);
                next.delete(row);
                return next;
              })
            }
          />
        </div>

        {!canSave && (
          <p className="border-b border-[var(--dash-border)] bg-[var(--dash-cream)] px-5 py-2.5 text-admin-support text-[var(--dash-ink-soft)] sm:px-6">
            Saving records needs both pages. Upload one photo of the open book
            to save rows as records.
          </p>
        )}
        {whole.length > 0 && (
          <div className="border-b border-[var(--dash-border)] bg-[var(--dash-amber-soft)] px-5 py-2.5 text-admin-support text-[var(--dash-amber)] sm:px-6">
            {whole.map((m) => (
              <p key={m}>{m}</p>
            ))}
          </div>
        )}

        <fieldset disabled={Boolean(saved[row])} className="min-w-0">
          {sides.map((side) => (
            <section
              key={side}
              className="border-b border-[var(--dash-border)] px-5 py-4 last:border-b-0 sm:px-6"
            >
              <h3 className="mb-2 text-[0.75rem] font-semibold uppercase tracking-[0.04em] text-[var(--dash-ink-soft)]">
                {SIDE_LABEL[side]}
              </h3>
              <RowStrip
                imageUrl={imageUrl}
                page={result.page}
                cells={result.cells.filter(
                  (c) => c.side === side && c.entry === row,
                )}
                focusField={
                  GROUPS.find((g) => g.key === focusGroup)?.source[0] ?? null
                }
                flagged={new Set(openGroups(entry).flatMap((g) => g.source))}
                onPick={(field) => {
                  const group = GROUPS.find((g) => g.source.includes(field));
                  if (!group) return;
                  setFocusGroup(group.key);
                  document
                    .getElementById(inputId(group.fields[0]?.name ?? ""))
                    ?.focus();
                }}
                note={result.layoutNote}
              />
              <div className="@container mt-3 divide-y divide-[var(--dash-border)]">
                {groups
                  .filter((g) => g.side === side)
                  .map((group) => (
                    <GroupEditor
                      key={group.key}
                      group={group}
                      entry={entry}
                      draft={draft}
                      before={initial[row].draft}
                      notes={initial[row].notes.filter(
                        (n) => n.group === group.key,
                      )}
                      problem={problems[group.key]}
                      isCorrected={corrected(row, group)}
                      active={focusGroup === group.key}
                      onFocus={() => setFocusGroup(group.key)}
                      onChange={setField}
                    />
                  ))}
              </div>
            </section>
          ))}
        </fieldset>

        {saveError && (
          <p
            role="alert"
            className="border-t border-[var(--dash-border)] bg-[var(--dash-amber-soft)] px-5 py-2.5 text-admin-support text-admin-red-700 sm:px-6"
          >
            {saveError}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--dash-border)] bg-[var(--dash-cream)] px-5 py-3 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <AdminButton
              variant="secondary"
              size="sm"
              disabled={index === 0}
              onClick={() => goTo(index - 1)}
            >
              ← Previous
            </AdminButton>
            <AdminButton
              variant="secondary"
              size="sm"
              disabled={index === entries.length - 1}
              onClick={() => goTo(index + 1)}
            >
              Skip →
            </AdminButton>
            {canSave && !saved[row] && (
              <AdminButton variant="ghost" size="sm" onClick={openFullForm}>
                Open full form
              </AdminButton>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="admin-dash__muted hidden text-[0.72rem] md:inline">
              Enter {canSave ? "saves" : "confirms"} · Alt+↓ / ↑ next / previous
              row
            </span>
            <AdminButton
              type="submit"
              disabled={saving || Boolean(saved[row]) || Boolean(duplicate)}
            >
              {saving
                ? "Saving…"
                : canSave
                  ? "Confirm and save"
                  : "Confirm row"}
            </AdminButton>
          </div>
        </div>
      </form>
    </div>
  );
}

function SmallField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-[0.72rem] font-semibold text-[var(--dash-ink-soft)]">
      {label}
      <AdminInput
        id={inputId(id)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 !px-2.5 !py-1.5"
      />
    </label>
  );
}

function RowStatus({
  recordsBase,
  savedId,
  duplicateId,
  confirmed,
  onUndo,
}: {
  recordsBase: string;
  savedId?: string;
  duplicateId?: string;
  confirmed: boolean;
  onUndo: () => void;
}) {
  const recordLink = (id: string) => (
    <Link
      to={`${recordsBase}/${encodeURIComponent(id)}`}
      className="font-semibold text-[var(--dash-green)] hover:underline"
    >
      Open record
    </Link>
  );
  if (savedId) {
    return (
      <p className="text-admin-support text-[var(--dash-green-deep)]">
        ✓ Saved as a record · {recordLink(savedId)}
      </p>
    );
  }
  if (duplicateId) {
    return (
      <p className="text-admin-support text-[var(--dash-amber)]">
        Already in records (same book, page and entry no.) ·{" "}
        {recordLink(duplicateId)}
      </p>
    );
  }
  if (confirmed) {
    return (
      <p className="text-admin-support text-[var(--dash-green-deep)]">
        ✓ Confirmed ·{" "}
        <button
          type="button"
          onClick={onUndo}
          className="font-semibold text-[var(--dash-green)] hover:underline"
        >
          Undo
        </button>
      </p>
    );
  }
  return (
    <p className="admin-dash__muted text-admin-support">
      Compare each field with the handwriting above it
    </p>
  );
}

function GroupEditor({
  group,
  entry,
  draft,
  before,
  notes,
  problem,
  isCorrected,
  active,
  onFocus,
  onChange,
}: {
  group: Group;
  entry: OcrEntry;
  draft: RecordDraft;
  before: RecordDraft;
  notes: DraftNote[];
  problem?: string;
  isCorrected: boolean;
  active: boolean;
  onFocus: () => void;
  onChange: (name: DraftKey, value: string) => void;
}) {
  const reasons = isCorrected ? [] : ocrReasons(entry, group);
  const checkNotes = isCorrected ? [] : notes.filter((n) => n.tone === "check");
  const infoNotes = notes.filter((n) => n.tone === "info");
  const needsLook = reasons.length > 0 || checkNotes.length > 0;
  const status = problem
    ? {
        label: "Fix to save",
        chip: "bg-admin-red-100 text-admin-red-700",
        edge: "border-l-admin-red-700",
      }
    : needsLook
      ? {
          label: "Check",
          chip: "bg-[var(--dash-amber-soft)] text-[var(--dash-amber)]",
          edge: "border-l-[#e8b45a]",
        }
      : isCorrected
        ? {
            label: "Corrected",
            chip: "bg-[var(--dash-green-soft)] text-[var(--dash-green-deep)]",
            edge: "border-l-[var(--dash-green-mid)]",
          }
        : null;
  const written = group.written ? valueOf(entry, group.written) : null;
  const many = group.fields.length > 1;

  return (
    <div
      className={`grid gap-x-5 gap-y-1.5 border-l-[3px] py-3 pl-3 pr-1 @min-[40rem]:grid-cols-[8.5rem_minmax(0,1fr)] ${
        status ? status.edge : "border-l-transparent"
      } ${active ? "bg-[var(--dash-cream)]" : ""}`}
    >
      <div
        className={`flex items-center gap-2 @min-[40rem]:flex-col @min-[40rem]:items-start @min-[40rem]:gap-1 ${many ? "@min-[40rem]:pt-[1.3rem]" : "@min-[40rem]:pt-2"}`}
      >
        <span className="text-[0.82rem] font-semibold text-[var(--dash-ink)]">
          {group.label}
        </span>
        {status && (
          <span
            className={`rounded-full px-2 py-px text-[0.66rem] font-semibold ${status.chip}`}
          >
            {status.label}
          </span>
        )}
      </div>

      <div className="@container min-w-0">
        <div className={`grid gap-2 ${group.layout}`}>
          {group.fields.map((field) => (
            <div key={field.name} className={`min-w-0 ${field.span ?? ""}`}>
              <FieldInput
                field={field}
                value={draft[field.name] ?? ""}
                onFocus={onFocus}
                onChange={(v) => onChange(field.name, v)}
                labelled={many}
              />
            </div>
          ))}
        </div>

        {(written ||
          problem ||
          reasons.length > 0 ||
          checkNotes.length > 0 ||
          infoNotes.length > 0 ||
          isCorrected) && (
          <div className="mt-1.5 space-y-0.5 text-[0.72rem] leading-snug">
            {problem && (
              <p className="font-semibold text-admin-red-700">{problem}</p>
            )}
            {[...reasons, ...checkNotes.map((n) => n.message)].map((m) => (
              <p key={m} className="font-medium text-[var(--dash-amber)]">
                {m}
              </p>
            ))}
            {written && (
              <p className="text-[var(--dash-ink-soft)]">
                Written as: {written}
              </p>
            )}
            {isCorrected && (
              <p className="text-[var(--dash-ink-soft)]">
                Read as:{" "}
                {group.fields
                  // The register never gives a role, so a blank one isn't worth showing.
                  .filter((f) => f.kind !== "role" || before[f.name])
                  .map((f) => before[f.name] || "blank")
                  .join(" · ")}
              </p>
            )}
            {infoNotes.map((n) => (
              <p key={n.message} className="text-[var(--dash-ink-soft)]">
                {n.message}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onFocus,
  onChange,
  labelled,
}: {
  field: Field;
  value: string;
  onFocus: () => void;
  onChange: (value: string) => void;
  /** Show a small label above the input (for groups with more than one input). */
  labelled: boolean;
}) {
  const id = inputId(field.name);
  const control =
    field.kind === "legitimacy" ? (
      <AdminSelect
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        aria-label={field.label}
      >
        <option value="">—</option>
        <option value="Legitimate">Legitimate</option>
        <option value="Illegitimate">Illegitimate</option>
      </AdminSelect>
    ) : field.kind === "role" ? (
      <AdminSelect
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        aria-label={field.label}
      >
        <option value="">—</option>
        <option value="Godfather">Godfather</option>
        <option value="Godmother">Godmother</option>
      </AdminSelect>
    ) : field.kind === "date" ? (
      <AdminInput
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        aria-label={field.label}
      />
    ) : field.kind === "long" ? (
      <AdminTextarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        aria-label={field.label}
        className="min-h-[44px]"
        rows={1}
      />
    ) : (
      <AdminInput
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        aria-label={field.label}
      />
    );

  if (!labelled) return control;
  return (
    <div className="min-w-0">
      <span className="mb-0.5 block text-[0.68rem] text-[var(--dash-ink-soft)]">
        {field.label}
      </span>
      {control}
    </div>
  );
}
