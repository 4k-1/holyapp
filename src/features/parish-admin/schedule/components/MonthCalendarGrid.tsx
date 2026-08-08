// src/features/parish-admin/schedule/components/MonthCalendarGrid.tsx
import { daysInMonth, toISO } from "../scheduleHelpers";
import { EVENT_TYPE_STYLES } from "../types";
import type { ScheduleOccurrence } from "../types";

interface MonthCalendarGridProps {
  cursor: Date;
  monthData: Record<string, ScheduleOccurrence[]>;
  loading: boolean;
  selectedDate: string;
  todayStr: string;
  onSelectDate: (dateStr: string) => void;
}

export function MonthCalendarGrid({
  cursor,
  monthData,
  loading,
  selectedDate,
  todayStr,
  onSelectDate,
}: MonthCalendarGridProps) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const days = daysInMonth(year, month);
  const firstDow = new Date(year, month, 1).getDay();
  const prevDays = daysInMonth(year, month - 1);

  type Cell = { num: number; dateStr?: string; muted?: boolean };
  const cells: Cell[] = [];
  for (let i = firstDow - 1; i >= 0; i--) cells.push({ num: prevDays - i, muted: true });
  for (let d = 1; d <= days; d++) cells.push({ num: d, dateStr: toISO(new Date(year, month, d)) });
  while (cells.length % 7 !== 0) cells.push({ num: 0, muted: true });

  return (
    <div className="rounded-[var(--radius)] border border-admin-border bg-admin-surface p-4">
      <div className="grid grid-cols-7 gap-1.5">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="pb-1.5 text-center text-[10.5px] font-semibold uppercase tracking-wide text-admin-ink-faint">
            {d}
          </div>
        ))}
        {cells.map((c, i) => {
          if (c.muted) {
            return <div key={i} className="min-h-[76px] rounded-lg p-1.5 text-[11px] text-admin-ink-faint/50">{c.num || ""}</div>;
          }
          const occurrences = (monthData[c.dateStr!] ?? []).filter((o) => o.showOnOverview !== false);
          const types = [...new Set(occurrences.map((o) => o.type))];
          const isToday = c.dateStr === todayStr;
          const isSelected = c.dateStr === selectedDate;
          return (
            <button
              key={i}
              onClick={() => onSelectDate(c.dateStr!)}
              className={`min-h-[76px] rounded-lg border p-1.5 text-left transition ${
                isSelected
                  ? "border-admin-green-700 bg-admin-green-050"
                  : isToday
                    ? "border-admin-gold-600/50 bg-admin-gold-100/40"
                    : "border-transparent hover:border-admin-border hover:bg-admin-surface-alt"
              }`}
            >
              <div className={`text-[12px] font-semibold ${isToday ? "text-admin-gold-700" : "text-admin-ink"}`}>
                {c.num}
              </div>
              {types.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-0.5">
                  {types.slice(0, 5).map((t) => (
                    <span key={t} className={`h-1.5 w-1.5 rounded-full ${EVENT_TYPE_STYLES[t].dot}`} />
                  ))}
                </div>
              )}
              {occurrences.length > 0 && (
                <div className="mt-1 text-[9.5px] text-admin-ink-muted">
                  {occurrences.length} event{occurrences.length > 1 ? "s" : ""}
                </div>
              )}
            </button>
          );
        })}
      </div>
      {loading && <p className="mt-3 text-center text-[11.5px] text-admin-ink-faint">Loading schedule…</p>}
    </div>
  );
}