import { apiFetch, ApiError } from "@/lib/api";
import type { RecurringCommitment, ScheduleBlock, ScheduleOccurrence } from "../types";

function fail(err: unknown): never {
  if (err instanceof ApiError) throw new Error(err.message);
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

export async function listAssignableStaff(): Promise<string[]> {
  try {
    const data = await apiFetch<{ staff: string[] }>("/schedule/staff");
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
  opts: { excludeId?: string; assignee?: string } = {}
): Promise<ScheduleOccurrence | undefined> {
  try {
    const data = await apiFetch<{ conflict: ScheduleOccurrence | null }>("/schedule/conflicts", {
      method: "POST",
      body: { date, start, end, excludeId: opts.excludeId, assignee: opts.assignee },
    });
    return data.conflict || undefined;
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

export async function reassignOccurrence(occurrenceId: string, assignee: string): Promise<void> {
  try {
    await apiFetch("/schedule/assign", {
      method: "POST",
      body: { occurrenceId, assignee },
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

export async function updateRecurringCommitment(
  id: string,
  patch: Partial<Omit<RecurringCommitment, "id">>
): Promise<void> {
  try {
    await apiFetch(`/schedule/recurring/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: patch,
    });
  } catch (err) {
    fail(err);
  }
}

export async function removeRecurringCommitment(id: string): Promise<void> {
  try {
    await apiFetch(`/schedule/recurring/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (err) {
    fail(err);
  }
}
