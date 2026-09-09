// src/features/parish-admin/schedule/api/scheduleApi.ts
import { delay } from "@/services/delay";
import { RECURRING_COMMITMENTS, RECURRING_OVERRIDES, SCHEDULE_BLOCKS, ASSIGNABLE_STAFF } from "@/services/mocks/schedule.mock";
import {
  getOccurrencesForDate,
  findConflict as findConflictHelper,
  toISO,
  daysInMonth,
} from "../scheduleHelpers";
import type { RecurringCommitment, ScheduleBlock, ScheduleOccurrence } from "../types";

// NOTE: parishId isn't wired into filtering yet since the mock is single-tenant —
// pass it through once schedule data is per-parish, matching the other xxxApi.ts modules.

export async function listRecurringCommitments(): Promise<RecurringCommitment[]> {
  await delay();
  return [...RECURRING_COMMITMENTS];
}

export async function listAssignableStaff(): Promise<string[]> {
  await delay(50);
  return [...ASSIGNABLE_STAFF];
}

export async function getOccurrencesFor(dateStr: string): Promise<ScheduleOccurrence[]> {
  await delay();
  return getOccurrencesForDate(dateStr, RECURRING_COMMITMENTS, SCHEDULE_BLOCKS, RECURRING_OVERRIDES);
}

/** Occurrences for every day in a given month, keyed by ISO date. */
export async function getOccurrencesForMonth(year: number, month: number): Promise<Record<string, ScheduleOccurrence[]>> {
  await delay();
  const result: Record<string, ScheduleOccurrence[]> = {};
  const total = daysInMonth(year, month);
  for (let d = 1; d <= total; d++) {
    const dateStr = toISO(new Date(year, month, d));
    result[dateStr] = getOccurrencesForDate(dateStr, RECURRING_COMMITMENTS, SCHEDULE_BLOCKS, RECURRING_OVERRIDES);
  }
  return result;
}

export async function listAllBlocks(): Promise<ScheduleBlock[]> {
  await delay();
  return [...SCHEDULE_BLOCKS];
}

export async function checkConflict(
  date: string,
  start: string,
  end: string,
  opts: { excludeId?: string; assignee?: string } = {}
): Promise<ScheduleOccurrence | undefined> {
  await delay(120);
  const occurrences = getOccurrencesForDate(date, RECURRING_COMMITMENTS, SCHEDULE_BLOCKS, RECURRING_OVERRIDES);
  return findConflictHelper(occurrences, start, end, opts.excludeId, opts.assignee);
}

export async function addScheduleBlock(input: Omit<ScheduleBlock, "id">): Promise<ScheduleBlock> {
  await delay();
  const block: ScheduleBlock = { ...input, id: `sb${Date.now()}` };
  SCHEDULE_BLOCKS.push(block);
  return block;
}

export async function reassignOccurrence(occurrenceId: string, assignee: string): Promise<void> {
  await delay();
  const existing = SCHEDULE_BLOCKS.find((b) => b.id === occurrenceId);
  if (existing) {
    existing.assignee = assignee;
    return;
  }
  // Recurring occurrence — store as a one-off override, not a change to the recurring commitment.
  RECURRING_OVERRIDES[occurrenceId] = assignee;
}

export async function markRecordStatus(blockId: string, status: "Pending" | "Recorded"): Promise<void> {
  await delay();
  const b = SCHEDULE_BLOCKS.find((x) => x.id === blockId);
  if (b) b.recordStatus = status;
}

export async function addRecurringCommitment(input: Omit<RecurringCommitment, "id">): Promise<RecurringCommitment> {
    await delay();
    const rc: RecurringCommitment = { ...input, id: `rc${Date.now()}` };
    RECURRING_COMMITMENTS.push(rc);
    return rc;
  }
  
  export async function updateRecurringCommitment(
    id: string,
    patch: Partial<Omit<RecurringCommitment, "id">>
  ): Promise<void> {
    await delay();
    const rc = RECURRING_COMMITMENTS.find((x) => x.id === id);
    if (rc) Object.assign(rc, patch);
  }
  
  export async function removeRecurringCommitment(id: string): Promise<void> {
    await delay();
    const idx = RECURRING_COMMITMENTS.findIndex((x) => x.id === id);
    if (idx > -1) RECURRING_COMMITMENTS.splice(idx, 1);
    // Clean up any per-occurrence assignee overrides tied to this commitment.
    Object.keys(RECURRING_OVERRIDES).forEach((k) => {
      if (k.startsWith(id + "-")) delete RECURRING_OVERRIDES[k];
    });
  }