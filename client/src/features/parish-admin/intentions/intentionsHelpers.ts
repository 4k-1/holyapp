import { getAvailableTimes, getScheduleLabel } from "@/features/parishioner/intentions/massScheduleUtils";
import type {
  MassIntentionRequest,
  MassScheduleEntry,
  MassSlotCapacityState,
  MassSlotView,
} from "@/types";
import { MASS_INTENTION_MAX_PER_SLOT } from "@/types";

export function todayISO(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysISO(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return todayISO(d);
}

export function formatMassDate(iso: string) {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatSlotHeading(date: string, time: string) {
  if (!date) return time;
  const day = new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return `${day} • ${time}`;
}

export function formatRequestedOn(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function intentionLabel(intention: MassIntentionRequest) {
  return `${intention.intentionType} — ${intention.intentionFor}`;
}

/** Donations actually received; pending GCash donations are not counted yet. */
export function donationTotal(intentions: MassIntentionRequest[]) {
  return intentions.reduce((sum, intention) => sum + (intention.payment === "paid" ? intention.offering ?? 0 : 0), 0);
}

export function formatPeso(amount: number) {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function timeToMinutes(time: string) {
  const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM|NN)/i);
  if (!match) return 0;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();
  if (period === "NN" || (period === "PM" && hours !== 12)) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

export function massSlotId(date: string, time: string) {
  return `slot-${date}-${time.replace(/[^a-z0-9]+/gi, "-").replace(/-+$/g, "").toLowerCase()}`;
}

export function capacityState(bookedCount: number, maxIntentions: number): MassSlotCapacityState {
  const remaining = Math.max(0, maxIntentions - bookedCount);
  if (remaining === 0) return "full";
  if (remaining === 1) return "nearly_full";
  return "open";
}

export function datesInRange(from: string, to: string) {
  const start = from <= to ? from : to;
  const end = from <= to ? to : from;
  const dates: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    dates.push(cursor);
    cursor = addDaysISO(cursor, 1);
    if (dates.length > 366) break;
  }
  return dates;
}

export function intentionsForSlot(intentions: MassIntentionRequest[], date: string, time: string) {
  return intentions
    .filter((intention) => intention.scheduleDate === date && intention.scheduleTime === time)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function buildMassSlotViews(options: {
  parishId: string;
  /** Live UUID plus mock aliases (parish-1 / parish-2). Defaults to parishId only. */
  parishIdAliases?: string[];
  from: string;
  to: string;
  location: string;
  schedule: MassScheduleEntry[];
  intentions: MassIntentionRequest[];
  maxIntentions?: number;
}): MassSlotView[] {
  const maxIntentions = options.maxIntentions ?? MASS_INTENTION_MAX_PER_SLOT;
  const aliases = new Set(options.parishIdAliases ?? [options.parishId]);
  const parishIntentions = options.intentions.filter((intention) => aliases.has(intention.parishId));
  const slots: MassSlotView[] = [];

  for (const date of datesInRange(options.from, options.to)) {
    const times = getAvailableTimes(date, options.schedule);
    const scheduleLabel = getScheduleLabel(date, options.schedule);
    for (const time of times) {
      const id = massSlotId(date, time);
      const booked = intentionsForSlot(parishIntentions, date, time);
      const bookedCount = booked.length;
      slots.push({
        id,
        parishId: options.parishId,
        date,
        time,
        scheduleLabel,
        location: options.location,
        maxIntentions,
        bookedCount,
        remaining: Math.max(0, maxIntentions - bookedCount),
        capacityState: capacityState(bookedCount, maxIntentions),
        intentions: booked,
      });
    }
  }

  return slots.sort((a, b) => {
    const date = a.date.localeCompare(b.date);
    if (date !== 0) return date;
    return timeToMinutes(a.time) - timeToMinutes(b.time);
  });
}
