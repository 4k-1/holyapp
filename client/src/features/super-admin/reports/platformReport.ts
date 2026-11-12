import type { PlatformReport, ReportRange } from "@/features/super-admin/api/superAdminApi";

/*
 * Chart colours were checked for colour-blind separation; gold is low-contrast on white, so every bar also
 * carries its count and the legend names each colour.
 */
export const RECORDS_COLOR = "#0a8aa3";
export const CERTIFICATES_COLOR = "#d4920a";
export const OUTCOME = {
  released: { label: "Released", color: "#0a8aa3" },
  open: { label: "Still open", color: "#c98a00" },
  rejected: { label: "Rejected", color: "#a8527e" },
} as const;

function iso(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayIso() {
  return iso(new Date());
}

/** Quick picks that fill in the dates; "All time" clears them. */
export function rangePresets(): { id: string; label: string; range: ReportRange }[] {
  const now = new Date();
  const today = iso(now);
  return [
    { id: "month", label: "This month", range: { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: today } },
    { id: "3m", label: "Last 3 months", range: { from: iso(new Date(now.getFullYear(), now.getMonth() - 2, 1)), to: today } },
    { id: "year", label: "This year", range: { from: iso(new Date(now.getFullYear(), 0, 1)), to: today } },
    { id: "all", label: "All time", range: { from: "", to: "" } },
  ];
}

export function normalizeRange(range: ReportRange): ReportRange {
  return range.from && range.to && range.from > range.to ? { from: range.to, to: range.from } : { ...range };
}

function day(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

/** "Sep 1, 2026 – Nov 12, 2026", "Sep 1, 2026 onward", "Up to …" or "All time". */
export function rangeLabel(range: ReportRange) {
  if (range.from && range.to) return range.from === range.to ? day(range.from) : `${day(range.from)} – ${day(range.to)}`;
  if (range.from) return `${day(range.from)} onward`;
  if (range.to) return `Up to ${day(range.to)}`;
  return "All time";
}

/** What the figures are compared with: "the 31 days before". */
export function comparisonLabel(report: PlatformReport) {
  if (!report.previousRange) return null;
  const { days } = report.previousRange;
  return days === 1 ? "the day before" : `the ${days} days before`;
}

export function bucketLabel(bucket: PlatformReport["buckets"][number], unit: PlatformReport["unit"], previous?: PlatformReport["buckets"][number]) {
  const date = new Date(`${bucket.start}T00:00:00`);
  if (unit === "year") return bucket.start.slice(0, 4);
  if (unit === "week") return date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
  const month = date.toLocaleDateString("en-PH", { month: "short" });
  // The year shows on the first bar and wherever it changes.
  return previous?.start.slice(0, 4) === bucket.start.slice(0, 4) ? month : `${month} ${bucket.start.slice(0, 4)}`;
}

/** The whole stretch a bar covers, for its tooltip: "Nov 1 – Nov 7, 2026". */
export function bucketName(bucket: PlatformReport["buckets"][number]) {
  return bucket.start === bucket.end ? day(bucket.start) : `${day(bucket.start)} – ${day(bucket.end)}`;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function relativeDay(value: string | null) {
  if (!value) return "—";
  const then = new Date(value);
  const days = Math.round((startOfDay(new Date()) - startOfDay(then)) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return then.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

export function parishStatus(row: PlatformReport["parishes"][number]) {
  if (!row.hasAdmin) return "Pending setup";
  return row.activeInPeriod ? "In use" : "No activity in this period";
}

/** Parishes with the most records first; ties by name. */
export function parishesByRecords(report: PlatformReport) {
  return [...report.parishes].sort((a, b) => b.records - a.records || a.name.localeCompare(b.name));
}

/** holyapp-report-2026-09-01-to-2026-11-12, without the extension. */
export function reportFilename(range: ReportRange) {
  if (!range.from && !range.to) return `holyapp-report-all-time-${todayIso()}`;
  return `holyapp-report-${range.from || "start"}-to-${range.to || todayIso()}`;
}

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function downloadReportCsv(report: PlatformReport, range: ReportRange) {
  const header = ["Parish", "Address", "Records added", "Certificates issued", "Open requests", "Last activity", "Status"];
  const lines = parishesByRecords(report).map((p) =>
    [p.name, p.address, p.records, p.certificates, p.openRequests, p.lastActivity?.slice(0, 10) ?? "", parishStatus(p)]
      .map(csvCell)
      .join(",")
  );
  const csv = [csvCell(`HolyApp report: ${rangeLabel(range)}`), header.join(","), ...lines].join("\r\n");
  // The byte-order mark lets Excel read accented names (Señora) correctly.
  const url = URL.createObjectURL(new Blob([String.fromCharCode(0xfeff), csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${reportFilename(range)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
