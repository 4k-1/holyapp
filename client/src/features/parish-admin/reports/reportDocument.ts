import { formatAmount } from "@/features/parish-admin/donations/donationsHelpers";
import {
  getCertificateMonthly,
  getDonationMonthly,
  getIntentionMonthly,
  getSacramentYearly,
} from "@/features/parish-admin/reports/api/reportsApi";
import {
  countPhrase,
  formatMonthLabel,
  formatPeso,
  REPORT_SECTIONS,
  sum,
  type ReportDateRange,
  type ReportKind,
} from "@/features/parish-admin/reports/reportsHelpers";

/**
 * Literal colours for the report sheet. Its charts are captured into a PDF and printed outside the admin
 * shell, where the admin CSS variables don't reach, so they can't use the tokens.
 */
export const SHEET_COLORS = {
  teal: "#16798c",
  tealLight: "#7fc4cd",
  gold: "#e9b04f",
  slate: "#9fb2b8",
  rose: "#d98c8c",
  ink: "#15323a",
  muted: "#55707a",
  faint: "#8ba1a7",
  grid: "#e0e9eb",
} as const;

const SLICE_COLORS = [SHEET_COLORS.teal, SHEET_COLORS.tealLight, SHEET_COLORS.gold, SHEET_COLORS.slate];

export interface ReportTile {
  label: string;
  value: string;
  /** The last finished period against the one before it; null when there is nothing fair to compare. */
  change: { pct: number; caption: string } | null;
}

export interface ReportSeries {
  id: string;
  label: string;
  color: string;
  values: number[];
}

export interface ReportSlice {
  id: string;
  label: string;
  value: number;
  color: string;
}

export interface ReportHighlight {
  label: string;
  value: string;
  note: string;
}

/** How a row's total sits against the average row, shown as a pill in the table. */
export type ReportLevel = "high" | "typical" | "low";

export type CsvCell = string | number;

export interface ReportDocument {
  kind: ReportKind;
  title: string;
  parishName: string;
  period: string;
  generatedOn: string;
  /** One sentence; the detail lives in the highlights. */
  summary: string;
  empty: boolean;
  tiles: ReportTile[];
  highlights: ReportHighlight[];
  trend: { title: string; labels: string[]; series: ReportSeries[]; money: boolean };
  breakdown: { title: string; slices: ReportSlice[]; money: boolean };
  table: { title: string; headers: string[]; rows: string[][]; totals: string[]; levels: ReportLevel[] };
  csv: { headers: string[]; rows: CsvCell[][] };
  /** Donations only: totals by fund, with the money the parish passes on in full kept apart (D3). */
  funds?: { parish: { label: string; amount: number }[]; remit: { label: string; amount: number }[] };
  /** Without an extension; PDF and CSV add their own. */
  filename: string;
}

/**
 * Compare the last finished period with the one before it. A period still under way (this year, this month)
 * is skipped, since a part-year against a full year always looks like a drop.
 */
function change(values: number[], labels: string[], lastIsOpen: boolean): ReportTile["change"] {
  const end = lastIsOpen ? values.length - 1 : values.length;
  if (end < 2) return null;
  const last = values[end - 1];
  const prev = values[end - 2];
  if (prev === 0) return null;
  return { pct: ((last - prev) / prev) * 100, caption: `${labels[end - 1]} vs ${labels[end - 2]}` };
}

function levels(totals: number[]): ReportLevel[] {
  const average = totals.length ? sum(totals) / totals.length : 0;
  return totals.map((value) => (value >= average * 1.15 ? "high" : value <= average * 0.85 ? "low" : "typical"));
}

/** "Jun ’26", so a month never reads as a day of the month. */
function monthLabel(month: string) {
  return formatMonthLabel(month).replace(" ", " ’");
}

function longMonth(month: string) {
  const [year, monthNum] = month.split("-");
  return new Date(Number(year), Number(monthNum) - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function share(part: number, whole: number) {
  return whole === 0 ? 0 : Math.round((part / whole) * 100);
}

function peak<T>(rows: T[], value: (row: T) => number) {
  return rows.reduce<T | null>((best, row) => (best === null || value(row) > value(best) ? row : best), null);
}

function trough<T>(rows: T[], value: (row: T) => number) {
  return rows.reduce<T | null>((low, row) => (low === null || value(row) < value(low) ? row : low), null);
}

function largest(slices: ReportSlice[]) {
  return slices.reduce((best, slice) => (slice.value > best.value ? slice : best), slices[0]);
}

const currentMonth = () => new Date().toISOString().slice(0, 7);

export async function buildReportDocument(
  kind: ReportKind,
  parish: { id: string; name: string },
  range: ReportDateRange,
  period: string
): Promise<ReportDocument> {
  const meta = REPORT_SECTIONS.find((section) => section.id === kind) ?? REPORT_SECTIONS[0];
  const base = {
    kind,
    title: meta.label,
    parishName: parish.name,
    period,
    generatedOn: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    filename: `${kind}-report-${new Date().toISOString().slice(0, 10)}`,
  };

  if (kind === "sacraments") {
    const rows = await getSacramentYearly(range);
    const labels = rows.map((row) => String(row.year));
    const open = rows.length > 0 && rows[rows.length - 1].year === new Date().getFullYear();
    const series: ReportSeries[] = [
      { id: "baptism", label: "Baptism", color: SHEET_COLORS.teal, values: rows.map((row) => row.baptism) },
      { id: "confirmation", label: "Confirmation", color: SHEET_COLORS.tealLight, values: rows.map((row) => row.confirmation) },
      { id: "marriage", label: "Marriage", color: SHEET_COLORS.gold, values: rows.map((row) => row.marriage) },
      { id: "death", label: "Death", color: SHEET_COLORS.slate, values: rows.map((row) => row.death) },
    ];
    const yearTotal = (row: (typeof rows)[number]) => row.baptism + row.confirmation + row.marriage + row.death;
    const totals = series.map((item) => sum(item.values));
    const all = sum(totals);
    const busiest = peak(rows, yearTotal);
    const quietest = trough(rows, yearTotal);
    const confirmationYears = rows.filter((row) => row.confirmation > 0).length;
    return {
      ...base,
      empty: all === 0,
      summary:
        all === 0
          ? `No sacraments were recorded for ${period}.`
          : `The register holds ${countPhrase(all, "sacrament")} for ${period}, across ${countPhrase(rows.length, "year")}.`,
      tiles: series.map((item, index) => ({
        label: `${item.label}s`,
        value: totals[index].toLocaleString(),
        change: change(item.values, labels, open),
      })),
      highlights: all === 0 ? [] : [
        { label: "Busiest year", value: String(busiest?.year ?? "—"), note: `${busiest ? yearTotal(busiest) : 0} sacraments` },
        ...(rows.length > 1
          ? [{ label: "Quietest year", value: String(quietest?.year ?? "—"), note: `${quietest ? yearTotal(quietest) : 0} sacraments` }]
          : []),
        { label: "Baptisms", value: `${share(totals[0], all)}%`, note: "of all sacraments" },
        { label: "Confirmation years", value: `${confirmationYears} of ${rows.length}`, note: "confirmations come in clusters" },
        ...(open ? [{ label: `${rows[rows.length - 1].year} so far`, value: String(yearTotal(rows[rows.length - 1])), note: "the year is still under way" }] : []),
      ],
      // Confirmations swing between none and dozens, which turns a line into a zig-zag; they show in the donut and table.
      trend: {
        title: "Baptisms, marriages and deaths",
        labels,
        series: series.filter((item) => item.id !== "confirmation"),
        money: false,
      },
      breakdown: {
        title: "Share by sacrament",
        money: false,
        slices: series.map((item, index) => ({ id: item.id, label: item.label, value: totals[index], color: item.color })),
      },
      table: {
        title: "By year",
        headers: ["Year", "Baptism", "Confirmation", "Marriage", "Death", "Total"],
        rows: rows.map((row) => [row.year, row.baptism, row.confirmation, row.marriage, row.death, yearTotal(row)].map(String)),
        totals: ["Total", ...totals.map(String), String(all)],
        levels: levels(rows.map(yearTotal)),
      },
      csv: {
        headers: ["Year", "Baptism", "Confirmation", "Marriage", "Death", "Total"],
        rows: rows.map((row) => [row.year, row.baptism, row.confirmation, row.marriage, row.death, yearTotal(row)]),
      },
    };
  }

  if (kind === "certificates") {
    const rows = await getCertificateMonthly(range);
    const labels = rows.map((row) => monthLabel(row.month));
    const open = rows.length > 0 && rows[rows.length - 1].month === currentMonth();
    const monthTotal = (row: (typeof rows)[number]) => row.pending + row.processing + row.released + row.rejected;
    const total = sum(rows.map(monthTotal));
    const released = sum(rows.map((row) => row.released));
    const processing = sum(rows.map((row) => row.processing));
    const pending = sum(rows.map((row) => row.pending));
    const rejected = sum(rows.map((row) => row.rejected));
    const online = sum(rows.map((row) => row.online));
    const issued = sum(rows.map((row) => row.issued));
    const reprinted = sum(rows.map((row) => row.reprinted));
    const spoiled = sum(rows.map((row) => row.spoiled ?? 0));
    const bySacrament = [
      { label: "Baptism", value: sum(rows.map((row) => row.baptism)) },
      { label: "Confirmation", value: sum(rows.map((row) => row.confirmation)) },
      { label: "Marriage", value: sum(rows.map((row) => row.marriage)) },
      { label: "Death", value: sum(rows.map((row) => row.death)) },
    ].sort((a, b) => b.value - a.value);
    const busiest = peak(rows, monthTotal);
    return {
      ...base,
      empty: total === 0 && issued === 0,
      summary:
        (total === 0
          ? `No certificate requests came in for ${period}.`
          : `The office took in ${countPhrase(total, "certificate request")} for ${period} and released ${share(released, total)}% of them.`) +
        ` ${countPhrase(issued, "copy", "copies")} issued, ${reprinted} reprinted, ${spoiled} spoiled.`,
      tiles: [
        { label: "Requests", value: total.toLocaleString(), change: change(rows.map(monthTotal), labels, open) },
        { label: "Released", value: released.toLocaleString(), change: change(rows.map((row) => row.released), labels, open) },
        { label: "In the office", value: (processing + pending).toLocaleString(), change: change(rows.map((row) => row.processing + row.pending), labels, open) },
        { label: "Copies issued", value: issued.toLocaleString(), change: change(rows.map((row) => row.issued), labels, open) },
      ],
      highlights: total === 0 ? [] : [
        { label: "Still in the office", value: String(processing + pending), note: `${pending} pending, ${processing} processing` },
        { label: "Most requested", value: bySacrament[0].label, note: `${share(bySacrament[0].value, total)}% of requests` },
        { label: "Came in online", value: `${share(online, total)}%`, note: `${total - online} at the window` },
        { label: "Busiest month", value: busiest ? longMonth(busiest.month) : "—", note: `${busiest ? monthTotal(busiest) : 0} requests` },
      ],
      trend: {
        title: "Requests by month",
        labels,
        money: false,
        series: [
          { id: "total", label: "All requests", color: SHEET_COLORS.teal, values: rows.map(monthTotal) },
          { id: "released", label: "Released", color: SHEET_COLORS.gold, values: rows.map((row) => row.released) },
        ],
      },
      breakdown: {
        title: "By status",
        money: false,
        slices: [
          { id: "released", label: "Released", value: released, color: SHEET_COLORS.teal },
          { id: "processing", label: "Processing", value: processing, color: SHEET_COLORS.tealLight },
          { id: "pending", label: "Pending", value: pending, color: SHEET_COLORS.gold },
          { id: "rejected", label: "Rejected", value: rejected, color: SHEET_COLORS.rose },
        ],
      },
      table: {
        title: "Requests by month",
        headers: ["Month", "Pending", "Processing", "Released", "Rejected", "Total", "Copies issued", "Reprinted", "Spoiled"],
        rows: rows.map((row, index) =>
          [
            labels[index], row.pending, row.processing, row.released, row.rejected, monthTotal(row),
            row.issued, row.reprinted, row.spoiled ?? 0,
          ].map(String)
        ),
        totals: [
          "Total", String(pending), String(processing), String(released), String(rejected), String(total),
          String(issued), String(reprinted), String(spoiled),
        ],
        levels: levels(rows.map(monthTotal)),
      },
      csv: {
        headers: [
          "Month", "Pending", "Processing", "Released", "Rejected", "Total",
          "Baptism", "Confirmation", "Marriage", "Death", "Online", "Walk-in", "Copies issued", "Reprinted", "Spoiled",
        ],
        rows: rows.map((row) => [
          row.month, row.pending, row.processing, row.released, row.rejected, monthTotal(row),
          row.baptism, row.confirmation, row.marriage, row.death, row.online, row.walkin, row.issued, row.reprinted, row.spoiled ?? 0,
        ]),
      },
    };
  }

  if (kind === "donations") {
    const { rows, purposes, waiting } = await getDonationMonthly(range);
    // D4: cheques and transfers the bank hasn't cleared aren't in the totals; say how much is waiting.
    const waitingNote =
      waiting && waiting.count > 0
        ? ` ${formatAmount(waiting.amount)} in ${countPhrase(waiting.count, "cheque or transfer", "cheques and transfers")} is still waiting to clear and isn't counted.`
        : "";
    const labels = rows.map((row) => monthLabel(row.month));
    const open = rows.length > 0 && rows[rows.length - 1].month === currentMonth();
    const total = sum(rows.map((row) => row.amount));
    const cash = sum(rows.map((row) => row.cash));
    const gcash = sum(rows.map((row) => row.gcash));
    // Many funds and typed purposes: keep the four largest and fold the rest into "Other".
    const top = purposes.slice(0, purposes.length > 4 ? 3 : 4);
    const rest = sum(purposes.slice(top.length).map((item) => item.amount));
    const slices: ReportSlice[] = [
      ...top.map((item, index) => ({ id: item.purpose, label: item.purpose, value: item.amount, color: SLICE_COLORS[index] })),
      ...(rest > 0 ? [{ id: "other", label: "Other", value: rest, color: SLICE_COLORS[3] }] : []),
    ];
    const best = peak(rows, (row) => row.amount);
    const low = trough(rows, (row) => row.amount);
    const biggest = largest(slices);
    const average = rows.length ? total / rows.length : 0;
    return {
      ...base,
      empty: total === 0,
      summary:
        total === 0
          ? `No gifts were recorded for ${period}.`
          : `Gifts recorded for ${period} total ${formatAmount(total)} over ${countPhrase(rows.length, "month")}.${waitingNote}`,
      tiles: [
        { label: "Total given", value: formatPeso(total), change: change(rows.map((row) => row.amount), labels, open) },
        { label: "Cash", value: formatPeso(cash), change: change(rows.map((row) => row.cash), labels, open) },
        { label: "GCash", value: formatPeso(gcash), change: change(rows.map((row) => row.gcash), labels, open) },
        { label: "Monthly average", value: formatPeso(average), change: null },
      ],
      highlights: total === 0 ? [] : [
        { label: "Strongest month", value: best ? longMonth(best.month) : "—", note: formatPeso(best?.amount ?? 0) },
        ...(rows.length > 1
          ? [{ label: "Quietest month", value: low ? longMonth(low.month) : "—", note: formatPeso(low?.amount ?? 0) }]
          : []),
        { label: "Top fund", value: biggest.label, note: `${share(biggest.value, total)}% of the total` },
        { label: "Through GCash", value: `${share(gcash, total)}%`, note: `the rest in cash` },
      ],
      trend: {
        title: "Amount by month",
        labels,
        money: true,
        series: [
          { id: "cash", label: "Cash", color: SHEET_COLORS.teal, values: rows.map((row) => row.cash) },
          { id: "gcash", label: "GCash", color: SHEET_COLORS.gold, values: rows.map((row) => row.gcash) },
        ],
      },
      breakdown: { title: "By fund", money: true, slices },
      funds: {
        parish: purposes.filter((p) => !p.mustRemit).map((p) => ({ label: p.purpose, amount: p.amount })),
        remit: purposes.filter((p) => p.mustRemit).map((p) => ({ label: p.purpose, amount: p.amount })),
      },
      table: {
        title: "Amount by month",
        headers: ["Month", "Cash", "GCash", "Total"],
        rows: rows.map((row, index) => [labels[index], formatPeso(row.cash), formatPeso(row.gcash), formatPeso(row.amount)]),
        totals: ["Total", formatPeso(cash), formatPeso(gcash), formatPeso(total)],
        levels: levels(rows.map((row) => row.amount)),
      },
      csv: {
        headers: ["Month", "Total (PHP)", "Cash (PHP)", "GCash (PHP)"],
        rows: rows.map((row) => [row.month, row.amount, row.cash, row.gcash]),
      },
    };
  }

  const rows = await getIntentionMonthly(range);
  const labels = rows.map((row) => monthLabel(row.month));
  const open = rows.length > 0 && rows[rows.length - 1].month === currentMonth();
  const monthTotal = (row: (typeof rows)[number]) => row.pending + row.confirmed + row.said;
  const total = sum(rows.map(monthTotal));
  const said = sum(rows.map((row) => row.said));
  const confirmed = sum(rows.map((row) => row.confirmed));
  const pending = sum(rows.map((row) => row.pending));
  const offering = sum(rows.map((row) => row.offering));
  const busiest = peak(rows, monthTotal);
  return {
    ...base,
    empty: total === 0,
    summary:
      total === 0
        ? `No Mass intentions were booked for ${period}.`
        : `${countPhrase(total, "Mass intention")} were booked for ${period}, with offerings of ${formatAmount(offering)}.`,
    tiles: [
      { label: "Intentions", value: total.toLocaleString(), change: change(rows.map(monthTotal), labels, open) },
      { label: "Said", value: said.toLocaleString(), change: change(rows.map((row) => row.said), labels, open) },
      { label: "Pending", value: pending.toLocaleString(), change: null },
      { label: "Offerings", value: formatPeso(offering), change: change(rows.map((row) => row.offering), labels, open) },
    ],
    highlights: total === 0 ? [] : [
      { label: "Already said", value: `${share(said, total)}%`, note: `${said} of ${total} intentions` },
      { label: "Waiting on the office", value: String(pending), note: "pending confirmation" },
      { label: "Busiest month", value: busiest ? longMonth(busiest.month) : "—", note: `${busiest ? monthTotal(busiest) : 0} intentions` },
      { label: "Offering per intention", value: formatPeso(offering / total), note: "on average" },
    ],
    trend: {
      title: "Intentions by month",
      labels,
      money: false,
      series: [
        { id: "total", label: "Booked", color: SHEET_COLORS.teal, values: rows.map(monthTotal) },
        { id: "said", label: "Said", color: SHEET_COLORS.gold, values: rows.map((row) => row.said) },
      ],
    },
    breakdown: {
      title: "By status",
      money: false,
      slices: [
        { id: "said", label: "Said", value: said, color: SHEET_COLORS.teal },
        { id: "confirmed", label: "Confirmed", value: confirmed, color: SHEET_COLORS.tealLight },
        { id: "pending", label: "Pending", value: pending, color: SHEET_COLORS.gold },
      ],
    },
    table: {
      title: "Intentions by month",
      headers: ["Month", "Pending", "Confirmed", "Said", "Total", "Offerings"],
      rows: rows.map((row, index) =>
        [labels[index], String(row.pending), String(row.confirmed), String(row.said), String(monthTotal(row)), formatPeso(row.offering)]
      ),
      totals: ["Total", String(pending), String(confirmed), String(said), String(total), formatPeso(offering)],
      levels: levels(rows.map(monthTotal)),
    },
    csv: {
      headers: ["Month", "Pending", "Confirmed", "Said", "Total", "Offerings (PHP)"],
      rows: rows.map((row) => [row.month, row.pending, row.confirmed, row.said, monthTotal(row), row.offering]),
    },
  };
}
