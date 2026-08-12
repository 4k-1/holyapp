import { MOCK_BAPTISMAL_RECORDS } from "@/services/mocks/baptismalRecords.mock";
import { delay } from "@/services/delay";
import type { BaptismalRecord } from "@/features/parish-admin/records/types";

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
  "id" | "parishId" | "encodedBy" | "createdAt" | "updatedAt" | "status" | "certificates"
>;

export async function createBaptismalRecord(
  parishId: string,
  input: BaptismalRecordInput,
  encodedBy = "u-admin"
): Promise<BaptismalRecord> {
  await delay(400);
  const now = new Date().toISOString();
  const record: BaptismalRecord = {
    ...input,
    id: `bap-${Date.now()}`,
    parishId,
    encodedBy,
    createdAt: now,
    updatedAt: now,
    status: "Active",
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
  Object.assign(record, input, { updatedAt: new Date().toISOString() });
  return { ...record };
}

export async function generateBaptismalCertificate(
  parishId: string,
  recordId: string
): Promise<BaptismalRecord> {
  await delay(400);
  const record = MOCK_BAPTISMAL_RECORDS.find((r) => r.id === recordId && r.parishId === parishId);
  if (!record) throw new Error(`Record ${recordId} not found`);

  const seq = String(record.certificates.length + 1).padStart(2, "0");
  const code = `CF-BAP-${record.bookNumber}${record.pageNumber}-${seq}`;
  const issuedDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  record.certificates.forEach((c) => {
    if (c.status === "Valid") c.status = "Superseded";
  });
  record.certificates.push({
    type: "Certificate of Baptism",
    date: issuedDate,
    by: "Admin Immaculada",
    status: "Valid",
    code,
  });
  record.updatedAt = new Date().toISOString();
  return { ...record };
}
