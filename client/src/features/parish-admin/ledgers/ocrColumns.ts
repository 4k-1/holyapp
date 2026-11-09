// The register's columns as the check screen shows them, and
// how to tell which of a row's fields need a look.
import type {
  OcrCell,
  OcrEntry,
} from "@/features/parish-admin/ledgers/api/ledgerScanApi";

export interface Column {
  field: string;
  label: string;
  /** Stored as <field>AsWritten and <field>Iso. */
  date?: boolean;
  /** One of a fixed set (the L / ILL tick boxes). */
  options?: string[];
}

export const LEFT_COLUMNS: Column[] = [
  { field: "entryNumber", label: "No." },
  { field: "childFullName", label: "Name of child" },
  { field: "placeOfBirth", label: "Place of birth" },
  { field: "dateOfBirth", label: "Date of birth", date: true },
  { field: "legitimacy", label: "L / ILL", options: ["L", "ILL"] },
  { field: "fatherName", label: "Father" },
  { field: "motherName", label: "Mother" },
];

export const RIGHT_COLUMNS: Column[] = [
  { field: "residence", label: "Residence" },
  { field: "dateOfBaptism", label: "Date of baptism", date: true },
  { field: "minister", label: "Minister" },
  { field: "sponsor1", label: "Sponsor 1" },
  { field: "sponsor2", label: "Sponsor 2" },
  { field: "observations", label: "Observations" },
];

// The tick boxes on the page answer one column.
const TICK_FIELD: Record<string, string> = {
  legitimateTick: "legitimacy",
  illegitimateTick: "legitimacy",
};

/** The column a cell on the page belongs to. */
export function columnFieldOf(cell: OcrCell) {
  return TICK_FIELD[cell.field] ?? cell.field;
}

/** The entry's field names a column covers. */
export function fieldNames(column: Column) {
  return column.date
    ? [`${column.field}AsWritten`, `${column.field}Iso`]
    : [column.field];
}

/** Why a column needs a look: the engine wasn't sure, and/or the app's checks. */
export function reasonsFor(entry: OcrEntry, column: Column): string[] {
  const names = fieldNames(column);
  const reasons: string[] = [];
  if (names.some((n) => entry.uncertainFields.includes(n))) {
    const confidence = entry.confidence[names[0]];
    reasons.push(
      typeof confidence === "number"
        ? `The engine wasn't sure (${confidence}/100).`
        : "The engine said it wasn't sure of this.",
    );
  }
  for (const check of entry.checks ?? []) {
    if (
      check.field &&
      names.includes(check.field) &&
      !reasons.includes(check.message)
    )
      reasons.push(check.message);
  }
  return reasons;
}

export function isUncertain(entry: OcrEntry, column: Column) {
  return reasonsFor(entry, column).length > 0;
}

/** Problems with the row as a whole (e.g. writing that wasn't read at all). */
export function rowReasons(entry: OcrEntry) {
  return (entry.checks ?? [])
    .filter((c) => c.field === null)
    .map((c) => c.message);
}

export function valueOf(entry: OcrEntry, field: string): string | null {
  const v = entry[field];
  return typeof v === "string" ? v : null;
}
