import { useEffect, useState } from "react";
import { getCalendarDay } from "./api/scheduleApi";
import type { BookingWarning, LiturgicalDay, ScheduleEventType } from "./types";

/**
 * The Church calendar for a date, and why booking this type of event on it may not be allowed (B5 + C5).
 * `needsBookAnyway`: a 'rule' warning, so staff must tick "Book anyway" before saving.
 */
export function useCalendarCheck(date: string, type: ScheduleEventType | "") {
  const [result, setResult] = useState<{ key: string; day?: LiturgicalDay; warnings: BookingWarning[] }>({
    key: "",
    warnings: [],
  });
  const key = `${date}|${type}`;

  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    let active = true;
    const t = setTimeout(() => {
      getCalendarDay(date, type)
        .then((data) => {
          if (active) setResult({ key, ...data });
        })
        .catch(() => {
          if (active) setResult({ key, warnings: [] });
        });
    }, 200);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [date, type, key]);

  // Ignore a stale answer for a date or type that has since changed.
  const current = result.key === key ? result : { key, warnings: [] as BookingWarning[], day: undefined };
  return {
    day: current.day,
    warnings: current.warnings,
    needsBookAnyway: current.warnings.some((w) => w.level === "rule"),
    /** Changes whenever the warnings do, so a "Book anyway" tick never carries over to another day. */
    warningKey: `${key}|${current.warnings.map((w) => w.message).join("|")}`,
  };
}

/** One line naming the day in the Church calendar, e.g. "Lent · 3rd Sunday of Lent". */
export function liturgicalSummary(day: LiturgicalDay) {
  return [day.seasonLabel, day.title].filter(Boolean).join(" · ");
}
