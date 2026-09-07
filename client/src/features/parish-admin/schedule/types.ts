// src/features/parish-admin/schedule/types.ts

export type ScheduleEventType =
  | "mass"
  | "novena"
  | "blessing"
  | "interview"
  | "manual"
  | "baptism"
  | "confirmation"
  | "wedding"
  | "funeral";

export type DayAbbrev = "Sun" | "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat";

/** A standing weekly commitment (Daily Mass, Sunday Mass, a novena, etc). */
export interface RecurringCommitment {
  id: string;
  label: string;
  type: ScheduleEventType;
  days: DayAbbrev[];
  /** e.g. "6:00 AM" — one commitment can have multiple times on its active days */
  times: string[];
  assignee: string;
  /** Hide from the month-view dots / week overview (still shows in day agenda) */
  showOnOverview?: boolean;
}

/** A one-off entry on a specific date — manual, or auto-generated from a sacrament booking. */
export interface ScheduleBlock {
  id: string;
  date: string; // ISO yyyy-mm-dd
  start: string; // "9:00 AM"
  end: string; // "10:00 AM"
  title: string;
  type: ScheduleEventType;
  /** "manual" | "recurring" | or the originating module, e.g. "Sacrament", "Marriage Process" */
  source: string;
  assignee: string;
  recordStatus?: "Pending" | "Recorded";
  showOnOverview?: boolean;
}

/** A ScheduleBlock, OR a materialized occurrence of a RecurringCommitment for one date. */
export interface ScheduleOccurrence extends ScheduleBlock {
  isRecurringOccurrence: boolean;
}

export const EVENT_TYPE_LABELS: Record<ScheduleEventType, string> = {
  mass: "Mass",
  novena: "Novena",
  blessing: "Blessing",
  interview: "Interview",
  manual: "Other",
  baptism: "Baptism",
  confirmation: "Confirmation",
  wedding: "Wedding",
  funeral: "Funeral",
};

export const EVENT_TYPE_STYLES: Record<ScheduleEventType, { tag: string; dot: string }> = {
  mass: { tag: "bg-admin-green-050 text-admin-green-800", dot: "bg-admin-green-600" },
  novena: { tag: "bg-admin-gold-100 text-admin-gold-700", dot: "bg-admin-gold-600" },
  blessing: { tag: "bg-sky-50 text-sky-700", dot: "bg-sky-500" },
  interview: { tag: "bg-violet-50 text-violet-700", dot: "bg-violet-500" },
  manual: { tag: "bg-admin-surface-alt text-admin-ink-muted", dot: "bg-admin-ink-faint" },
  baptism: { tag: "bg-admin-green-100 text-admin-green-900", dot: "bg-admin-green-700" },
  confirmation: { tag: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  wedding: { tag: "bg-rose-50 text-rose-700", dot: "bg-rose-500" },
  funeral: { tag: "bg-neutral-100 text-neutral-700", dot: "bg-neutral-500" },
};