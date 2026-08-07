import { MOCK_BAPTISMAL_RECORDS } from "@/services/mocks/baptismalRecords.mock";
import { delay } from "@/services/delay";
import type { BaptismalRecord } from "@/features/parish-admin/records/types";

/**
 * Only this file is allowed to import MOCK_BAPTISMAL_RECORDS. Pages call
 * these functions instead — when a real backend exists, only the bodies
 * below change (to `fetch` calls), not the pages that call them.
 */

export async function listBaptismalRecords(parishId: string): Promise<BaptismalRecord[]> {
  await delay(200);
  return MOCK_BAPTISMAL_RECORDS.filter((r) => r.parishId === parishId);
}

export async function getBaptismalRecord(
  parishId: string,
  recordId: string
): Promise<BaptismalRecord | undefined> {
  await delay(150);
  return MOCK_BAPTISMAL_RECORDS.find((r) => r.id === recordId && r.parishId === parishId);
}

export type BaptismalRecordInput = Omit<
  BaptismalRecord,
  | "id"
  | "parishId"
  | "sex"
  | "lastUpdated"
  | "lastUpdatedBy"
  | "issuedCount"
  | "status"
  | "annotations"
  | "certificates"
>;

export async function createBaptismalRecord(
  parishId: string,
  input: BaptismalRecordInput
): Promise<BaptismalRecord> {
  await delay(400);
  const record: BaptismalRecord = {
    ...input,
    id: `${input.book}:${input.page}${input.line ? `:${input.line}` : ""}`,
    parishId,
    sex: "Male", // TODO: form doesn't collect sex yet
    lastUpdated: new Date().toISOString(),
    lastUpdatedBy: "Staff",
    issuedCount: 0,
    status: "Active",
    annotations: [],
    certificates: [],
  };
  MOCK_BAPTISMAL_RECORDS.push(record);
  return record;
}

export async function updateBaptismalRecord(
  parishId: string,
  recordId: string,
  input: BaptismalRecordInput
): Promise<BaptismalRecord> {
  await delay(400);
  const record = MOCK_BAPTISMAL_RECORDS.find((r) => r.id === recordId && r.parishId === parishId);
  if (!record) throw new Error(`Record ${recordId} not found`);
  Object.assign(record, input, { lastUpdated: new Date().toISOString() });
  return { ...record };
}
