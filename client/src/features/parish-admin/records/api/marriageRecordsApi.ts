import { MOCK_MARRIAGE_RECORDS } from "@/services/mocks/marriageRecords.mock";
import { delay } from "@/services/delay";
import { appendIssuedCertificate } from "@/features/parish-admin/records/issueCertificate";
import { recordBelongsToParish } from "@/features/parish/parishApi";
import type {
  MarriageConsentPerson,
  MarriageParty,
  MarriageRecord,
} from "@/features/parish-admin/records/types";

async function findMarriageRecord(parishId: string, recordId: string) {
  for (const r of MOCK_MARRIAGE_RECORDS) {
    if (r.id === recordId && (await recordBelongsToParish(r.parishId, parishId))) return r;
  }
  return undefined;
}

export async function listMarriageRecords(parishId: string): Promise<MarriageRecord[]> {
  await delay(200);
  const out: MarriageRecord[] = [];
  for (const r of MOCK_MARRIAGE_RECORDS) {
    if (await recordBelongsToParish(r.parishId, parishId)) out.push(r);
  }
  return out;
}

export async function getMarriageRecord(
  parishId: string,
  recordId: string
): Promise<MarriageRecord | undefined> {
  await delay(150);
  return findMarriageRecord(parishId, recordId);
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

function assignPartyIds(parties: MarriagePartyInput[], marriageId: string): MarriageParty[] {
  return parties.map((party, i) => ({
    ...party,
    id: `${marriageId}-party-${i + 1}`,
    consentPersons: party.consentPersons.map((c, j) => ({
      ...c,
      id: `${marriageId}-party-${i + 1}-consent-${j + 1}`,
    })),
  }));
}

export async function createMarriageRecord(
  parishId: string,
  input: MarriageRecordInput,
  encodedBy = "u-admin"
): Promise<MarriageRecord> {
  await delay(400);
  const now = new Date().toISOString();
  const id = `mrg-${Date.now()}`;
  const record: MarriageRecord = {
    ...input,
    id,
    parishId,
    parties: assignPartyIds(input.parties, id),
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
  const record = await findMarriageRecord(parishId, recordId);
  if (!record) throw new Error(`Record ${recordId} not found`);
  Object.assign(record, input, {
    parties: assignPartyIds(input.parties, recordId),
    updatedAt: new Date().toISOString(),
  });
  return { ...record };
}

export async function generateMarriageCertificate(
  parishId: string,
  recordId: string
): Promise<MarriageRecord> {
  await delay(400);
  const record = await findMarriageRecord(parishId, recordId);
  if (!record) throw new Error(`Record ${recordId} not found`);
  appendIssuedCertificate(record, "marriage");
  return { ...record };
}
