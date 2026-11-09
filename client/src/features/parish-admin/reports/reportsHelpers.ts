import { formatRecordDate } from "@/features/parish-admin/records/baptismalHelpers";

export type ReportKind = "sacraments" | "certificates" | "donations" | "intentions";

export const REPORT_SECTIONS: { id: ReportKind; path: string; label: string; blurb: string }[] = [
  {
    id: "sacraments",
    path: "sacraments",
    label: "Sacraments",
    blurb: "Baptisms, confirmations, marriages, and funerals over a stretch of time.",
  },
  {
    id: "certificates",
    path: "certificates",
    label: "Certificates",
    blurb: "Every certificate copy issued, with its number, receipt and status, and the totals by month.",
  },
  {
    id: "donations",
    path: "donations",
    label: "Donations",
    blurb: "Gifts recorded for the parish over a stretch of time.",
  },
  {
    id: "intentions",
    path: "intentions",
    label: "Mass Intentions",
    blurb: "Intentions booked onto Masses, and the offerings that came with them.",
  },
];

export const SACRAMENT_SERIES = [
  { id: "baptism", label: "Baptism", color: "var(--color-admin-green-700)" },
  { id: "confirmation", label: "Confirmation", color: "var(--color-admin-green-600)" },
  { id: "marriage", label: "Marriage", color: "var(--color-admin-gold-600)" },
  { id: "death", label: "Death", color: "var(--color-admin-ink-muted)" },
] as const;

export interface ReportDateRange {
  from: string;
  to: string;
}

export const emptyReportDateRange = (): ReportDateRange => ({ from: "", to: "" });

export function isoDay(value: string) {
  return value.slice(0, 10);
}

export function inReportRange(isoDate: string, range: ReportDateRange) {
  const day = isoDay(isoDate);
  if (!day) return false;
  if (range.from && day < range.from) return false;
  if (range.to && day > range.to) return false;
  return true;
}

export function yearInRange(year: number, range: ReportDateRange) {
  if (range.from && year < Number(range.from.slice(0, 4))) return false;
  if (range.to && year > Number(range.to.slice(0, 4))) return false;
  return true;
}

export function monthInRange(month: string, range: ReportDateRange) {
  const from = range.from ? range.from.slice(0, 7) : "";
  const to = range.to ? range.to.slice(0, 7) : "";
  if (from && month < from) return false;
  if (to && month > to) return false;
  return true;
}

export function reportPeriodLabel(range: ReportDateRange) {
  if (!range.from && !range.to) return "the whole register";
  const year = range.from.slice(0, 4);
  if (range.from === `${year}-01-01` && range.to === `${year}-12-31`) return year;
  if (range.from && range.to) {
    return `${formatRecordDate(range.from)} – ${formatRecordDate(range.to)}`;
  }
  if (range.from) return `${formatRecordDate(range.from)} onward`;
  return `the register up to ${formatRecordDate(range.to ?? "")}`;
}

export function normalizeReportRange(range: ReportDateRange): ReportDateRange {
  if (range.from && range.to && range.from > range.to) {
    return { from: range.to, to: range.from };
  }
  return { ...range };
}

export function formatMonthLabel(month: string) {
  const [year, monthNum] = month.split("-");
  const date = new Date(Number(year), Number(monthNum) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export function formatPeso(amount: number) {
  return `₱${Math.round(amount).toLocaleString()}`;
}

export function countPhrase(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}
