import { timeToMinutes } from "@/features/parish-admin/intentions/intentionsHelpers";
import { wasIntentionsPrinted } from "@/features/parish-admin/intentions/printedLists";
import type { TaskCounts } from "./types";

export type TaskGroup = "mass" | "today" | "week";

export const TASK_GROUP_LABEL: Record<TaskGroup, string> = {
  mass: "Before Mass",
  today: "Today",
  week: "This week",
};

export interface DayTask {
  id: string;
  group: TaskGroup;
  /** Starts with the verb: "Review 3 certificate requests". */
  label: string;
  hint?: string;
  done: boolean;
  /** Where the button goes; tasks without one open in place ("prints"). */
  href?: string;
  cta: string;
}

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

/*
 * How many of each task there were at their most today, kept in this browser so a task that has been cleared can
 * still show as done ("Reviewed 3 certificate requests") until the day ends. A convenience only: without storage
 * the finished tasks simply drop off the list.
 */
const PEAK_KEY = "holyapp:dashboard-task-peaks";

type Peaks = Record<string, number>;

export function readPeaks(scope: string, date: string): Peaks {
  try {
    const raw = JSON.parse(localStorage.getItem(PEAK_KEY) ?? "null") as { scope?: string; date?: string; peaks?: Peaks } | null;
    return raw && raw.scope === scope && raw.date === date && raw.peaks ? raw.peaks : {};
  } catch {
    return {};
  }
}

export function savePeaks(scope: string, date: string, peaks: Peaks) {
  try {
    localStorage.setItem(PEAK_KEY, JSON.stringify({ scope, date, peaks }));
  } catch {
    // Storage blocked: finished tasks just won't be shown as done.
  }
}

/** Today's peaks with the current counts folded in. */
export function mergePeaks(stored: Peaks, current: Peaks): Peaks {
  const next = { ...stored };
  for (const [id, n] of Object.entries(current)) next[id] = Math.max(next[id] ?? 0, n);
  return next;
}

export function currentCounts(counts: TaskCounts, unconfirmedPrints: number | null): Peaks {
  return {
    review: counts.toReview,
    ready: counts.ready,
    ...(unconfirmedPrints === null ? {} : { prints: unconfirmedPrints }),
    intentions: counts.intentionsToSchedule,
    unassigned: counts.unassigned,
    records: counts.pendingRecords,
  };
}

/**
 * The day's tasks, from live counts. A task is open while its count is above zero and shows as done once it
 * reaches zero after being open earlier today.
 */
export function buildTasks(counts: TaskCounts, peaks: Peaks, unconfirmedPrints: number | null, now = new Date()): DayTask[] {
  const tasks: DayTask[] = [];
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // Print each later Mass's intention list before it starts; a Mass already begun drops off unless it was printed.
  for (const mass of [...counts.massesToday].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time))) {
    if (mass.intentions === 0) continue;
    const printed = wasIntentionsPrinted(counts.date, mass.time);
    if (!printed && timeToMinutes(mass.time) <= nowMinutes) continue;
    tasks.push({
      id: `print-${mass.time}`,
      group: "mass",
      label: printed ? `Printed the intention list for the ${mass.time} Mass` : `Print the intention list for the ${mass.time} Mass`,
      hint: plural(mass.intentions, "intention"),
      done: printed,
      href: "mass-intentions",
      cta: "Open list",
    });
  }

  const add = (
    id: string,
    group: TaskGroup,
    current: number | undefined,
    open: (n: number) => Omit<DayTask, "id" | "group" | "done">,
    done: (peak: number) => string
  ) => {
    if (current === undefined) return;
    const peak = peaks[id] ?? current;
    if (current > 0) tasks.push({ id, group, done: false, ...open(current) });
    else if (peak > 0) tasks.push({ id, group, done: true, label: done(peak), cta: "" });
  };

  add(
    "review",
    "today",
    counts.toReview,
    (n) => ({ label: `Review ${plural(n, "certificate request")}`, hint: "Sent by parishioners", href: "requests", cta: "Review" }),
    (peak) => `Reviewed ${plural(peak, "certificate request")}`
  );
  add(
    "ready",
    "today",
    counts.ready,
    (n) => ({
      label: `Release ${plural(n, "ready certificate")}`,
      hint: n === 1 ? "The parishioner may come to pick it up" : "Parishioners may come to pick them up",
      href: "requests",
      cta: "Open",
    }),
    (peak) => `Released ${plural(peak, "certificate")}`
  );
  add(
    "prints",
    "today",
    unconfirmedPrints ?? undefined,
    (n) => ({ label: `Confirm ${plural(n, "printed certificate")} came out right`, hint: "Printed, but not checked yet", cta: "Confirm" }),
    () => "Checked every printed certificate"
  );
  add(
    "intentions",
    "today",
    counts.intentionsToSchedule,
    (n) => ({ label: `Schedule ${plural(n, "Mass intention")} requested online`, hint: "For Masses this week", href: "mass-intentions", cta: "Schedule" }),
    (peak) => `Scheduled ${plural(peak, "Mass intention")} requested online`
  );
  add(
    "unassigned",
    "week",
    counts.unassigned,
    (n) => ({
      label: `Assign a priest or staff to ${plural(n, "event")}`,
      hint: "Weddings, funerals, baptisms and blessings in the next 7 days",
      href: "schedule",
      cta: "Assign",
    }),
    () => "Every event in the next 7 days has someone assigned"
  );
  add(
    "records",
    "week",
    counts.pendingRecords,
    (n) => ({ label: `Record ${plural(n, "past event")} in the register`, hint: "Baptisms, weddings and funerals already held", href: "schedule?needs=record", cta: "See list" }),
    (peak) => `Recorded ${plural(peak, "past event")} in the register`
  );

  return tasks;
}
