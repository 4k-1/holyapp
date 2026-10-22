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
    <div className="rounded-[var(--radius)] border border-admin-border bg-admin-surface p-4 shadow-md">
      <div className="grid grid-cols-7 gap-1.5">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="pb-1.5 text-center text-admin-body font-semibold uppercase tracking-wide text-admin-ink-faint">
            {d}
          </div>
        ))}
        {cells.map((c, i) => {
         if (c.muted) {
            return (
              <div
                key={i}
                className="min-h-[76px] rounded-lg border border-transparent bg-gray-100/60 p-1.5 text-left text-admin-label font-medium text-gray-400"
              >
                {c.num || ""}
              </div>
            );
          }
          const occurrences = (monthData[c.dateStr!] ?? []).filter((o) => o.showOnOverview !== false);
          const types = [...new Set(occurrences.map((o) => o.type))];
          const isToday = c.dateStr === todayStr;
          const isSelected = c.dateStr === selectedDate;
          return (
            <div
              key={i}
              role="button"
              tabIndex={0}
              onClick={() => onSelectDate(c.dateStr!)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectDate(c.dateStr!);
                }
              }}
              className={`flex min-h-[76px] cursor-pointer flex-col items-start rounded-lg border p-1.5 text-left transition ${
                isSelected
                  ? "border-transparent bg-admin-green-100"
                  : isToday
                    ? "border-admin-gold-600/50 bg-admin-gold-100/40"
                    : "border-admin-border hover:border-admin-ink-faint/40 hover:bg-admin-surface-alt"
              }`}
            >
              <div className={`text-admin-body font-semibold ${isToday ? "text-admin-gold-700" : "text-admin-ink"}`}>
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
                <div className="mt-1 text-admin-label text-admin-ink-muted">
                  {occurrences.length} event{occurrences.length > 1 ? "s" : ""}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {loading && <p className="mt-3 text-center text-admin-label text-admin-ink-faint">Loading schedule…</p>}
    </div>
  );
}