// src/features/parish-admin/schedule/recordLinkHelpers.ts
import type { RecordRegister } from "@/features/parish-admin/records/recordPaths";
import type { ScheduleLinkPrefill } from "@/features/parish-admin/records/scheduleLink";
import { to24Hour } from "./scheduleHelpers";
import type { ScheduleEventType, ScheduleOccurrence } from "./types";

type RecordLinkableBlock = Pick<ScheduleOccurrence, "id" | "type" | "title" | "date" | "start" | "assignee"> & {
  marriageApplicationId?: string | null;
};

/**
 * Sacraments that go in a register (C11). Baptisms and confirmations are celebrated in batches, so one event
 * has several entries and staff close it with "All recorded"; a wedding or funeral closes with its entry.
 */
export const REGISTER_FOR_TYPE: Partial<Record<ScheduleEventType, { register: RecordRegister; batch: boolean }>> = {
  baptism: { register: "baptismal", batch: true },
  confirmation: { register: "confirmation", batch: true },
  wedding: { register: "marriage", batch: false },
  funeral: { register: "death", batch: false },
};

export const isBatchEvent = (type: ScheduleEventType) => REGISTER_FOR_TYPE[type]?.batch === true;

/** The register form for the event's sacrament, or null when it has no register. */
export function getRecordFormPath(block: Pick<RecordLinkableBlock, "type">): string | null {
  const target = REGISTER_FOR_TYPE[block.type];
  return target ? `../records/${target.register}/new` : null;
}

/** Data to prefill the record form with, passed via navigate(path, { state }). */
export function getRecordFormPrefill(block: RecordLinkableBlock): ScheduleLinkPrefill {
  return {
    scheduleBlockId: block.id,
    title: block.title,
    date: block.date,
    time: block.start ? to24Hour(block.start) : undefined,
    priest: block.assignee || undefined,
    marriageApplicationId: block.marriageApplicationId ?? null,
    batch: isBatchEvent(block.type),
  };
}
