// src/features/parish-admin/schedule/components/MonthCalendarGrid.tsx
import { daysInMonth, toISO } from "../scheduleHelpers";
import { EVENT_TYPE_STYLES } from "@/features/parish-admin/schedule/eventTypeStyles";
import type { LiturgicalDay, ScheduleOccurrence } from "../types";
import { EventTypeKey } from "./EventTypeKey";


/**
 * The month's season, said once beside the month name: "Ordinary Time", or
 * "Ordinary Time → Advent from Nov 29" when it changes during the month.
 */
function monthSeasons(year: number, month: number, days: number, calendar: Record<string, LiturgicalDay>) {
  const parts: string[] = [];
  let current = "";
  for (let d = 1; d <= days; d++) {
    const label = calendar[toISO(new Date(year, month, d))]?.seasonLabel;
    if (!label || label === current) continue;
    const from = new Date(year, month, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    parts.push(current ? `${label} from ${from}` : label);
    current = label;
  }
  return parts.join(" → ");
}

/** Holy Week and Lent days worth naming in a day cell, by how their full title starts. */
const SHORT_TITLES = ["Ash Wednesday", "Palm Sunday", "Holy Thursday", "Good Friday", "Holy Saturday"];

/** The short label shown in a day cell: the parish's own date, a solemnity, a feast or a Holy Week day. */
function dayLabel(day?: LiturgicalDay) {
  if (!day) return "";
  if (day.local.length > 0) return day.local[0];
  const short = SHORT_TITLES.find((prefix) => day.title.startsWith(prefix));
  if (short) return short;
  if (day.rank === "solemnity" || day.rank === "feast") {
    return day.title.replace(/^(Solemnity|Feast) of (the )?/, "").replace(/ \(.*\)$/, "");
  }
  return "";
}

interface MonthCalendarGridProps {
  cursor: Date;
  monthData: Record<string, ScheduleOccurrence[]>;
  /** Each day in the Church calendar (B5 + C5). */
  calendar?: Record<string, LiturgicalDay>;
  loading: boolean;
  selectedDate: string;
  todayStr: string;
  onSelectDate: (dateStr: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  /** The + on a day: adds an event on that date. */
  onAddOnDate?: (dateStr: string) => void;
}

/** Events shown as tags inside a day; the rest are summed up as "+N more". */
const TAGS_PER_DAY = 2;

export function MonthCalendarGrid({
  cursor,
  monthData,
  calendar = {},
  loading,
  selectedDate,
  todayStr,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onToday,
  onAddOnDate,
}: MonthCalendarGridProps) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const days = daysInMonth(year, month);
  const firstDow = new Date(year, month, 1).getDay();
  const prevDays = daysInMonth(year, month - 1);
  const monthName = cursor.toLocaleDateString("en-US", { month: "long" });
  const seasons = monthSeasons(year, month, days, calendar);

  type Cell = { num: number; dateStr?: string; muted?: boolean };
  const cells: Cell[] = [];
  for (let i = firstDow - 1; i >= 0; i--) cells.push({ num: prevDays - i, muted: true });
  for (let d = 1; d <= days; d++) cells.push({ num: d, dateStr: toISO(new Date(year, month, d)) });
  let trailing = 1;
  while (cells.length % 7 !== 0) cells.push({ num: trailing++, muted: true });

  return (
    <div className="rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-border px-5 py-4">
        <div aria-live="polite">
          <h2 className="text-[1.5rem] font-semibold leading-none tracking-[-0.01em] text-admin-ink">
            {monthName} <span className="font-normal text-admin-ink-muted">{year}</span>
          </h2>
          {seasons && <p className="mt-1.5 text-admin-support text-admin-ink-muted">{seasons}</p>}
        </div>
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
            const liturgical = calendar[c.dateStr!];
            const label = dayLabel(liturgical);
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
                })}${label ? `, ${label}` : ""}, ${occurrences.length} ${occurrences.length === 1 ? "event" : "events"}`}
                onClick={() => onSelectDate(c.dateStr!)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectDate(c.dateStr!);
                  }
                }}
                className={`group flex min-h-[104px] min-w-0 cursor-pointer flex-col gap-1 rounded-lg border p-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-green-600/40 ${
                  isSelected
                    ? "border-admin-green-700 bg-admin-green-050 shadow-[inset_0_0_0_1px_var(--color-admin-green-700)]"
                    : "border-admin-border hover:border-admin-border-strong hover:bg-admin-surface-alt/60"
                }`}
              >
                <div className="flex items-center gap-1.5 px-0.5">
                  {onAddOnDate && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddOnDate(c.dateStr!);
                      }}
                      onKeyDown={(e) => e.stopPropagation()}
                      aria-label={`Add an event on ${new Date(`${c.dateStr}T00:00:00`).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                      })}`}
                      title="Add an event on this day"
                      className={`order-last ml-auto flex h-6 w-6 items-center justify-center rounded-md text-admin-green-700 hover:bg-admin-green-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-green-600/40 group-hover:opacity-100 ${
                        isSelected ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className="h-3.5 w-3.5" aria-hidden="true">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </button>
                  )}
                  <span
                    className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-admin-support font-semibold tabular-nums ${
                      isToday ? "bg-admin-green-700 text-white" : liturgical?.obligation ? "text-red-700" : "text-admin-ink"
                    }`}
                  >
                    {c.num}
                  </span>
                </div>
                {label && (
                  <span
                    className={`line-clamp-2 min-w-0 break-words px-0.5 text-[0.6875rem] leading-tight ${
                      liturgical!.local.length > 0 || liturgical!.rank === "solemnity"
                        ? "font-semibold text-admin-gold-700"
                        : "text-admin-ink-muted"
                    }`}
                    title={[liturgical!.title, ...liturgical!.local].filter(Boolean).join(" · ")}
                  >
                    {label}
                  </span>
                )}
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
        <EventTypeKey className="mt-3 border-t border-admin-border pt-3" />
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
