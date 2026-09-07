import type { MassDayType, MassScheduleEntry } from "@/types";

export function getDayType(dateStr: string): MassDayType {
  const date = new Date(dateStr + "T00:00:00");
  const day = date.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
  const isFirstFriday = day === 5 && date.getDate() <= 7;

  if (isFirstFriday) return "firstFriday";
  if (day === 0) return "sunday";
  if (day === 6) return "saturday";
  return "weekday";
}

export function getAvailableTimes(dateStr: string, schedule: MassScheduleEntry[]): string[] {
  if (!dateStr) return [];
  const dayType = getDayType(dateStr);
  const entry = schedule.find((s) => s.dayType === dayType);
  return entry?.times ?? [];
}

export function getScheduleLabel(dateStr: string, schedule: MassScheduleEntry[]): string {
  if (!dateStr) return "";
  const dayType = getDayType(dateStr);
  return schedule.find((s) => s.dayType === dayType)?.label ?? "";
}