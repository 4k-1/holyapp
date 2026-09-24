import { apiFetch, ApiError } from "@/lib/api";
import type {
  DeathKin,
  DeathRecord,
  DeathSacramentReceived,
} from "@/features/parish-admin/records/types";

export async function listDeathRecords(
  _parishId: string,
  options?: { archived?: boolean }
): Promise<DeathRecord[]> {
  const query = options?.archived ? "?archived=1" : "";
  const data = await apiFetch<{ records: DeathRecord[] }>(`/records/death${query}`);
  return data.records ?? [];
}

export async function getDeathRecord(
  _parishId: string,
  recordId: string
): Promise<DeathRecord | undefined> {
  try {
    const data = await apiFetch<{ record: DeathRecord }>(
      `/records/death/${encodeURIComponent(recordId)}`
    );
    return data.record;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined;
    throw err;
  }
}

export type DeathKinInput = Omit<DeathKin, "id">;

export type DeathSacramentReceivedInput = Omit<DeathSacramentReceived, "id">;

export type DeathRecordInput = Omit<
  DeathRecord,
  | "id"
  | "parishId"
  | "encodedBy"
  | "createdAt"
  | "updatedAt"
  | "status"
  | "certificates"
  | "kin"
  | "sacramentsReceived"
> & {
  kin: DeathKinInput[];
  sacramentsReceived: DeathSacramentReceivedInput[];
};

export async function createDeathRecord(
  parishId: string,
  input: DeathRecordInput & { annotationNote?: string }
): Promise<DeathRecord> {
  const data = await apiFetch<{ record: DeathRecord }>("/records/death", {
    method: "POST",
    body: { ...input, parishId },
  });
  return data.record;
}

export async function updateDeathRecord(
  parishId: string,
  recordId: string,
  input: DeathRecordInput
): Promise<DeathRecord> {
  const data = await apiFetch<{ record: DeathRecord }>(
    `/records/death/${encodeURIComponent(recordId)}`,
    { method: "PATCH", body: { ...input, parishId } }
  );
  return data.record;
}

export async function archiveDeathRecord(_parishId: string, recordId: string): Promise<void> {
  await apiFetch(`/records/death/${encodeURIComponent(recordId)}/archive`, {
    method: "POST",
    body: {},
  });
}

export async function unarchiveDeathRecord(_parishId: string, recordId: string): Promise<void> {
  await apiFetch(`/records/death/${encodeURIComponent(recordId)}/unarchive`, {
    method: "POST",
    body: {},
  });
}

export async function generateDeathCertificate(
  parishId: string,
  recordId: string
): Promise<DeathRecord> {
  await apiFetch(`/records/death/${encodeURIComponent(recordId)}/certificates`, {
    method: "POST",
    body: {},
  });
  const record = await getDeathRecord(parishId, recordId);
  if (!record) throw new Error("Record not found.");
  return record;
}
