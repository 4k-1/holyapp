import { MOCK_MARRIAGE_RECORDS } from "@/services/mocks/marriageRecords.mock";
import { delay } from "@/services/delay";
import { appendIssuedCertificate } from "@/features/parish-admin/records/issueCertificate";
import type {
  MarriageConsentPerson,
  MarriageParty,
  MarriageRecord,
} from "@/features/parish-admin/records/types";

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
  const record = MOCK_MARRIAGE_RECORDS.find((r) => r.id === recordId && r.parishId === parishId);
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
  const record = MOCK_MARRIAGE_RECORDS.find((r) => r.id === recordId && r.parishId === parishId);
  if (!record) throw new Error(`Record ${recordId} not found`);
  appendIssuedCertificate(record, "marriage");
  return { ...record };
}
