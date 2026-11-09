import { apiFetch, ApiError } from "@/lib/api";
import type {
  MarriageConsentPerson,
  MarriageParty,
  MarriageRecord,
} from "@/features/parish-admin/records/types";

export async function listMarriageRecords(
  _parishId: string,
  options?: { archived?: boolean }
): Promise<MarriageRecord[]> {
  const query = options?.archived ? "?archived=1" : "";
  const data = await apiFetch<{ records: MarriageRecord[] }>(`/records/marriage${query}`);
  return data.records ?? [];
}

export async function getMarriageRecord(
  _parishId: string,
  recordId: string
): Promise<MarriageRecord | undefined> {
  try {
    const data = await apiFetch<{ record: MarriageRecord }>(
      `/records/marriage/${encodeURIComponent(recordId)}`
    );
    return data.record;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined;
    throw err;
  }
}

export type MarriageConsentPersonInput = Omit<MarriageConsentPerson, "id">;

export type MarriagePartyInput = Omit<MarriageParty, "id" | "consentPersons"> & {
  consentPersons: MarriageConsentPersonInput[];
};

export type MarriageRecordInput = Omit<
  MarriageRecord,
  "id" | "parishId" | "encodedBy" | "createdAt" | "updatedAt" | "status" | "certificates" | "parties"
> & {
  parties: MarriagePartyInput[];
};

export async function createMarriageRecord(
  parishId: string,
  input: MarriageRecordInput & { annotationNote?: string }
): Promise<MarriageRecord> {
  const data = await apiFetch<{ record: MarriageRecord }>("/records/marriage", {
    method: "POST",
    body: { ...input, parishId },
  });
  return data.record;
}

export async function updateMarriageRecord(
  parishId: string,
  recordId: string,
  input: MarriageRecordInput
): Promise<MarriageRecord> {
  const data = await apiFetch<{ record: MarriageRecord }>(
    `/records/marriage/${encodeURIComponent(recordId)}`,
    { method: "PATCH", body: { ...input, parishId } }
  );
  return data.record;
}

export async function archiveMarriageRecord(_parishId: string, recordId: string): Promise<void> {
  await apiFetch(`/records/marriage/${encodeURIComponent(recordId)}/archive`, {
    method: "POST",
    body: {},
  });
}

export async function unarchiveMarriageRecord(_parishId: string, recordId: string): Promise<void> {
  await apiFetch(`/records/marriage/${encodeURIComponent(recordId)}/unarchive`, {
    method: "POST",
    body: {},
  });
}

export async function generateMarriageCertificate(
  parishId: string,
  recordId: string,
  purpose: string
): Promise<MarriageRecord> {
  await apiFetch(`/records/marriage/${encodeURIComponent(recordId)}/certificates`, {
    method: "POST",
    body: { purpose },
  });
  const record = await getMarriageRecord(parishId, recordId);
  if (!record) throw new Error("Record not found.");
  return record;
}
