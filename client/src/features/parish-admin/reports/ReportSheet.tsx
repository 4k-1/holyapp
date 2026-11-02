import { useCallback, useState, type ReactNode } from "react";
import type { ReportDocument, ReportLevel, ReportTile } from "@/features/parish-admin/reports/reportDocument";
import { SheetDonutChart, SheetLineChart } from "@/features/parish-admin/reports/ReportSheetCharts";
import { formatPeso } from "@/features/parish-admin/reports/reportsHelpers";

/*
 * The report as a dashboard: key numbers, a main chart beside a donut, and the table, with highlights in a
 * right-hand column. One layout serves the Reports page, the PDF and the printout; `interactive` adds hover and
 * sorting on screen. Avoid Tailwind opacity modifiers and shadows here: html2canvas can't read the
 * color-mix() they compile to.
 */

/** Chart units tall for a 460-unit-wide chart to fill the box it sits in; null until measured. */
function useFillHeight(enabled: boolean) {
  const [height, setHeight] = useState<number | null>(null);
  // A ref callback, so the watcher attaches whenever the chart box appears, not just on first render.
  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      if (!enabled || !node) return;
      const observer = new ResizeObserver(([entry]) => {
        const { width, height: boxHeight } = entry.contentRect;
        if (width > 0) setHeight(Math.max(230, Math.round((460 * boxHeight) / width)));
      });
      observer.observe(node);
      return () => observer.disconnect();
    },
    [enabled]
  );
  return [ref, height] as const;
}

function SheetCard({ title, aside, className = "", children }: { title?: string; aside?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section
      data-pdf-break
      className={`flex flex-col rounded-[14px] border border-admin-border bg-admin-surface p-4 [break-inside:avoid] @2xl:p-5 ${className}`}
    >
      {title && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-sans text-admin-group font-semibold text-admin-ink">{title}</h3>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

function ChangeChip({ change }: { change: NonNullable<ReportTile["change"]> }) {
  const up = change.pct >= 0;
  return (
    <span
      className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold leading-4 tabular-nums ${
        up ? "bg-admin-green-050 text-admin-green-700" : "bg-admin-red-100 text-admin-red-700"
      }`}
    >
      <span data-pdf-nudge="-2">
        {up ? "▲" : "▼"} {Math.abs(change.pct).toFixed(0)}%
      </span>
    </span>
  );
}

function StatTile({ tile }: { tile: ReportTile }) {
  return (
    <div className="rounded-[12px] border border-admin-border px-3.5 py-3">
      <p className="text-admin-support text-admin-ink-muted">{tile.label}</p>
      <p className="mt-1 text-[1.5rem] font-bold leading-tight tracking-[-0.02em] text-admin-ink tabular-nums">{tile.value}</p>
      <div className="mt-1.5 flex min-h-5 flex-wrap items-center gap-x-1.5 gap-y-1">
        {tile.change ? (
          <>
            <ChangeChip change={tile.change} />
            <span className="text-[11px] leading-4 text-admin-ink-faint">{tile.change.caption}</span>
          </>
        ) : (
          <span className="text-[11px] leading-4 text-admin-ink-faint">Total for the period</span>
        )}
      </div>
    </div>
  );
}

function Legend({ items }: { items: { id: string; label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-1.5 text-admin-label text-admin-ink-muted">
          <span data-pdf-nudge="3" className="h-2 w-2 rounded-full" style={{ background: item.color }} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

const LEVEL_PILL: Record<ReportLevel, { label: string; className: string }> = {
  high: { label: "High", className: "bg-admin-green-050 text-admin-green-700" },
  typical: { label: "Typical", className: "bg-admin-surface-alt text-admin-ink-muted" },
  low: { label: "Low", className: "bg-admin-gold-100 text-admin-gold-700" },
};

function LevelPill({ level }: { level: ReportLevel }) {
  const pill = LEVEL_PILL[level];
  return (
    <span className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold leading-4 ${pill.className}`}>
      <span data-pdf-nudge="-2">{pill.label}</span>
    </span>
  );
}

function sortValue(cell: string) {
  const number = Number(cell.replace(/[^\d.-]/g, ""));
  return Number.isNaN(number) ? 0 : number;
}

function ReportTable({ doc, interactive }: { doc: ReportDocument; interactive: boolean }) {
  const { table } = doc;
  // Column 0 sorts by the original order (time), the rest by value.
  const [sort, setSort] = useState<{ column: number; descending: boolean }>({ column: 0, descending: false });
  const lastColumn = table.headers.length - 1;
  const order = table.rows.map((_, index) => index);
  order.sort((a, b) => {
    const diff = sort.column === 0 ? a - b : sortValue(table.rows[a][sort.column]) - sortValue(table.rows[b][sort.column]);
    return sort.descending ? -diff : diff;
  });

  function toggle(column: number) {
    setSort((prev) =>
      prev.column === column ? { column, descending: !prev.descending } : { column, descending: column !== 0 }
    );
  }

  return (
    <section data-pdf-break className="rounded-[14px] border border-admin-border bg-admin-surface p-4 @2xl:p-5">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-sans text-admin-group font-semibold text-admin-ink">{table.title}</h3>
        <p className="text-[11px] text-admin-ink-faint">
          Level compares each row with the average row{interactive ? " · select a heading to sort" : ""}
        </p>
      </div>
      {table.rows.length === 0 ? (
        <p className="py-4 text-admin-body text-admin-ink-muted">No entries for {doc.period}.</p>
      ) : (
        <div className="overflow-x-auto pb-1">
          <table className="w-full min-w-[460px] border-collapse text-admin-support">
            <thead>
              <tr data-pdf-break>
                {table.headers.map((header, index) => {
                  const active = sort.column === index;
                  return (
                    <th
                      key={header}
                      aria-sort={interactive && active ? (sort.descending ? "descending" : "ascending") : undefined}
                      className={`border-b border-admin-border py-2 font-medium text-admin-ink-faint ${
                        index === 0 ? "pr-3 text-left" : "px-2 text-right"
                      }`}
                    >
                      {interactive ? (
                        <button
                          type="button"
                          onClick={() => toggle(index)}
                          className={`inline-flex items-center gap-1 hover:text-admin-ink ${active ? "text-admin-ink" : ""}`}
                        >
                          {header}
                          <span aria-hidden="true" className={active ? "" : "text-admin-border-strong"}>
                            {active ? (sort.descending ? "↓" : "↑") : "↕"}
                          </span>
                        </button>
                      ) : (
                        header
                      )}
                    </th>
                  );
                })}
                <th className="border-b border-admin-border py-2 pl-3 text-left font-medium text-admin-ink-faint">Level</th>
              </tr>
            </thead>
            <tbody>
              {order.map((rowIndex) => {
                const row = table.rows[rowIndex];
                return (
                  <tr key={row[0]} data-pdf-break className="[break-inside:avoid]">
                    {row.map((cell, index) => (
                      <td
                        key={table.headers[index]}
                        className={`border-b border-admin-border py-2 tabular-nums ${
                          index === 0
                            ? "pr-3 text-left font-medium text-admin-ink"
                            : `px-2 text-right ${index === lastColumn ? "font-semibold text-admin-ink" : "text-admin-ink-muted"}`
                        }`}
                      >
                        {cell}
                      </td>
                    ))}
                    <td className="border-b border-admin-border py-1.5 pl-3">
                      <LevelPill level={table.levels[rowIndex]} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr data-pdf-break>
                {table.totals.map((cell, index) => (
                  <td
                    key={table.headers[index]}
                    className={`pt-2.5 font-semibold tabular-nums text-admin-green-700 ${index === 0 ? "pr-3 text-left" : "px-2 text-right"}`}
                  >
                    {cell}
                  </td>
                ))}
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}

export function ReportSheet({
  doc,
  flat = false,
  bare = false,
  interactive = false,
}: {
  doc: ReportDocument;
  /** Square edges and fixed padding, for the PDF and the printout. */
  flat?: boolean;
  /** Just the cards, for the Reports page, which has its own heading. */
  bare?: boolean;
  interactive?: boolean;
}) {
  const { trend, breakdown } = doc;
  const [hovered, setHovered] = useState<number | null>(null);
  // On screen the chart row stretches to meet the highlights column, so the line chart grows to fill it.
  const [chartBox, chartHeight] = useFillHeight(interactive);
  const breakdownTotal = breakdown.slices.reduce((total, slice) => total + slice.value, 0);
  const lead = trend.series[0];
  const focus = hovered ?? (lead ? lead.values.indexOf(Math.max(...lead.values)) : -1);
  const amount = (value: number) => (trend.money ? formatPeso(value) : value.toLocaleString());

  return (
    <div
      className={`@container bg-admin-bg font-sans text-admin-ink [print-color-adjust:exact] [-webkit-print-color-adjust:exact] ${
        flat ? "p-7" : bare ? "" : "rounded-[18px] p-3.5 sm:p-5"
      }`}
    >
      {!bare && (
        <header data-pdf-break className="mb-4 flex flex-wrap items-start justify-between gap-3 px-1">
          <div className="flex items-center gap-3">
            <img src="/holyapp-logo.webp" alt="" className="h-10 w-10 shrink-0 rounded-[10px] bg-admin-surface object-contain p-1" />
            <div>
              <p className="text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">{doc.parishName}</p>
              <h2 className="font-sans text-[1.375rem] font-bold leading-tight tracking-[-0.01em] text-admin-ink">
                {doc.title} report
              </h2>
            </div>
          </div>
          <div className="text-left text-admin-support text-admin-ink-muted @md:text-right">
            <p>
              <span className="font-semibold text-admin-ink">Period:</span> {doc.period}
            </p>
            <p>Generated {doc.generatedOn}</p>
          </div>
        </header>
      )}

      {/* The highlights column is for the screen only; the PDF and printout are just the dashboard. */}
      <div
        className={`grid grid-cols-[minmax(0,1fr)] gap-3.5 ${flat ? "" : "@4xl:grid-cols-[minmax(0,1fr)_260px]"}`}
      >
        {/* A column, so the chart row can grow to meet the bottom of the highlights beside it. */}
        <div className="flex min-w-0 flex-col gap-3.5">
          <SheetCard>
            <h3 className="font-sans text-admin-group font-semibold text-admin-ink">Key numbers</h3>
            <p className="mt-1 mb-3.5 text-admin-body text-admin-ink-muted">{doc.summary}</p>
            <div className="grid grid-cols-2 gap-2.5 @2xl:grid-cols-4">
              {doc.tiles.map((tile) => (
                <StatTile key={tile.label} tile={tile} />
              ))}
            </div>
          </SheetCard>

          {!doc.empty && (
            <div className="grid flex-1 grid-cols-[minmax(0,1fr)] gap-3.5 @3xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
              <SheetCard
                title={trend.title}
                aside={trend.series.length > 1 ? <Legend items={trend.series} /> : null}
              >
                <div ref={chartBox} className="relative min-h-[200px] flex-1">
                  <div className={interactive ? "absolute inset-0" : ""}>
                    <SheetLineChart
                      labels={trend.labels}
                      series={trend.series}
                      money={trend.money}
                      active={hovered}
                      onActive={interactive ? setHovered : undefined}
                      height={chartHeight ?? undefined}
                    />
                  </div>
                </div>
                {interactive && focus >= 0 && (
                  <p className="mt-2 text-admin-support text-admin-ink-muted" aria-live="polite">
                    <span className="font-semibold text-admin-ink">{trend.labels[focus]}</span>
                    {trend.series.map((item) => ` · ${item.label} ${amount(item.values[focus])}`).join("")}
                  </p>
                )}
              </SheetCard>
              <SheetCard title={breakdown.title}>
                <div className="flex flex-1 flex-col justify-center">
                  <SheetDonutChart
                    slices={breakdown.slices}
                    centerLabel="in total"
                    centerValue={breakdown.money ? formatPeso(breakdownTotal) : breakdownTotal.toLocaleString()}
                  />
                  <ul className="mt-3 grid gap-1.5">
                    {breakdown.slices.map((slice) => (
                      <li key={slice.id} className="flex items-center justify-between gap-2 text-admin-support">
                        <span className="flex min-w-0 items-center gap-1.5 text-admin-ink-muted">
                          <span data-pdf-nudge="3" className="h-2 w-2 shrink-0 rounded-full" style={{ background: slice.color }} />
                          <span>{slice.label}</span>
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums text-admin-ink">
                          {breakdownTotal ? Math.round((slice.value / breakdownTotal) * 100) : 0}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </SheetCard>
            </div>
          )}
        </div>

        {!flat && (
          <aside className="flex min-w-0 flex-col gap-3.5">
            <SheetCard title="Highlights" className="flex-1">
              {doc.highlights.length === 0 ? (
                <p className="text-admin-support text-admin-ink-muted">Nothing to point out for {doc.period}.</p>
              ) : (
                <ul className="grid gap-2">
                  {doc.highlights.map((item) => (
                    <li key={item.label} className="rounded-[10px] bg-admin-surface-alt px-3 py-2.5">
                      <p className="text-[11px] font-semibold uppercase leading-4 tracking-admin-label text-admin-ink-muted">
                        {item.label}
                      </p>
                      <p className="mt-0.5 text-admin-body font-semibold leading-snug text-admin-ink">{item.value}</p>
                      <p className="text-[11px] leading-4 text-admin-ink-faint">{item.note}</p>
                    </li>
                  ))}
                </ul>
              )}
            </SheetCard>
            <SheetCard title="About this report">
              <dl className="grid gap-1.5 text-admin-support">
                {[
                  ["Period", doc.period],
                  [doc.kind === "sacraments" ? "Years" : "Months", String(doc.table.rows.length)],
                  ["Generated", doc.generatedOn],
                ].map(([term, value]) => (
                  <div key={term} className="flex items-baseline justify-between gap-3">
                    <dt className="shrink-0 text-admin-ink-faint">{term}</dt>
                    <dd className="text-right font-medium text-admin-ink">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 border-t border-admin-border pt-2.5 text-[11px] leading-4 text-admin-ink-muted">
                ▲▼ compare the last finished {doc.kind === "sacraments" ? "year" : "month"} with the one before.
              </p>
            </SheetCard>
          </aside>
        )}
      </div>

      <div className="mt-3.5">
        <ReportTable doc={doc} interactive={interactive} />
      </div>

      {!bare && (
        <p data-pdf-break className="mt-4 px-1 text-[11px] text-admin-ink-faint">
          {doc.parishName} · prepared with HolyApp
        </p>
      )}
    </div>
  );
}
