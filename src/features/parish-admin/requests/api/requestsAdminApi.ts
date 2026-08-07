import { MOCK_REQUESTS } from "@/services/mocks/requests.mock";
import { delay } from "@/services/delay";
import type { CertificateRequest } from "@/types";

/**
 * Only this file is allowed to import MOCK_REQUESTS. Pages call these
 * functions instead — when a real backend exists, only the bodies below
 * change (to `fetch` calls), not the pages that call them.
 */

export async function listAdminRequests(parishId: string): Promise<CertificateRequest[]> {
  await delay(200);
  return MOCK_REQUESTS.filter((r) => r.parishId === parishId);
}

export async function getAdminRequest(
  parishId: string,
  requestId: string
): Promise<CertificateRequest | undefined> {
  await delay(150);
  return MOCK_REQUESTS.find((r) => r.id === requestId && r.parishId === parishId);
}

export async function rejectAdminRequest(
  requestId: string,
  reason = "Rejected by staff."
): Promise<CertificateRequest> {
  await delay(300);
  const request = MOCK_REQUESTS.find((r) => r.id === requestId);
  if (!request) throw new Error(`Request ${requestId} not found`);
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
