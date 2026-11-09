import { apiFetch, ApiError } from "@/lib/api";
import type { AssignableStaff, AssigneeValue, RecurringCommitment, ScheduleBlock, ScheduleConflict, ScheduleOccurrence } from "../types";

/**
 * A removed Mass time with intentions still booked on it. `options`: Mass times left on all those dates;
 * `days`: each date, with the Mass times left that day (none means another date is needed).
 */
export interface AffectedMassTime {
  time: string;
  count: number;
  dates: string[];
  options: string[];
  days: { date: string; count: number; options: string[] }[];
}

/** Saving would leave intentions on a Mass time that no longer exists; staff choose where they go. */
export class IntentionsAffectedError extends Error {
  affected: AffectedMassTime[];

  constructor(message: string, affected: AffectedMassTime[]) {
    super(message);
    this.affected = affected;
  }
}

/**
 * Where intentions go. Keys: "6:00 PM" (every date) or "2026-11-14|6:00 PM" (one date).
 * Values: "7:00 PM" (same date) or "2026-11-15|8:00 AM" (another date).
 */
export type IntentionMoves = Record<string, string>;

function fail(err: unknown): never {
  if (err instanceof ApiError) {
    const data = err.data as { code?: string; affected?: AffectedMassTime[] } | null;
    if (err.status === 409 && data?.code === "intentions_affected" && data.affected) {
      throw new IntentionsAffectedError(err.message, data.affected);
    }
    throw new Error(err.message);
  }
  throw new Error("Unable to reach the server.");
}

export async function listRecurringCommitments(): Promise<RecurringCommitment[]> {
  try {
    const data = await apiFetch<{ commitments: RecurringCommitment[] }>("/schedule/recurring");
    return data.commitments ?? [];
  } catch (err) {
    fail(err);
  }
}

export async function listAssignableStaff(): Promise<AssignableStaff[]> {
  try {
    const data = await apiFetch<{ staff: AssignableStaff[] }>("/schedule/staff");
    return data.staff ?? [];
  } catch (err) {
    fail(err);
  }
}

export async function getOccurrencesForMonth(
  year: number,
  month: number
): Promise<Record<string, ScheduleOccurrence[]>> {
  try {
    const data = await apiFetch<{ occurrences: Record<string, ScheduleOccurrence[]> }>(
      `/schedule/month?year=${year}&month=${month}`
    );
    return data.occurrences ?? {};
  } catch (err) {
    fail(err);
  }
}

export async function listAllBlocks(): Promise<ScheduleBlock[]> {
  try {
    const data = await apiFetch<{ blocks: ScheduleBlock[] }>("/schedule/blocks");
    return data.blocks ?? [];
  } catch (err) {
    fail(err);
  }
}

export async function checkConflict(
  date: string,
  start: string,
  end: string,
  opts: { excludeId?: string; assigneeId?: string | null; assignee?: string; location?: string } = {}
): Promise<ScheduleConflict | undefined> {
  try {
    const data = await apiFetch<{ conflict: ScheduleOccurrence | null; message: string | null }>("/schedule/conflicts", {
      method: "POST",
      body: {
        date,
        start,
        end,
        excludeId: opts.excludeId,
        assigneeId: opts.assigneeId || undefined,
        assignee: opts.assignee,
        location: opts.location,
      },
    });
    return data.conflict ? { occurrence: data.conflict, message: data.message ?? "" } : undefined;
  } catch (err) {
    fail(err);
  }
}

export async function addScheduleBlock(input: Omit<ScheduleBlock, "id">): Promise<ScheduleBlock> {
  try {
    const data = await apiFetch<{ block: ScheduleBlock }>("/schedule/events", {
      method: "POST",
      body: input,
    });
    return data.block;
  } catch (err) {
    fail(err);
  }
}

/** Edits an event that was added by hand. */
export async function updateScheduleBlock(id: string, input: Omit<ScheduleBlock, "id">): Promise<ScheduleBlock> {
  try {
    const data = await apiFetch<{ block: ScheduleBlock }>(`/schedule/events/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: input,
    });
    return data.block;
  } catch (err) {
    fail(err);
  }
}

/** `who`: a staff record id, or a guest's name. */
export async function reassignOccurrence(occurrenceId: string, who: AssigneeValue): Promise<void> {
  try {
    await apiFetch("/schedule/assign", {
      method: "POST",
      body: { occurrenceId, assigneeId: who.assigneeId || undefined, assignee: who.assignee },
    });
  } catch (err) {
    fail(err);
  }
}

export async function markRecordStatus(blockId: string, status: "Pending" | "Recorded"): Promise<void> {
  try {
    await apiFetch(`/schedule/events/${encodeURIComponent(blockId)}/record-status`, {
      method: "PATCH",
      body: { status },
    });
  } catch (err) {
    fail(err);
  }
}

export async function addRecurringCommitment(
  input: Omit<RecurringCommitment, "id">
): Promise<RecurringCommitment> {
  try {
    const data = await apiFetch<{ commitment: RecurringCommitment }>("/schedule/recurring", {
      method: "POST",
      body: input,
    });
    return data.commitment;
  } catch (err) {
    fail(err);
  }
}

/** Returns how many booked intentions moved to another Mass time. */
export async function updateRecurringCommitment(
  id: string,
  patch: Partial<Omit<RecurringCommitment, "id">>,
  moves: IntentionMoves = {}
): Promise<number> {
  try {
    const data = await apiFetch<{ movedIntentions?: number }>(`/schedule/recurring/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: { ...patch, moves },
    });
    return data.movedIntentions ?? 0;
  } catch (err) {
    fail(err);
  }
}

/** Returns how many booked intentions moved to another Mass time. */
export async function removeRecurringCommitment(id: string, moves: IntentionMoves = {}): Promise<number> {
  try {
    const data = await apiFetch<{ movedIntentions?: number }>(`/schedule/recurring/${encodeURIComponent(id)}`, {
      method: "DELETE",
      body: { moves },
    });
    return data.movedIntentions ?? 0;
  } catch (err) {
    fail(err);
  }
}
