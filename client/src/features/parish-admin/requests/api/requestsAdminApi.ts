import { formatCertificateCode, peekNumberingPrefix } from "@/features/parish-admin/certificates/numbering";
import { recordBelongsToParish } from "@/features/parish/parishApi";
import { MOCK_REQUESTS } from "@/services/mocks/requests.mock";
import { MOCK_CERTIFICATES } from "@/services/mocks/certificates.mock";
import { delay } from "@/services/delay";
import type { CertificateRequest, IssuedCertificateFields, SacramentType } from "@/types";

/**
 * Only this file is allowed to import MOCK_REQUESTS. Pages call these
 * functions instead — when a real backend exists, only the bodies below
 * change (to `fetch` calls), not the pages that call them.
 */

async function findAdminRequest(parishId: string, requestId: string) {
  for (const r of MOCK_REQUESTS) {
    if (r.id === requestId && (await recordBelongsToParish(r.parishId, parishId))) return r;
  }
  return undefined;
}

export async function listAdminRequests(parishId: string): Promise<CertificateRequest[]> {
  await delay(200);
  const out: CertificateRequest[] = [];
  for (const r of MOCK_REQUESTS) {
    if (await recordBelongsToParish(r.parishId, parishId)) out.push(r);
  }
  return out;
}

export async function getAdminRequest(
  parishId: string,
  requestId: string
): Promise<CertificateRequest | undefined> {
  await delay(150);
  return findAdminRequest(parishId, requestId);
}

export async function rejectAdminRequest(
  requestId: string,
  reason = "Rejected by staff."
): Promise<CertificateRequest> {
  await delay(300);
  const request = MOCK_REQUESTS.find((r) => r.id === requestId);
  if (!request) throw new Error(`Request ${requestId} not found`);
  if (request.payment?.status === "paid") {
    throw new Error("Paid requests cannot be rejected. Handle as a refund instead.");
  }
  request.status = "rejected";
  request.rejectionReason = reason;
  return { ...request };
}

export async function linkRequestToRecord(
  requestId: string,
  recordId: string
): Promise<CertificateRequest> {
  await delay(300);
  const request = MOCK_REQUESTS.find((r) => r.id === requestId);
  if (!request) throw new Error(`Request ${requestId} not found`);
  request.linkedRecordId = recordId;
  request.status = "processing";
  request.payment = request.payment ?? { status: "unpaid", amount: 100 };
  if (request.payment.status !== "paid") {
    request.payment = { ...request.payment, status: "unpaid" };
  }
  return { ...request };
}

function generateCertCode(sacramentType: SacramentType): string {
  const suffix = String(Date.now()).slice(-4);
  return formatCertificateCode(peekNumberingPrefix(sacramentType), suffix, "01");
}

export interface IssueCertificateResult {
  request: CertificateRequest;
  certificateCode: string;
}

/** Digital delivery — generate cert and release to parishioner wallet. */
export async function issueCertificate(requestId: string): Promise<IssueCertificateResult> {
  await delay(500);
  const request = MOCK_REQUESTS.find((r) => r.id === requestId);
  if (!request) throw new Error(`Request ${requestId} not found`);
  if (request.deliveryMethod !== "digital") {
    throw new Error("Use markReadyForPickup for pickup requests.");
  }
  if (request.payment?.status !== "paid") {
    throw new Error("Payment must be confirmed before issuing.");
  }
  if (!request.linkedRecordId) {
    throw new Error("Link a sacramental record before issuing.");
  }

  const certificateCode = generateCertCode(request.sacramentType);
  request.status = "released";

  const details = request.details;
  const fields: IssuedCertificateFields = {
    requestId: request.id,
    registerRef: "—",
    birthdate: details?.birthdate,
    birthplace: details?.birthplace,
    baptismDate: details?.baptismDate,
    motherName: details?.motherName,
    fatherName: details?.fatherName,
  };

  MOCK_CERTIFICATES.push({
    id: `cert-${Date.now()}`,
    requestId: request.id,
    parishId: request.parishId,
    ownerId: request.requesterId,
    sacramentType: request.sacramentType,
    holderName: request.details?.subjectName ?? request.requesterId,
    issuedAt: new Date().toISOString().slice(0, 10),
    state: "valid",
    certCode: certificateCode,
    fields,
  });

  return { request: { ...request }, certificateCode };
}

/** Pickup delivery — staff confirms print/seal; request becomes ready for release. */
export async function markReadyForPickup(requestId: string): Promise<CertificateRequest> {
  await delay(400);
  const request = MOCK_REQUESTS.find((r) => r.id === requestId);
  if (!request) throw new Error(`Request ${requestId} not found`);
  if (request.deliveryMethod !== "pickup") {
    throw new Error("Use issueCertificate for digital requests.");
  }
  if (request.payment?.status !== "paid") {
    throw new Error("Payment must be confirmed before marking ready.");
  }
  if (!request.linkedRecordId) {
    throw new Error("Link a sacramental record before issuing.");
  }
  request.pickupReady = true;
  return { ...request };
}

export interface ReleaseCertificateInput {
  releasedTo: string;
  validId?: string;
}

/** Pickup delivery — confirm handoff to parishioner at the office. */
export async function releaseCertificate(
  requestId: string,
  input: ReleaseCertificateInput
): Promise<CertificateRequest> {
  await delay(400);
  const request = MOCK_REQUESTS.find((r) => r.id === requestId);
  if (!request) throw new Error(`Request ${requestId} not found`);
  if (request.deliveryMethod !== "pickup") {
    throw new Error("Only pickup requests can be released at the office.");
  }
  if (!request.pickupReady) {
    throw new Error("Certificate must be marked ready for pickup first.");
  }
  if (request.status === "released") {
    throw new Error("This certificate has already been released.");
  }
  request.status = "released";
  return { ...request };
}
