// C11: a register entry opened from a schedule event ("Input record").
import type { FormEvent } from "react";

/** What the schedule passes to a register form, via navigate(path, { state }). */
export interface ScheduleLinkPrefill {
  /** The schedule event; the saved entry is linked to it. */
  scheduleBlockId: string;
  title: string;
  /** ISO date of the event. */
  date?: string;
  /** "HH:MM" start time. */
  time?: string;
  /** The priest's name as shown. */
  priest?: string;
  /** A wedding booked through a marriage application, for the couple's names. */
  marriageApplicationId?: string | null;
  /** Baptisms and confirmations are celebrated in batches: several entries for one event. */
  batch: boolean;
}

export function schedulePrefillOf(state: unknown): ScheduleLinkPrefill | null {
  if (!state || typeof state !== "object") return null;
  const value = state as Partial<ScheduleLinkPrefill>;
  return typeof value.scheduleBlockId === "string" && value.scheduleBlockId ? (value as ScheduleLinkPrefill) : null;
}

/** True when the form was sent with "Save and add the next" (a batch from the schedule). */
export function savedWithNext(e: FormEvent) {
  const submitter = (e.nativeEvent as SubmitEvent).submitter;
  return submitter?.getAttribute("data-next") === "true";
}
