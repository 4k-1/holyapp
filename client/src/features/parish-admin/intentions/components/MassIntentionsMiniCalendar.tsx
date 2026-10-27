import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { daysInMonth, toISO } from "@/features/parish-admin/schedule/scheduleHelpers";
import type { MassSlotView } from "@/types";

type DayState = "open" | "tight" | "full";

const DOT: Record<DayState, string> = {
  open: "bg-admin-green-600",
  tight: "bg-admin-amber-700",
  full: "bg-admin-red-700",
};

const STATE_TEXT: Record<DayState, string> = {
  open: "places left",
  tight: "a Mass is almost full",
  full: "all Masses full",
};

/** One summary per day: every Mass full, at least one down to its last place (or full), or plenty of room. */
function dayState(slots: MassSlotView[]): DayState | null {
  if (slots.length === 0) return null;
  if (slots.every((slot) => slot.capacityState === "full")) return "full";
  if (slots.some((slot) => slot.capacityState !== "open")) return "tight";
  return "open";
}

interface MassIntentionsMiniCalendarProps {
  cursor: Date;
  slotsByDate: Record<string, MassSlotView[]>;
  loading: boolean;
  selectedDate: string;
  todayStr: string;
  onSelectDate: (dateStr: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}

export function MassIntentionsMiniCalendar({
  cursor,
  slotsByDate,
  loading,
  selectedDate,
  todayStr,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
  onToday,
}: MassIntentionsMiniCalendarProps) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const days = daysInMonth(year, month);
  const firstDow = new Date(year, month, 1).getDay();
  const monthLabel = cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <AdminCard className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button type="button" onClick={onPrevMonth} aria-label="Previous month" className={NAV_BUTTON}>
          <Chevron direction="left" />
        </button>
        <p className="font-serif text-admin-group font-semibold text-admin-ink" aria-live="polite">
          {monthLabel}
        </p>
        <button type="button" onClick={onNextMonth} aria-label="Next month" className={NAV_BUTTON}>
          <Chevron direction="right" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1 text-center">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={i} aria-hidden="true" className="pb-1 text-admin-label font-semibold text-admin-ink-muted">
            {d}
          </span>
        ))}
        {Array.from({ length: firstDow }, (_, i) => (
          <span key={`blank-${i}`} aria-hidden="true" />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const day = i + 1;
          const iso = toISO(new Date(year, month, day));
          const slots = slotsByDate[iso] ?? [];
          const isPast = iso < todayStr;
          const isToday = iso === todayStr;
          const isSelected = iso === selectedDate;
          const state = isPast ? null : dayState(slots);
          const unlimited = slots.some((slot) => slot.maxIntentions === null);
          const left = slots.reduce((sum, slot) => sum + (slot.remaining ?? 0), 0);
          const capacity = slots.reduce((sum, slot) => sum + (slot.maxIntentions ?? 0), 0);
          const booked = slots.reduce((sum, slot) => sum + slot.bookedCount, 0);
          const label = new Date(year, month, day).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
          const detail = isPast
            ? `${booked} intention${booked === 1 ? "" : "s"}`
            : slots.length === 0
              ? "no Masses"
              : unlimited
                ? `${booked} intention${booked === 1 ? "" : "s"}, no limit`
                : `${left} of ${capacity} places left`;
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelectDate(iso)}
              aria-pressed={isSelected}
              aria-label={`${label}: ${detail}`}
              title={`${label} · ${detail}`}
              className={`mx-auto flex h-10 w-10 flex-col items-center justify-center rounded-full text-admin-body transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-green-600/50 ${
                isSelected
                  ? "bg-admin-green-700 font-semibold text-white"
                  : isToday
                    ? "font-semibold text-admin-gold-700 ring-1 ring-inset ring-admin-gold-600/60 hover:bg-admin-surface-alt"
                    : isPast
                      ? "text-admin-ink-faint hover:bg-admin-surface-alt"
                      : "text-admin-ink hover:bg-admin-surface-alt"
              }`}
            >
              <span className="leading-none">{day}</span>
              <span
                aria-hidden="true"
                className={`mt-1 h-1.5 w-1.5 rounded-full ${state ? (isSelected ? "bg-white" : DOT[state]) : "bg-transparent"}`}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-admin-border pt-3">
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-admin-label text-admin-ink-muted">
          {(["open", "tight", "full"] as DayState[]).map((state) => (
            <li key={state} className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${DOT[state]}`} />
              {STATE_TEXT[state]}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onToday}
          className="shrink-0 rounded-md px-2 py-1 text-admin-support font-semibold text-admin-green-700 hover:bg-admin-green-050 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-green-600/40"
        >
          Today
        </button>
      </div>
      {loading && <p className="mt-2 text-center text-admin-label text-admin-ink-muted">Loading Masses…</p>}
    </AdminCard>
  );
}

const NAV_BUTTON =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-admin-border bg-admin-surface text-admin-ink-muted hover:bg-admin-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-green-600/40";

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true">
      <polyline
        points={direction === "left" ? "15 18 9 12 15 6" : "9 18 15 12 9 6"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
