// src/features/parish-admin/schedule/scheduleHelpers.ts
import type { DayAbbrev, RecurringCommitment, ScheduleBlock, ScheduleOccurrence } from "./types";

export function parseTimeToMinutes(t: string): number {
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return 0;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3].toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

export function minutesToTime(total: number): string {
  total = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  const ap = h >= 12 ? "PM" : "AM";
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ap}`;
}

/** "14:30" -> "2:30 PM" */
export function convert24to12(t: string): string {
  if (!t) return "12:00 AM";
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ap}`;
}

/** "2:30 PM" -> "14:30" */
export function to24Hour(t: string): string {
  const mins = parseTimeToMinutes(t);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dayAbbrev(dateStr: string): DayAbbrev {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" }) as DayAbbrev;
}

export function daysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate();
}

/**
 * Materializes recurring commitments + one-off blocks into a single sorted
 * list of occurrences for one date. `overrides` is keyed by the occurrence id
 * ("{commitmentId}-{date}-{time}") and lets a single instance be reassigned
 * without touching the recurring commitment itself.
 */
export function getOccurrencesForDate(
  dateStr: string,
  recurring: RecurringCommitment[],
  blocks: ScheduleBlock[],
  overrides: Record<string, string>
): ScheduleOccurrence[] {
  const day = dayAbbrev(dateStr);
  const occurrences: ScheduleOccurrence[] = [];

  recurring.forEach((rc) => {
    if (!rc.days.includes(day)) return;
    rc.slots.forEach((slot) => {
      const occId = `${rc.id}-${dateStr}-${slot.start}`;
      const assignee = overrides[occId] || rc.assignee;
      occurrences.push({
        id: occId,
        date: dateStr,
        start: slot.start,
        end: slot.end,
        title: rc.label,
        type: rc.type,
        source: "recurring",
        assignee,
        showOnOverview: rc.showOnOverview !== false,
        isRecurringOccurrence: true,
      });
    });
  });

  blocks
    .filter((b) => b.date === dateStr)
    .forEach((b) =>
      occurrences.push({
        ...b,
        source: b.type === "manual" ? "manual" : b.source,
        showOnOverview: b.showOnOverview !== false,
        isRecurringOccurrence: false,
      })
    );

  occurrences.sort((a, b) => parseTimeToMinutes(a.start) - parseTimeToMinutes(b.start));
  return occurrences;
}

/** Finds a time-overlapping occurrence on the same date (optionally same assignee only). */
export function findConflict(
  occurrences: ScheduleOccurrence[],
  start: string,
  end: string,
  excludeId?: string,
  assignee?: string
): ScheduleOccurrence | undefined {
  const startMin = parseTimeToMinutes(start);
  const endMin = parseTimeToMinutes(end);
  return occurrences.find((b) => {
    if (excludeId && b.id === excludeId) return false;
    if (assignee && b.assignee !== assignee) return false;
    const bStart = parseTimeToMinutes(b.start);
    const bEnd = parseTimeToMinutes(b.end);
    return startMin < bEnd && endMin > bStart;
  });
}