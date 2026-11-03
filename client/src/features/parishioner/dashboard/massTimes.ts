/** "6:00 PM" or "18:00" → minutes after midnight, or null when the text isn't a time. */
export function timeToMinutes(text: string): number | null {
  const twelve = /(\d{1,2}):(\d{2})\s*(AM|PM)/i.exec(text);
  if (twelve) {
    let hours = Number(twelve[1]) % 12;
    if (twelve[3].toUpperCase() === "PM") hours += 12;
    return hours * 60 + Number(twelve[2]);
  }
  const plain = /^(\d{1,2}):(\d{2})/.exec(text.trim());
  return plain ? Number(plain[1]) * 60 + Number(plain[2]) : null;
}

/** A local calendar date as the schedule API takes it, e.g. "2026-11-03". */
export function dateStamp(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export interface NextMass {
  when: "Today" | "Tomorrow";
  time: string;
  /** The day's other Masses after this one. */
  later: string[];
}

/** The next Mass still to start: later today, or else the first one tomorrow. */
export function nextMass(today: string[], tomorrow: string[], now = new Date()): NextMass | null {
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const sorted = (times: string[]) =>
    [...times].sort((a, b) => (timeToMinutes(a) ?? 0) - (timeToMinutes(b) ?? 0));
  const remaining = sorted(today).filter((time) => (timeToMinutes(time) ?? -1) > minutesNow);
  if (remaining.length > 0) return { when: "Today", time: remaining[0], later: remaining.slice(1) };
  const first = sorted(tomorrow);
  if (first.length > 0) return { when: "Tomorrow", time: first[0], later: first.slice(1) };
  return null;
}
