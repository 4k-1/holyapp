import { timeToMinutes } from "./intentionsHelpers";

/*
 * Which Masses' intention lists were printed today, so the dashboard can tick "Print the intention list" off.
 * Printing isn't recorded anywhere else, and the office prints from its own computer, so this browser's storage
 * is enough. It is a convenience only: if storage is unavailable the task simply stays open.
 */

const KEY = "holyapp:intentions-printed";

function slotKey(date: string, time: string) {
  return `${date}@${timeToMinutes(time)}`;
}

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

/** Remember that these Masses' lists were printed. Older days are dropped. */
export function markIntentionsPrinted(slots: { date: string; time: string }[]) {
  if (slots.length === 0) return;
  const today = slots[0].date;
  const kept = read().filter((key) => key.split("@")[0] >= today);
  const next = new Set([...kept, ...slots.map((slot) => slotKey(slot.date, slot.time))]);
  try {
    localStorage.setItem(KEY, JSON.stringify([...next]));
  } catch {
    // Storage blocked: the dashboard task just stays open.
  }
}

export function wasIntentionsPrinted(date: string, time: string) {
  return read().includes(slotKey(date, time));
}
