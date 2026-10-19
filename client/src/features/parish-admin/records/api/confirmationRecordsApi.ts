import { apiFetch, ApiError } from "@/lib/api";
import type { ConfirmationRecord } from "@/features/parish-admin/records/types";

export async function listConfirmationRecords(
  _parishId: string,
  options?: { archived?: boolean }
): Promise<ConfirmationRecord[]> {
  const query = options?.archived ? "?archived=1" : "";
  const data = await apiFetch<{ records: ConfirmationRecord[] }>(`/records/confirmation${query}`);
  return data.records ?? [];
}

export async function getConfirmationRecord(
  _parishId: string,
  recordId: string
): Promise<ConfirmationRecord | undefined> {
  try {
    const data = await apiFetch<{ record: ConfirmationRecord }>(
      `/records/confirmation/${encodeURIComponent(recordId)}`
    );
    return data.record;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined;
    throw err;
  }
}

export type ConfirmationRecordInput = Omit<
  ConfirmationRecord,
  "id" | "parishId" | "encodedBy" | "createdAt" | "updatedAt" | "status" | "certificates"
>;

export async function createConfirmationRecord(
  parishId: string,
  input: ConfirmationRecordInput & { annotationNote?: string }
): Promise<ConfirmationRecord> {
  const data = await apiFetch<{ record: ConfirmationRecord }>("/records/confirmation", {
    method: "POST",
    body: { ...input, parishId },
  });
  return data.record;
}

export async function updateConfirmationRecord(
  parishId: string,
  recordId: string,
  input: ConfirmationRecordInput
): Promise<ConfirmationRecord> {
  const data = await apiFetch<{ record: ConfirmationRecord }>(
    `/records/confirmation/${encodeURIComponent(recordId)}`,
    { method: "PATCH", body: { ...input, parishId } }
  );
  return data.record;
}

export async function archiveConfirmationRecord(_parishId: string, recordId: string): Promise<void> {
  await apiFetch(`/records/confirmation/${encodeURIComponent(recordId)}/archive`, {
    method: "POST",
    body: {},
  });
}

export async function unarchiveConfirmationRecord(_parishId: string, recordId: string): Promise<void> {
  await apiFetch(`/records/confirmation/${encodeURIComponent(recordId)}/unarchive`, {
    method: "POST",
    body: {},
  });
}

export async function generateConfirmationCertificate(
  parishId: string,
  recordId: string
): Promise<ConfirmationRecord> {
  await apiFetch(`/records/confirmation/${encodeURIComponent(recordId)}/certificates`, {
    method: "POST",
    body: {},
  });
  const record = await getConfirmationRecord(parishId, recordId);
  if (!record) throw new Error("Record not found.");
  return record;
}
