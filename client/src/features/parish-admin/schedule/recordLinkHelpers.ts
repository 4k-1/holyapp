// src/features/parish-admin/schedule/recordLinkHelpers.ts
import type { ScheduleOccurrence } from "./types";

type RecordLinkableBlock = Pick<ScheduleOccurrence, "id" | "type" | "title" | "date" | "assignee">;

/**
 * Maps a schedule block/occurrence's sacrament type to the record-creation route,
 * if that record module exists yet. Returns null when there's no CRUD module
 * for that type — those blocks fall back to "mark as recorded" only.
 *
 * TODO: once confirmation records CRUD ships, add:
 *   case "confirmation": return "../records/confirmation/new";
 */
export function getRecordFormPath(block: RecordLinkableBlock): string | null {
  switch (block.type) {
    case "baptism":
      return "../records/baptismal/new";
    default:
      return null;
  }
}

/** Data to prefill the record form with, passed via navigate(path, { state }). */
export function getRecordFormPrefill(block: RecordLinkableBlock) {
  const rawRef = (block.title.split("—")[1] || block.title).trim();
  return {
    subjectNameHint: rawRef,
    date: block.date,
    priest: block.assignee,
    scheduleBlockId: block.id,
  };
}