import type { IssuedCopy, IssuedCopyStatus } from "@/features/parish-admin/reports/api/reportsApi";
import type { CsvCell, ReportDocument } from "@/features/parish-admin/reports/reportDocument";

/* A7: the register of issued certificates inside the Certificates report. One row per copy. */

export const COPY_STATUS_LABELS: Record<IssuedCopyStatus, string> = {
  valid: "Valid",
  waiting: "Waiting for pickup",
  replaced: "Replaced",
  revoked: "Revoked",
  spoiled: "Spoiled",
};

export const COPY_CHANNEL_LABELS = { walkin: "Walk-in", pickup: "Online, pickup", digital: "Online, digital" } as const;

export const SACRAMENT_LABELS: Record<string, string> = {
  baptism: "Baptism",
  confirmation: "Confirmation",
  marriage: "Marriage",
  death: "Death",
};

export interface CopyFilter {
  search: string;
  sacrament: string;
  status: string;
}

export const emptyCopyFilter = (): CopyFilter => ({ search: "", sacrament: "", status: "" });

export function copyFilterActive(filter: CopyFilter) {
  return Boolean(filter.search.trim() || filter.sacrament || filter.status);
}

export function issuedAtLabel(at: string) {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function timesPrintedLabel(copy: IssuedCopy) {
  return copy.timesPrinted == null ? "Digital" : String(copy.timesPrinted);
}

export function copiesCsv(copies: IssuedCopy[]): ReportDocument["csv"] {
  return {
    headers: [
      "Number", "Sacrament", "Holder", "Issued", "Issued by", "How", "Purpose", "Receipt", "Times printed", "Status", "Void reason",
    ],
    rows: copies.map((c): CsvCell[] => [
      c.code,
      SACRAMENT_LABELS[c.sacramentType] ?? c.sacramentType,
      c.holderName ?? "",
      // Local date and time, e.g. "2026-11-09 17:24", so spreadsheets read it as a date.
      new Date(c.issuedAt).toLocaleString("sv-SE").slice(0, 16),
      c.issuedBy,
      c.channel ? COPY_CHANNEL_LABELS[c.channel] : "",
      c.purpose ?? "",
      c.receiptNumber ?? "",
      timesPrintedLabel(c),
      COPY_STATUS_LABELS[c.status],
      c.voidReason ?? "",
    ]),
  };
}

function matches(copy: IssuedCopy, filter: CopyFilter) {
  if (filter.sacrament && copy.sacramentType !== filter.sacrament) return false;
  if (filter.status && copy.status !== filter.status) return false;
  const q = filter.search.trim().toLowerCase();
  if (!q) return true;
  return [copy.code, copy.holderName, copy.receiptNumber, copy.issuedBy]
    .filter(Boolean)
    .some((text) => String(text).toLowerCase().includes(q));
}

/** The report with only the copies the filter keeps, in the table, the CSV, the PDF and the printout. */
export function withCopyFilter(doc: ReportDocument, filter: CopyFilter): ReportDocument {
  if (!doc.copies || !copyFilterActive(filter)) return doc;
  const rows = doc.copies.rows.filter((copy) => matches(copy, filter));
  return { ...doc, copies: { ...doc.copies, rows, filtered: true }, csv: copiesCsv(rows) };
}
