import { useMemo, useState } from "react";
import type { PlatformReport, ReportFigures, ReportRange } from "@/features/super-admin/api/superAdminApi";
import {
  bucketLabel,
  bucketName,
  CERTIFICATES_COLOR,
  comparisonLabel,
  OUTCOME,
  parishesByRecords,
  rangeLabel,
  RECORDS_COLOR,
  relativeDay,
} from "@/features/super-admin/reports/platformReport";

/*
 * The report, laid out once for the page, the PDF and the printout. `flat` is the PDF and print version:
 * a fixed four-column layout (`portrait` stacks the chart above the outcomes) (it is drawn off-screen, so screen-width breakpoints don't apply), a header
 * naming the dates, and no hover or sorting. Avoid Tailwind opacity modifiers and shadows here:
 * html2canvas can't read the color-mix() they compile to.
 */
export function PlatformReportSheet({
  report,
  range,
  flat = false,
  portrait = false,
}: {
  report: PlatformReport;
  range: ReportRange;
  flat?: boolean;
  portrait?: boolean;
}) {
  const compareWith = comparisonLabel(report);
  return (
    <div className={flat ? "bg-admin-bg px-7 py-6 font-sans text-admin-ink" : ""}>
      {flat ? (
        <header data-pdf-break className="mb-4 flex items-end justify-between gap-6 border-b border-admin-border pb-3.5">
          <div>
            <p className="text-[14px] font-bold text-admin-green-700">HolyApp</p>
            <h1 className="mt-0.5 text-[26px] font-extrabold leading-tight text-admin-ink">Platform report</h1>
            <p className="mt-1 text-[15px] text-admin-ink-muted">{rangeLabel(range)}</p>
          </div>
          <p className="text-right text-[13px] text-admin-ink-faint">
            Made on{" "}
            {new Date().toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}
            <br />
            {report.parishCount} parishes on HolyApp
          </p>
        </header>
      ) : null}

      <div data-pdf-break className={`mb-[18px] grid gap-3.5 ${flat ? "grid-cols-4" : "grid-cols-2 xl:grid-cols-4"}`}>
        <Figure label="Records added" report={report} pick="records" compareWith={compareWith} />
        <Figure label="Certificates issued" report={report} pick="certificates" compareWith={compareWith} />
        <Figure label="Requests received" report={report} pick="requests" compareWith={compareWith} />
        <Figure
          label="Parishes in use"
          report={report}
          pick="parishesInUse"
          compareWith={compareWith}
          suffix={` of ${report.parishCount}`}
        />
      </div>

      <div
        data-pdf-break
        className={`mb-[18px] grid gap-[18px] ${
          flat ? (portrait ? "grid-cols-1" : "grid-cols-[3fr_2fr]") : "grid-cols-1 xl:grid-cols-[3fr_2fr]"
        }`}
      >
        <TrendCard report={report} flat={flat} />
        <OutcomesCard report={report} />
      </div>

      <ParishTable report={report} flat={flat} />
    </div>
  );
}

function Figure({
  label,
  report,
  pick,
  compareWith,
  suffix = "",
}: {
  label: string;
  report: PlatformReport;
  pick: keyof ReportFigures;
  compareWith: string | null;
  suffix?: string;
}) {
  const value = report.figures[pick];
  const before = report.previous?.[pick];
  let change = "";
  if (before !== undefined && compareWith) {
    const diff = value - before;
    if (before === 0 && value > 0) change = `None in ${compareWith}`;
    else if (diff === 0) change = `Same as ${compareWith}`;
    else change = `${diff > 0 ? "+" : "−"}${Math.abs(diff)} from ${compareWith}`;
  }
  return (
    <div className="rounded-lg border border-admin-border bg-admin-surface px-4 pb-3.5 pt-4">
      <p className="text-[13px] font-semibold text-admin-ink-muted">{label}</p>
      <p className="mt-2 text-2xl font-extrabold leading-none tabular-nums text-admin-ink">
        {value.toLocaleString()}
        {suffix ? <span className="text-[15px] font-semibold text-admin-ink-faint">{suffix}</span> : null}
      </p>
      {change ? <p className="mt-1.5 text-[12.5px] font-semibold text-admin-ink-faint">{change}</p> : null}
    </div>
  );
}

const UNIT_TITLE = { week: "Week by week", month: "Month by month", year: "Year by year" } as const;

function TrendCard({ report, flat }: { report: PlatformReport; flat: boolean }) {
  const max = Math.max(1, ...report.buckets.flatMap((b) => [b.records, b.certificates]));
  const empty = report.buckets.every((b) => b.records === 0 && b.certificates === 0);

  return (
    <div className="min-w-0 rounded-lg border border-admin-border bg-admin-surface p-[18px]">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <h3 className="m-0 text-[16px] font-bold text-admin-ink">{UNIT_TITLE[report.unit]}</h3>
          <p className="mt-0.5 text-[13px] text-admin-ink-faint">Records added and certificates issued</p>
        </div>
        <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-[13px] text-admin-ink-muted">
          <Swatch color={RECORDS_COLOR} label="Records added" />
          <Swatch color={CERTIFICATES_COLOR} label="Certificates issued" />
        </div>
      </div>

      {empty ? (
        <p className="py-12 text-center text-[13.5px] text-admin-ink-faint">
          Nothing was added or issued in these dates.
        </p>
      ) : (
        <div className={flat ? "mt-4" : "mt-4 overflow-x-auto"}>
          <ul className="flex min-w-max items-end gap-1.5 border-b border-admin-border">
            {report.buckets.map((b) => (
              <li
                key={b.start}
                className={`flex min-w-[46px] flex-1 items-end justify-center gap-[2px] rounded-t-md px-1 pt-2 ${
                  flat ? "" : "hover:bg-admin-surface-alt"
                }`}
                style={{ height: flat ? 124 : 170 }}
                title={flat ? undefined : `${bucketName(b)}: ${b.records} records added, ${b.certificates} certificates issued`}
              >
                <span className="sr-only">
                  {bucketName(b)}: {b.records} records added, {b.certificates} certificates issued
                </span>
                <Bar value={b.records} max={max} color={RECORDS_COLOR} tallest={flat ? 92 : 136} />
                <Bar value={b.certificates} max={max} color={CERTIFICATES_COLOR} tallest={flat ? 92 : 136} />
              </li>
            ))}
          </ul>
          <div className="flex min-w-max gap-1.5" aria-hidden>
            {report.buckets.map((b, i) => (
              <span
                key={b.start}
                className="min-w-[46px] flex-1 truncate pt-1.5 text-center text-[12px] text-admin-ink-faint"
              >
                {bucketLabel(b, report.unit, report.buckets[i - 1])}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Bar({ value, max, color, tallest }: { value: number; max: number; color: string; tallest: number }) {
  // The tallest bar leaves room for its count above it.
  const height = value === 0 ? 0 : Math.max(3, Math.round((value / max) * tallest));
  return (
    <div className="flex w-[14px] flex-col items-center justify-end" aria-hidden>
      {value > 0 ? (
        <span className="mb-0.5 text-[11.5px] font-semibold tabular-nums text-admin-ink-muted">{value}</span>
      ) : null}
      <div className="w-full rounded-t-[4px]" style={{ height, background: color }} />
    </div>
  );
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: color }} aria-hidden />
      {label}
    </span>
  );
}

function OutcomesCard({ report }: { report: PlatformReport }) {
  const { released, rejected, open, typicalDays } = report.outcomes;
  const total = released + rejected + open;
  const parts = (["released", "open", "rejected"] as const).map((key) => ({
    key,
    ...OUTCOME[key],
    count: report.outcomes[key],
  }));

  let wait: string;
  if (typicalDays === null) wait = "Not enough online requests yet to say.";
  else if (typicalDays < 0.5) wait = "Usually issued the same day.";
  else {
    const days = Math.round(typicalDays);
    wait = `Usually ${days} day${days === 1 ? "" : "s"} from request to certificate.`;
  }

  return (
    <div className="min-w-0 rounded-lg border border-admin-border bg-admin-surface p-[18px]">
      <h3 className="m-0 text-[16px] font-bold text-admin-ink">How requests turned out</h3>
      <p className="mt-0.5 text-[13px] text-admin-ink-faint">Certificate requests made in these dates ({total})</p>

      {total === 0 ? (
        <p className="py-12 text-center text-[13.5px] text-admin-ink-faint">No requests in these dates.</p>
      ) : (
        <>
          <div className="mt-4 flex h-3 gap-[2px] overflow-hidden rounded-full" aria-hidden>
            {parts
              .filter((p) => p.count > 0)
              .map((p) => (
                <div key={p.key} style={{ flexGrow: p.count, background: p.color }} />
              ))}
          </div>
          <ul className="mt-3.5 space-y-2">
            {parts.map((p) => (
              <li key={p.key} className="flex items-center justify-between gap-3 text-[14px] text-admin-ink-muted">
                <Swatch color={p.color} label={p.label} />
                <span className="tabular-nums text-admin-ink">
                  <span className="font-bold">{p.count}</span>
                  <span className="ml-1.5 text-[13px] text-admin-ink-faint">
                    {Math.round((p.count / total) * 100)}%
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-4 border-t border-admin-border pt-3.5">
        <p className="text-[13px] font-semibold text-admin-ink-muted">Online requests</p>
        <p className="mt-0.5 text-[14px] text-admin-ink">{wait}</p>
        <p className="mt-0.5 text-[12.5px] text-admin-ink-faint">
          Walk-ins are left out, as they're issued at the counter.
        </p>
      </div>
    </div>
  );
}

type SortKey = "name" | "records" | "certificates" | "openRequests" | "lastActivity";

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: "name", label: "Parish", numeric: false },
  { key: "records", label: "Records added", numeric: true },
  { key: "certificates", label: "Certificates issued", numeric: true },
  { key: "openRequests", label: "Open requests", numeric: true },
  { key: "lastActivity", label: "Last activity", numeric: false },
];

function ParishTable({ report, flat }: { report: PlatformReport; flat: boolean }) {
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "records", desc: true });

  const rows = useMemo(() => {
    if (flat) return parishesByRecords(report);
    const list = [...report.parishes];
    list.sort((a, b) => {
      let diff: number;
      if (sort.key === "name") diff = a.name.localeCompare(b.name);
      else if (sort.key === "lastActivity") diff = (a.lastActivity ?? "").localeCompare(b.lastActivity ?? "");
      else diff = a[sort.key] - b[sort.key];
      const ordered = sort.desc ? -diff : diff;
      // Ties fall back to the parish name, A to Z.
      return ordered !== 0 ? ordered : a.name.localeCompare(b.name);
    });
    return list;
  }, [report, sort, flat]);

  function toggle(key: SortKey) {
    setSort((s) => (s.key === key ? { key, desc: !s.desc } : { key, desc: key !== "name" }));
  }

  return (
    <div className="overflow-hidden rounded-lg border border-admin-border bg-admin-surface">
      <div data-pdf-break className="border-b border-admin-border px-[18px] py-4">
        <h2 className="font-sans text-[16px] font-bold text-admin-ink">By parish</h2>
        <p className="mt-0.5 text-[13px] text-admin-ink-faint">
          {flat ? "What each parish did in these dates." : "What each parish did in these dates. Select a heading to sort."}
        </p>
      </div>
      <div className={flat ? "" : "relative overflow-x-auto"}>
        <table className={`w-full border-collapse ${flat ? "" : "min-w-[640px]"}`}>
          <thead>
            <tr data-pdf-break className="bg-admin-surface-alt">
              {COLUMNS.map((col) => {
                const active = !flat && sort.key === col.key;
                return (
                  <th
                    key={col.key}
                    aria-sort={flat ? undefined : active ? (sort.desc ? "descending" : "ascending") : "none"}
                    className={`border-b border-admin-border px-[18px] py-2.5 text-[12.5px] font-semibold text-admin-ink-muted ${
                      col.numeric ? "text-right" : "text-left"
                    }`}
                  >
                    {flat ? (
                      col.label
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggle(col.key)}
                        className={`inline-flex items-center gap-1 hover:text-admin-ink ${active ? "text-admin-ink" : ""}`}
                      >
                        {/* In number columns the arrow goes first, so the heading lines up with the numbers. */}
                        {col.numeric ? <SortArrow active={active} desc={sort.desc} /> : null}
                        {col.label}
                        {col.numeric ? null : <SortArrow active={active} desc={sort.desc} />}
                      </button>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} data-pdf-break>
                <td className="border-b border-admin-border px-[18px] py-3">
                  <p className="text-[14px] font-bold text-admin-ink">{row.name}</p>
                  <p className="text-[12.5px] text-admin-ink-faint">{row.address}</p>
                  {!row.hasAdmin ? (
                    <span className="mt-1 inline-block whitespace-nowrap rounded-full bg-admin-gold-100 px-2.5 py-[3px] text-[12.5px] font-bold text-admin-gold-700">
                      Pending setup
                    </span>
                  ) : !row.activeInPeriod ? (
                    <p className="mt-0.5 text-[12.5px] font-semibold text-admin-gold-700">No activity in these dates</p>
                  ) : null}
                </td>
                <Num value={row.records} />
                <Num value={row.certificates} />
                <Num value={row.openRequests} />
                <td className="whitespace-nowrap border-b border-admin-border px-[18px] py-3 text-[14px] text-admin-ink-muted">
                  {relativeDay(row.lastActivity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SortArrow({ active, desc }: { active: boolean; desc: boolean }) {
  return (
    <span aria-hidden className={active ? "" : "opacity-0"}>
      {desc ? "↓" : "↑"}
    </span>
  );
}

function Num({ value }: { value: number }) {
  return (
    <td
      className={`border-b border-admin-border px-[18px] py-3 text-right text-[14px] tabular-nums ${
        value === 0 ? "text-admin-ink-faint" : "text-admin-ink"
      }`}
    >
      {value}
    </td>
  );
}
