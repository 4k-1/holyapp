import { appendIssuedCertificate } from "@/features/parish-admin/records/issueCertificate";
import { recordBelongsToParish } from "@/features/parish/parishApi";
import { MOCK_BAPTISMAL_RECORDS } from "@/services/mocks/baptismalRecords.mock";
import { delay } from "@/services/delay";
import { apiFetch, ApiError } from "@/lib/api";
import type { BaptismalRecord, RecordAnnotation } from "@/features/parish-admin/records/types";

async function findBaptismalRecord(parishId: string, recordId: string) {
  for (const r of MOCK_BAPTISMAL_RECORDS) {
    if (r.id === recordId && (await recordBelongsToParish(r.parishId, parishId))) return r;
  }
  return undefined;
}

export async function listBaptismalRecords(_parishId: string): Promise<BaptismalRecord[]> {
  const data = await apiFetch<{ records: BaptismalRecord[] }>("/records/baptism");
  return data.records;
}

export async function getBaptismalRecord(
  _parishId: string,
  recordId: string
): Promise<BaptismalRecord | undefined> {
  try {
    const data = await apiFetch<{ record: BaptismalRecord }>(
      `/records/baptism/${encodeURIComponent(recordId)}`
    );
    return data.record;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined;
    throw err;
  }
}

export type BaptismalRecordInput = Omit<
  BaptismalRecord,
  "id" | "parishId" | "encodedBy" | "createdAt" | "updatedAt" | "status" | "certificates" | "annotations"
>;

export async function createBaptismalRecord(
  parishId: string,
  input: BaptismalRecordInput
): Promise<BaptismalRecord> {
  const data = await apiFetch<{ record: BaptismalRecord }>("/records/baptism", {
    method: "POST",
    body: { ...input, parishId },
  });
  return data.record;
}

export async function updateBaptismalRecord(
  parishId: string,
  recordId: string,
  input: BaptismalRecordInput
): Promise<BaptismalRecord> {
  await delay(400);
  const record = await findBaptismalRecord(parishId, recordId);
  if (!record) throw new Error(`Record ${recordId} not found`);
  Object.assign(record, input, { updatedAt: new Date().toISOString() });
  return { ...record };
}

export async function generateBaptismalCertificate(
  parishId: string,
  recordId: string
): Promise<BaptismalRecord> {
  await delay(400);
  const record = await findBaptismalRecord(parishId, recordId);
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
  const record = await findBaptismalRecord(parishId, recordId);
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
