import { apiFetch, ApiError } from "@/lib/api";
import type { BaptismalRecord, RecordAnnotation } from "@/features/parish-admin/records/types";

export async function listBaptismalRecords(
  _parishId: string,
  options?: { archived?: boolean }
): Promise<BaptismalRecord[]> {
  const query = options?.archived ? "?archived=1" : "";
  const data = await apiFetch<{ records: BaptismalRecord[] }>(`/records/baptism${query}`);
  return data.records ?? [];
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
  const data = await apiFetch<{ record: BaptismalRecord }>(
    `/records/baptism/${encodeURIComponent(recordId)}`,
    { method: "PATCH", body: { ...input, parishId } }
  );
  return data.record;
}

export async function generateBaptismalCertificate(
  parishId: string,
  recordId: string,
  purpose: string
): Promise<BaptismalRecord> {
  await apiFetch<{ certificates: BaptismalRecord["certificates"] }>(
    `/records/baptism/${encodeURIComponent(recordId)}/certificates`,
    { method: "POST", body: { purpose } }
  );
  const record = await getBaptismalRecord(parishId, recordId);
  if (!record) throw new Error("Record not found.");
  return record;
}

export async function archiveBaptismalRecord(_parishId: string, recordId: string): Promise<void> {
  await apiFetch(`/records/baptism/${encodeURIComponent(recordId)}/archive`, {
    method: "POST",
    body: {},
  });
}

export async function unarchiveBaptismalRecord(_parishId: string, recordId: string): Promise<void> {
  await apiFetch(`/records/baptism/${encodeURIComponent(recordId)}/unarchive`, {
    method: "POST",
    body: {},
  });
}

export async function addBaptismalAnnotation(
  _parishId: string,
  recordId: string,
  input: Omit<RecordAnnotation, "id" | "by">
): Promise<BaptismalRecord> {
  const data = await apiFetch<{ record: BaptismalRecord }>(
    `/records/baptism/${encodeURIComponent(recordId)}/annotations`,
    { method: "POST", body: input }
  );
  return data.record;
}
