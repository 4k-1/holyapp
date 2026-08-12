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
  const record = MOCK_CONFIRMATION_RECORDS.find((r) => r.id === recordId && r.parishId === parishId);
  if (!record) throw new Error(`Record ${recordId} not found`);
  Object.assign(record, input, { updatedAt: new Date().toISOString() });
  return { ...record };
}

export async function generateConfirmationCertificate(
  parishId: string,
  recordId: string
): Promise<ConfirmationRecord> {
  await delay(400);
  const record = MOCK_CONFIRMATION_RECORDS.find((r) => r.id === recordId && r.parishId === parishId);
  if (!record) throw new Error(`Record ${recordId} not found`);

  const seq = String(record.certificates.length + 1).padStart(2, "0");
  const code = `CF-CFM-${record.bookNumber}${record.pageNumber}-${seq}`;
  const issuedDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  record.certificates.forEach((c) => {
    if (c.status === "Valid") c.status = "Superseded";
  });
  record.certificates.push({
    type: "Certificate of Confirmation",
    date: issuedDate,
    by: "Admin Immaculada",
    status: "Valid",
    code,
  });
  record.updatedAt = new Date().toISOString();
  return { ...record };
}
