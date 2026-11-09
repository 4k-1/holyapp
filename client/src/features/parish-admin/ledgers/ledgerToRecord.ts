// Turns a checked ledger row into a filled-in baptismal record form.
// The register writes whole names ("Gabriel Jose A. Dela Peña"); the record keeps them in
// parts, so names are split here as a suggestion for a person to confirm.
import type { OcrCell } from "@/features/parish-admin/ledgers/api/ledgerScanApi";

/** What the check screen hands to the record form (through router state). */
export interface LedgerRowHandoff {
  source: "ledger-ocr";
  /** The register page this row is on; the record is linked to it when saved. */
  ledgerPageId?: string;
  /** The page photo, for the row picture (null when there's none). Blobs survive
   *  router state, which is a structured clone. */
  file: Blob | null;
  page: { width: number; height: number };
  /** This row's cells only. */
  cells: OcrCell[];
  row: number;
  /** The checked values, in the register's own fields (dates as <name>AsWritten / <name>Iso). */
  values: Record<string, string | null>;
  bookNumber: string;
  pageNumber: string;
  /** The record fields as the check screen left them; when missing they're worked out from values. */
  draft?: RecordDraft;
}

export function isLedgerHandoff(state: unknown): state is LedgerRowHandoff {
  return Boolean(
    state &&
    typeof state === "object" &&
    (state as { source?: string }).source === "ledger-ocr",
  );
}

// Words that belong to the surname that follows them: "Dela Peña", "De los Santos", "San Juan".
const PARTICLES = new Set([
  "de",
  "del",
  "dela",
  "la",
  "las",
  "los",
  "delos",
  "delas",
  "di",
  "da",
  "san",
  "santa",
  "santo",
  "sta.",
  "sto.",
  "y",
  "van",
  "von",
]);
// A middle initial: one letter, with or without a full stop ("R." or "R").
const INITIAL = /^\p{L}\.?$/u;

export interface SplitName {
  first: string;
  middle: string;
  last: string;
  /** True when a middle initial marked where the surname starts. */
  confident: boolean;
}

/**
 * Splits a name as Filipino registers write it: given name(s), middle initial, surname.
 * With a middle initial the split is clear; without one, the last word (plus any particles
 * like "Dela") is taken as the surname and the middle name is left empty.
 */
export function splitName(full: string | null | undefined): SplitName {
  const words = (full ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0)
    return { first: "", middle: "", last: "", confident: true };
  if (words.length === 1)
    return { first: words[0], middle: "", last: "", confident: false };

  // The last initial that has a given name before it and a surname after it.
  let initial = -1;
  for (let i = words.length - 2; i >= 1; i--) {
    if (INITIAL.test(words[i])) {
      initial = i;
      break;
    }
  }
  if (initial > 0) {
    return {
      first: words.slice(0, initial).join(" "),
      middle: words[initial],
      last: words.slice(initial + 1).join(" "),
      confident: true,
    };
  }

  let start = words.length - 1;
  while (start - 1 >= 1 && PARTICLES.has(words[start - 1].toLowerCase()))
    start--;
  return {
    first: words.slice(0, start).join(" "),
    middle: "",
    last: words.slice(start).join(" "),
    confident: false,
  };
}

export interface RecordDraft {
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  placeOfBirth: string;
  dateOfBaptism: string;
  legitimacyStatus: "Legitimate" | "Illegitimate" | "";
  address: string;
  minister: string;
  fatherFirstName: string;
  fatherLastName: string;
  motherFirstName: string;
  motherLastName: string;
  bookNumber: string;
  pageNumber: string;
  entryNumber: string;
  remarks: string;
  // Godparents (the register's "sponsors"): at most two, can. 873. The role is left for a
  // person to choose, since the register doesn't say which is the godfather.
  godparent1First: string;
  godparent1Middle: string;
  godparent1Last: string;
  godparent1Role: GodparentRole | "";
  godparent2First: string;
  godparent2Middle: string;
  godparent2Last: string;
  godparent2Role: GodparentRole | "";
}

export type GodparentRole = "Godfather" | "Godmother";

/** The draft's godparents, as the API takes them (blank ones left out). */
export function godparentsOf(d: RecordDraft) {
  return ([1, 2] as const)
    .map((n) => ({
      firstName: d[`godparent${n}First`].trim(),
      middleName: d[`godparent${n}Middle`].trim(),
      lastName: d[`godparent${n}Last`].trim(),
      role: d[`godparent${n}Role`] || undefined,
    }))
    .filter((g) => g.firstName || g.middleName || g.lastName);
}

/** Which part of the record a note or a problem is about. */
export type DraftGroup =
  | "entryNumber"
  | "child"
  | "placeOfBirth"
  | "dateOfBirth"
  | "legitimacy"
  | "father"
  | "mother"
  | "address"
  | "dateOfBaptism"
  | "minister"
  | "godparent1"
  | "godparent2"
  | "remarks"
  | "register";

/** What the person checking the row should look at. */
export interface DraftNote {
  group: DraftGroup;
  label: string;
  message: string;
  tone: "check" | "missing" | "info";
}

type Values = Record<string, string | null>;
const v = (values: Values, key: string) => (values[key] ?? "").trim();

/** A ledger row (the register's own fields) as baptismal record fields, plus what to check. */
export function draftFromValues(
  values: Values,
  row: number,
): { draft: RecordDraft; notes: DraftNote[] } {
  const notes: DraftNote[] = [];

  const child = splitName(values.childFullName);
  if (values.childFullName && !child.confident) {
    notes.push({
      group: "child",
      label: "Child's name",
      message: `Split from “${values.childFullName}” without a middle initial. Check which words are the surname.`,
      tone: "check",
    });
  }
  if (INITIAL.test(child.middle)) {
    notes.push({
      group: "child",
      label: "Middle name",
      message: `Only the initial “${child.middle}” is in the register. That's fine to keep.`,
      tone: "info",
    });
  }

  // The record keeps parents as first + last name only, so a middle initial stays with the first name.
  const parent = (full: string | null, who: string, group: DraftGroup) => {
    const s = splitName(full);
    if (!full) {
      notes.push({
        group,
        label: `${who}'s name`,
        message:
          "Blank in the register, so left blank (allowed, e.g. for a child of an unmarried mother).",
        tone: "info",
      });
    } else if (!s.confident) {
      notes.push({
        group,
        label: `${who}'s name`,
        message: `Split from “${full}”. Check the surname.`,
        tone: "check",
      });
    }
    return {
      first: [s.first, s.middle].filter(Boolean).join(" "),
      last: s.last,
    };
  };
  const father = parent(values.fatherName, "Father", "father");
  const mother = parent(values.motherName, "Mother", "mother");

  const date = (base: "dateOfBirth" | "dateOfBaptism", label: string) => {
    const iso = v(values, `${base}Iso`);
    const written = v(values, `${base}AsWritten`);
    if (!iso && written) {
      notes.push({
        group: base,
        label,
        message: `Written as “${written}”, which wasn't understood as a date. Enter it.`,
        tone: "check",
      });
    }
    return iso;
  };

  const legitimacy = v(values, "legitimacy");
  const godparent = (n: 1 | 2) => {
    const full = values[`sponsor${n}`];
    const s = splitName(full);
    if (full && !s.confident) {
      notes.push({
        group: `godparent${n}`,
        label: `Godparent ${n}`,
        message: `Split from “${full}”. Check the surname.`,
        tone: "check",
      });
    }
    return s;
  };
  const g1 = godparent(1);
  const g2 = godparent(2);

  return {
    draft: {
      firstName: child.first,
      middleName: child.middle,
      lastName: child.last,
      dateOfBirth: date("dateOfBirth", "Date of birth"),
      placeOfBirth: v(values, "placeOfBirth"),
      dateOfBaptism: date("dateOfBaptism", "Date of baptism"),
      legitimacyStatus:
        legitimacy === "L"
          ? "Legitimate"
          : legitimacy === "ILL"
            ? "Illegitimate"
            : "",
      address: v(values, "residence"),
      minister: v(values, "minister"),
      fatherFirstName: father.first,
      fatherLastName: father.last,
      motherFirstName: mother.first,
      motherLastName: mother.last,
      bookNumber: "",
      pageNumber: "",
      entryNumber: v(values, "entryNumber") || String(row),
      remarks: v(values, "observations"),
      godparent1First: g1.first,
      godparent1Middle: g1.middle,
      godparent1Last: g1.last,
      godparent1Role: "",
      godparent2First: g2.first,
      godparent2Middle: g2.middle,
      godparent2Last: g2.last,
      godparent2Role: "",
    },
    notes,
  };
}

/**
 * What stops this draft from being saved, by group, in the same terms as the API
 * (baptismController.parseBaptismBody): required fields, a parent's last name when their
 * first name is given, and a remark when no parent is recorded.
 */
export function problemsToSave(
  d: RecordDraft & { placeOfBaptism: string },
): Partial<Record<DraftGroup, string>> {
  const p: Partial<Record<DraftGroup, string>> = {};
  const blank = (x: string) => !x.trim();
  if (blank(d.firstName) || blank(d.lastName))
    p.child = "First and last name are needed to save.";
  if (blank(d.dateOfBirth))
    p.dateOfBirth = "A date of birth is needed to save.";
  if (blank(d.dateOfBaptism))
    p.dateOfBaptism = "A date of baptism is needed to save.";
  if (blank(d.minister)) p.minister = "The minister is needed to save.";
  if (blank(d.entryNumber))
    p.entryNumber = "The entry number is needed to save.";
  if (!blank(d.fatherFirstName) && blank(d.fatherLastName))
    p.father = "Add the father's last name.";
  if (!blank(d.motherFirstName) && blank(d.motherLastName))
    p.mother = "Add the mother's last name.";
  if (blank(d.fatherLastName) && blank(d.motherLastName) && blank(d.remarks)) {
    p.remarks =
      "No parent is recorded, so add a remark saying why (for a foundling: when, where and by whom found).";
  }
  for (const n of [1, 2] as const) {
    const first = d[`godparent${n}First`];
    const middle = d[`godparent${n}Middle`];
    const last = d[`godparent${n}Last`];
    if ((first + middle + last).trim() && (blank(first) || blank(last))) {
      p[`godparent${n}`] = "A godparent needs a first and a last name.";
    }
  }
  if (
    d.godparent1Role &&
    d.godparent1Role === d.godparent2Role &&
    !p.godparent2
  ) {
    p.godparent2 = `Only one ${d.godparent1Role.toLowerCase()} is allowed (can. 873).`;
  }
  if (blank(d.bookNumber) || blank(d.pageNumber) || blank(d.placeOfBaptism)) {
    p.register = "Book no., page no. and place of baptism are needed to save.";
  }
  return p;
}

/** For the full record form: the draft (as checked, if the check screen sent one) and its notes. */
export function draftFromLedgerRow(h: LedgerRowHandoff): {
  draft: RecordDraft;
  notes: DraftNote[];
} {
  const { draft, notes } = draftFromValues(h.values, h.row);
  return {
    draft: {
      ...(h.draft ?? draft),
      bookNumber: h.bookNumber,
      pageNumber: h.pageNumber,
    },
    notes,
  };
}
