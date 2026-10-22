import { daysInMonth, toISO } from "@/features/parish-admin/schedule/scheduleHelpers";
import { timeToMinutes } from "@/features/parish-admin/intentions/intentionsHelpers";
import type { MassSlotCapacityState, MassSlotView } from "@/types";

/** Masses shown inside a day cell before the rest collapse into "+N more". */
const CHIPS_PER_DAY = 3;

const CHIP_TONE: Record<MassSlotCapacityState, string> = {
  open: "bg-admin-green-100 text-admin-green-700",
  nearly_full: "bg-admin-amber-100 text-admin-amber-700",
  full: "bg-admin-red-100 text-admin-red-700",
};

/** "6:00 AM" → "6:00a", "12:00 NN" → "12:00nn" so several Masses fit in a cell. */
function compactTime(time: string) {
  return time.replace(/\s*(AM|PM|NN)$/i, (_, period: string) => (period.toUpperCase() === "NN" ? "nn" : period[0].toLowerCase()));
}

/** Fullest Masses first, so the ones staff need to notice stay visible on busy days. */
function chipOrder(a: MassSlotView, b: MassSlotView) {
  return a.remaining - b.remaining || timeToMinutes(a.time) - timeToMinutes(b.time);
}

interface MassIntentionsMonthGridProps {
  cursor: Date;
  slotsByDate: Record<string, MassSlotView[]>;
  loading: boolean;
  selectedDate: string;
  todayStr: string;
  onSelectDate: (dateStr: string) => void;
}

export function MassIntentionsMonthGrid({
  cursor,
  slotsByDate,
  loading,
  selectedDate,
  todayStr,
  onSelectDate,
}: MassIntentionsMonthGridProps) {
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
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-admin-label text-admin-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className={`rounded px-1.5 py-px font-semibold ${CHIP_TONE.open}`}>6:00a · 4</span> places left
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className={`rounded px-1.5 py-px font-semibold ${CHIP_TONE.nearly_full}`}>8:00a · 1</span> last place
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className={`rounded px-1.5 py-px font-semibold ${CHIP_TONE.full}`}>10:00a full</span> full
        </span>
        <span>Bar shows how much of the whole day is booked</span>
      </div>
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
                className="min-h-[96px] rounded-lg border border-transparent bg-gray-100/60 p-1.5 text-left text-admin-label font-medium text-gray-400"
              >
                {c.num || ""}
              </div>
            );
          }
          const slots = slotsByDate[c.dateStr!] ?? [];
          const isToday = c.dateStr === todayStr;
          const isSelected = c.dateStr === selectedDate;
          const isPast = c.dateStr! < todayStr;
          const booked = slots.reduce((sum, slot) => sum + slot.bookedCount, 0);
          const capacity = slots.reduce((sum, slot) => sum + slot.maxIntentions, 0);
          const shown = [...slots].sort(chipOrder).slice(0, CHIPS_PER_DAY);
          const hidden = slots.length - shown.length;
          const label = isPast
            ? `${c.dateStr}: ${booked} intention${booked === 1 ? "" : "s"}`
            : `${c.dateStr}: ${capacity - booked} of ${capacity} places left across ${slots.length} Masses`;

          return (
            <div
              key={i}
              role="button"
              tabIndex={0}
              aria-label={label}
              aria-pressed={isSelected}
              onClick={() => onSelectDate(c.dateStr!)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectDate(c.dateStr!);
                }
              }}
              className={`flex min-h-[96px] min-w-0 cursor-pointer flex-col items-stretch gap-0.5 rounded-lg border p-1.5 text-left transition ${
                isSelected
                  ? "border-transparent bg-admin-green-100"
                  : isToday
                    ? "border-admin-gold-600/50 bg-admin-gold-100/40"
                    : isPast
                      ? "border-admin-border bg-admin-surface-alt/70 hover:border-admin-ink-faint/40"
                      : "border-admin-border hover:border-admin-ink-faint/40 hover:bg-admin-surface-alt"
              }`}
            >
              <div
                className={`text-admin-body font-semibold ${
                  isToday ? "text-admin-gold-700" : isPast ? "text-admin-ink-faint" : "text-admin-ink"
                }`}
              >
                {c.num}
              </div>
              {isPast ? (
                booked > 0 && (
                  <div className="text-admin-label text-admin-ink-faint">
                    {booked} intention{booked === 1 ? "" : "s"}
                  </div>
                )
              ) : (
                <>
                  {shown.map((slot) => (
                    <span
                      key={slot.id}
                      className={`flex min-w-0 justify-between gap-1 truncate rounded px-1 py-px text-[11px] font-semibold leading-tight ${CHIP_TONE[slot.capacityState]}`}
                    >
                      <span className="truncate">{compactTime(slot.time)}</span>
                      <span className="tabular-nums">{slot.remaining <= 0 ? "full" : slot.remaining}</span>
                    </span>
                  ))}
                  {hidden > 0 && <span className="text-[11px] text-admin-ink-muted">+{hidden} more</span>}
                  {capacity > 0 && (
                    <span className="mt-auto block h-[3px] overflow-hidden rounded-full bg-admin-surface-alt" aria-hidden="true">
                      <span
                        className="block h-full bg-admin-ink-muted"
                        style={{ width: `${Math.round((booked / capacity) * 100)}%` }}
                      />
                    </span>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      {loading && <p className="mt-3 text-center text-admin-label text-admin-ink-faint">Loading Masses…</p>}
    </div>
  );
}
