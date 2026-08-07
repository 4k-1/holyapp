import { MOCK_MARRIAGE_RECORDS } from "@/services/mocks/marriageRecords.mock";
import { delay } from "@/services/delay";
import type { MarriageRecord } from "@/features/parish-admin/records/types";

export async function listMarriageRecords(parishId: string): Promise<MarriageRecord[]> {
  await delay(200);
  return MOCK_MARRIAGE_RECORDS.filter((r) => r.parishId === parishId);
}

export async function getMarriageRecord(
  parishId: string,
  recordId: string
): Promise<MarriageRecord | undefined> {
  await delay(150);
  return MOCK_MARRIAGE_RECORDS.find((r) => r.id === recordId && r.parishId === parishId);
}

export type MarriageRecordInput = Omit<
  MarriageRecord,
  "id" | "parishId" | "encodedBy" | "createdAt" | "updatedAt" | "status" | "certificates"
>;

export async function createMarriageRecord(
  parishId: string,
  input: MarriageRecordInput,
  encodedBy = "u-admin"
): Promise<MarriageRecord> {
  await delay(400);
  const now = new Date().toISOString();
  const record: MarriageRecord = {
    ...input,
    id: `mrg-${Date.now()}`,
    parishId,
    encodedBy,
    createdAt: now,
    updatedAt: now,
    status: "Active",
    certificates: [],
  };
  MOCK_MARRIAGE_RECORDS.push(record);
  return record;
}

export async function updateMarriageRecord(
  parishId: string,
  recordId: string,
  input: MarriageRecordInput
): Promise<MarriageRecord> {
  await delay(400);
  const record = MOCK_MARRIAGE_RECORDS.find((r) => r.id === recordId && r.parishId === parishId);
  if (!record) throw new Error(`Record ${recordId} not found`);
  Object.assign(record, input, { updatedAt: new Date().toISOString() });
  return { ...record };
}

export async function generateMarriageCertificate(
  parishId: string,
  recordId: string
): Promise<MarriageRecord> {
  await delay(400);
  const record = MOCK_MARRIAGE_RECORDS.find((r) => r.id === recordId && r.parishId === parishId);
  if (!record) throw new Error(`Record ${recordId} not found`);

  const seq = String(record.certificates.length + 1).padStart(2, "0");
  const code = `CF-MRG-${record.bookNumber}${record.pageNumber}-${seq}`;
  const issuedDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  record.certificates.forEach((c) => {
    if (c.status === "Valid") c.status = "Superseded";
  });
  record.certificates.push({
    type: "Certificate of Marriage",
    date: issuedDate,
    by: "Admin Immaculada",
    status: "Valid",
    code,
  });
  record.updatedAt = new Date().toISOString();
  return { ...record };
}
