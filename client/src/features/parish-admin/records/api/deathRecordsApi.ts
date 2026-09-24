import { appendIssuedCertificate } from "@/features/parish-admin/records/issueCertificate";
import { recordBelongsToParish } from "@/features/parish/parishApi";
import { MOCK_DEATH_RECORDS } from "@/services/mocks/deathRecords.mock";
import { delay } from "@/services/delay";
import { apiFetch } from "@/lib/api";
import type {
  DeathKin,
  DeathRecord,
  DeathSacramentReceived,
} from "@/features/parish-admin/records/types";

async function findDeathRecord(parishId: string, recordId: string) {
  for (const r of MOCK_DEATH_RECORDS) {
    if (r.id === recordId && (await recordBelongsToParish(r.parishId, parishId))) return r;
  }
  return undefined;
}

export async function listDeathRecords(parishId: string): Promise<DeathRecord[]> {
  await delay(200);
  const out: DeathRecord[] = [];
  for (const r of MOCK_DEATH_RECORDS) {
    if (await recordBelongsToParish(r.parishId, parishId)) out.push(r);
  }
  return out;
}

export async function getDeathRecord(
  parishId: string,
  recordId: string
): Promise<DeathRecord | undefined> {
  await delay(150);
  return findDeathRecord(parishId, recordId);
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

function assignNestedIds(
  kin: DeathKinInput[],
  sacraments: DeathSacramentReceivedInput[],
  deathId: string
) {
  return {
    kin: kin.map((k, i) => ({ ...k, id: `${deathId}-kin-${i + 1}` })),
    sacramentsReceived: sacraments.map((s, i) => ({
      ...s,
      id: `${deathId}-sac-${i + 1}`,
    })),
  };
}

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
  await delay(400);
  const record = await findDeathRecord(parishId, recordId);
  if (!record) throw new Error(`Record ${recordId} not found`);
  const nested = assignNestedIds(input.kin, input.sacramentsReceived, recordId);
  Object.assign(record, input, nested, { updatedAt: new Date().toISOString() });
  return { ...record };
}

export async function generateDeathCertificate(
  parishId: string,
  recordId: string
): Promise<DeathRecord> {
  await delay(400);
  const record = await findDeathRecord(parishId, recordId);
  if (!record) throw new Error(`Record ${recordId} not found`);
  appendIssuedCertificate(record, "death");
  return { ...record };
}
