import { appendIssuedCertificate } from "@/features/parish-admin/records/issueCertificate";
import { recordBelongsToParish } from "@/features/parish/parishApi";
import { MOCK_CONFIRMATION_RECORDS } from "@/services/mocks/confirmationRecords.mock";
import { delay } from "@/services/delay";
import type { ConfirmationRecord } from "@/features/parish-admin/records/types";

async function findConfirmationRecord(parishId: string, recordId: string) {
  for (const r of MOCK_CONFIRMATION_RECORDS) {
    if (r.id === recordId && (await recordBelongsToParish(r.parishId, parishId))) return r;
  }
  return undefined;
}

export async function listConfirmationRecords(parishId: string): Promise<ConfirmationRecord[]> {
  await delay(200);
  const out: ConfirmationRecord[] = [];
  for (const r of MOCK_CONFIRMATION_RECORDS) {
    if (await recordBelongsToParish(r.parishId, parishId)) out.push(r);
  }
  return out;
}

export async function getConfirmationRecord(
  parishId: string,
  recordId: string
): Promise<ConfirmationRecord | undefined> {
  await delay(150);
  return findConfirmationRecord(parishId, recordId);
}

export type ConfirmationRecordInput = Omit<
  ConfirmationRecord,
  "id" | "parishId" | "encodedBy" | "createdAt" | "updatedAt" | "status" | "certificates"
>;

export async function createConfirmationRecord(
  parishId: string,
  input: ConfirmationRecordInput,
  encodedBy = "u-admin"
): Promise<ConfirmationRecord> {
  await delay(400);
  const now = new Date().toISOString();
  const record: ConfirmationRecord = {
    ...input,
    id: `cfm-${Date.now()}`,
    parishId,
    encodedBy,
    createdAt: now,
    updatedAt: now,
    status: "Active",
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
  const record = await findConfirmationRecord(parishId, recordId);
  if (!record) throw new Error(`Record ${recordId} not found`);
  Object.assign(record, input, { updatedAt: new Date().toISOString() });
  return { ...record };
}

export async function generateConfirmationCertificate(
  parishId: string,
  recordId: string
): Promise<ConfirmationRecord> {
  await delay(400);
  const record = await findConfirmationRecord(parishId, recordId);
  if (!record) throw new Error(`Record ${recordId} not found`);
  appendIssuedCertificate(record, "confirmation");
  return { ...record };
}
