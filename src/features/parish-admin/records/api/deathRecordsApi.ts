import { formatCertificateCode, peekNumberingPrefix } from "@/features/parish-admin/certificates/numbering";
import { MOCK_DEATH_RECORDS } from "@/services/mocks/deathRecords.mock";
import { delay } from "@/services/delay";
import type {
  DeathKin,
  DeathRecord,
  DeathSacramentReceived,
} from "@/features/parish-admin/records/types";

export async function listDeathRecords(parishId: string): Promise<DeathRecord[]> {
  await delay(200);
  return MOCK_DEATH_RECORDS.filter((r) => r.parishId === parishId);
}

export async function getDeathRecord(
  parishId: string,
  recordId: string
): Promise<DeathRecord | undefined> {
  await delay(150);
  return MOCK_DEATH_RECORDS.find((r) => r.id === recordId && r.parishId === parishId);
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
  input: DeathRecordInput,
  encodedBy = "u-admin"
): Promise<DeathRecord> {
  await delay(400);
  const now = new Date().toISOString();
  const id = `dth-${Date.now()}`;
  const nested = assignNestedIds(input.kin, input.sacramentsReceived, id);
  const record: DeathRecord = {
    ...input,
    ...nested,
    id,
    parishId,
    encodedBy,
    createdAt: now,
    updatedAt: now,
    status: "Active",
    certificates: [],
  };
  MOCK_DEATH_RECORDS.push(record);
  return record;
}

export async function updateDeathRecord(
  parishId: string,
  recordId: string,
  input: DeathRecordInput
): Promise<DeathRecord> {
  await delay(400);
  const record = MOCK_DEATH_RECORDS.find((r) => r.id === recordId && r.parishId === parishId);
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
  const record = MOCK_DEATH_RECORDS.find((r) => r.id === recordId && r.parishId === parishId);
  if (!record) throw new Error(`Record ${recordId} not found`);

  const seq = String(record.certificates.length + 1).padStart(2, "0");
  const code = formatCertificateCode(
    peekNumberingPrefix("death"),
    `${record.bookNumber}${record.pageNumber}`,
    seq
  );
  const issuedDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  record.certificates.forEach((c) => {
    if (c.status === "Valid") c.status = "Superseded";
  });
  record.certificates.push({
    type: "Certificate of Death",
    date: issuedDate,
    by: "Admin Immaculada",
    status: "Valid",
    code,
  });
  record.updatedAt = new Date().toISOString();
  return { ...record };
}
