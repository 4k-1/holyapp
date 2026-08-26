import { appendIssuedCertificate } from "@/features/parish-admin/records/issueCertificate";
import { MOCK_BAPTISMAL_RECORDS } from "@/services/mocks/baptismalRecords.mock";
import { delay } from "@/services/delay";
import type { BaptismalRecord, RecordAnnotation } from "@/features/parish-admin/records/types";

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
  "id" | "parishId" | "encodedBy" | "createdAt" | "updatedAt" | "status" | "certificates" | "annotations"
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
    annotations: [],
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
  appendIssuedCertificate(record, "baptism");
  return { ...record };
}

export async function addBaptismalAnnotation(
  parishId: string,
  recordId: string,
  input: Omit<RecordAnnotation, "id" | "by">,
  by = "Admin Immaculada"
): Promise<BaptismalRecord> {
  await delay(300);
  const record = MOCK_BAPTISMAL_RECORDS.find((r) => r.id === recordId && r.parishId === parishId);
  if (!record) throw new Error(`Record ${recordId} not found`);
  if (!record.annotations) record.annotations = [];

  record.annotations.push({
    ...input,
    id: `ann-${Date.now()}`,
    by,
  });
  record.updatedAt = new Date().toISOString();
  return { ...record };
}
