// src/features/parish-admin/schedule/components/MonthCalendarGrid.tsx
import { daysInMonth, toISO } from "../scheduleHelpers";
import { EVENT_TYPE_STYLES } from "@/features/parish-admin/schedule/eventTypeStyles";
import type { ScheduleOccurrence } from "../types";

interface MonthCalendarGridProps {
  cursor: Date;
  monthData: Record<string, ScheduleOccurrence[]>;
  loading: boolean;
  selectedDate: string;
  todayStr: string;
  onSelectDate: (dateStr: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}

/** Events shown as tags inside a day; the rest are summed up as "+N more". */
const TAGS_PER_DAY = 2;

export function MonthCalendarGrid({
  cursor,
  monthData,
  loading,
  selectedDate,
  todayStr,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onToday,
}: MonthCalendarGridProps) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const days = daysInMonth(year, month);
  const firstDow = new Date(year, month, 1).getDay();
  const prevDays = daysInMonth(year, month - 1);
  const monthName = cursor.toLocaleDateString("en-US", { month: "long" });

  type Cell = { num: number; dateStr?: string; muted?: boolean };
  const cells: Cell[] = [];
  for (let i = firstDow - 1; i >= 0; i--) cells.push({ num: prevDays - i, muted: true });
  for (let d = 1; d <= days; d++) cells.push({ num: d, dateStr: toISO(new Date(year, month, d)) });
  let trailing = 1;
  while (cells.length % 7 !== 0) cells.push({ num: trailing++, muted: true });

  return (
    <div className="rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-border px-5 py-4">
        <h2 className="text-[1.5rem] font-semibold leading-none tracking-[-0.01em] text-admin-ink" aria-live="polite">
          {monthName} <span className="font-normal text-admin-ink-muted">{year}</span>
        </h2>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToday}
            className="mr-1 rounded-lg border border-admin-border px-3 py-1.5 text-admin-support font-semibold text-admin-ink hover:bg-admin-surface-alt"
          >
            Today
          </button>
          <NavButton label="Previous month" direction="left" onClick={onPrevMonth} />
          <NavButton label="Next month" direction="right" onClick={onNextMonth} />
        </div>
      </div>

      <div className="p-3 sm:p-4">
        <div className="grid grid-cols-7 gap-1.5">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="pb-1 text-center text-admin-label font-semibold text-admin-ink-muted">
              {d}
            </div>
          ))}
          {cells.map((c, i) => {
            if (c.muted) {
              return (
                <div key={i} className="min-h-[104px] rounded-lg p-2 text-admin-label font-medium text-admin-ink-faint/60">
                  {c.num}
                </div>
              );
            }
            const occurrences = (monthData[c.dateStr!] ?? []).filter((o) => o.showOnOverview !== false);
            const isToday = c.dateStr === todayStr;
            const isSelected = c.dateStr === selectedDate;
            const extra = occurrences.length - TAGS_PER_DAY;
            return (
              <div
                key={i}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`${new Date(`${c.dateStr}T00:00:00`).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}, ${occurrences.length} ${occurrences.length === 1 ? "event" : "events"}`}
                onClick={() => onSelectDate(c.dateStr!)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectDate(c.dateStr!);
                  }
                }}
                className={`flex min-h-[104px] min-w-0 cursor-pointer flex-col gap-1 rounded-lg border p-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-green-600/40 ${
                  isSelected
                    ? "border-admin-green-700 bg-admin-green-050 shadow-[inset_0_0_0_1px_var(--color-admin-green-700)]"
                    : "border-admin-border hover:border-admin-border-strong hover:bg-admin-surface-alt/60"
                }`}
              >
                <div className="px-0.5">
                  <span
                    className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-admin-support font-semibold tabular-nums ${
                      isToday ? "bg-admin-green-700 text-white" : "text-admin-ink"
                    }`}
                  >
                    {c.num}
                  </span>
                </div>
                {occurrences.slice(0, TAGS_PER_DAY).map((o) => (
                  <span
                    key={o.id}
                    className={`block min-w-0 truncate py-0.5 pl-1.5 pr-3 text-[0.6875rem] font-semibold leading-tight ${EVENT_TYPE_STYLES[o.type].tag}`}
                    style={{ clipPath: "polygon(0 0, calc(100% - 7px) 0, 100% 50%, calc(100% - 7px) 100%, 0 100%)", borderRadius: "4px 0 0 4px" }}
                    title={`${o.start} ${o.title}`}
                  >
                    {o.start.replace(":00", "")} {o.title}
                  </span>
                ))}
                {extra > 0 && <span className="px-0.5 text-[0.6875rem] font-medium text-admin-ink-muted">+{extra} more</span>}
              </div>
            );
          })}
        </div>
        {loading && <p className="mt-3 text-center text-admin-label text-admin-ink-faint">Loading schedule…</p>}
      </div>
    </div>
  );
}

function NavButton({ label, direction, onClick }: { label: string; direction: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-admin-border text-admin-ink-muted hover:bg-admin-surface-alt hover:text-admin-ink"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
        <polyline
          points={direction === "left" ? "15 18 9 12 15 6" : "9 18 15 12 9 6"}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
