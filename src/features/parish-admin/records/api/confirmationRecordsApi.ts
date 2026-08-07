import { MOCK_CONFIRMATION_RECORDS } from "@/services/mocks/confirmationRecords.mock";
import { delay } from "@/services/delay";
import type { ConfirmationRecord } from "@/features/parish-admin/records/types";

export async function listConfirmationRecords(parishId: string): Promise<ConfirmationRecord[]> {
  await delay(200);
  return MOCK_CONFIRMATION_RECORDS.filter((r) => r.parishId === parishId);
}

export async function getConfirmationRecord(
  parishId: string,
  recordId: string
): Promise<ConfirmationRecord | undefined> {
  await delay(150);
  return MOCK_CONFIRMATION_RECORDS.find((r) => r.id === recordId && r.parishId === parishId);
}

export type ConfirmationRecordInput = Omit<
  ConfirmationRecord,
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

export async function createConfirmationRecord(
  parishId: string,
  input: ConfirmationRecordInput
): Promise<ConfirmationRecord> {
  await delay(400);
  const record: ConfirmationRecord = {
    ...input,
    id: `${input.book}:${input.page}${input.line ? `:${input.line}` : ""}`,
    parishId,
    sex: "Male",
    lastUpdated: new Date().toISOString(),
    lastUpdatedBy: "Staff",
    issuedCount: 0,
    status: "Active",
    annotations: [],
    certificates: [],
  };
  MOCK_CONFIRMATION_RECORDS.push(record);
  return record;
}

export async function updateConfirmationRecord(
  parishId: string,
  recordId: string,
  input: ConfirmationRecordInput
): Promise<ConfirmationRecord> {
  await delay(400);
  const record = MOCK_CONFIRMATION_RECORDS.find((r) => r.id === recordId && r.parishId === parishId);
  if (!record) throw new Error(`Record ${recordId} not found`);
  Object.assign(record, input, { lastUpdated: new Date().toISOString() });
  return { ...record };
}
