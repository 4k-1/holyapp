import { ApiError, apiFetch } from "@/lib/api";
import type { CertificateRequest } from "@/types";

export async function listAdminRequests(parishId: string): Promise<CertificateRequest[]> {
  const data = await apiFetch<{ requests: CertificateRequest[] }>("/requests", { auth: true });
  return (data.requests ?? []).filter((request) => request.parishId === parishId);
}

export async function getAdminRequest(
  parishId: string,
  requestId: string
): Promise<CertificateRequest | undefined> {
  try {
    const request = await apiFetch<CertificateRequest>(`/requests/${requestId}`, { auth: true });
    return request.parishId === parishId ? request : undefined;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined;
    throw err;
  }
}

export async function rejectAdminRequest(
  requestId: string,
  reason = "Rejected by staff."
): Promise<CertificateRequest> {
  return apiFetch<CertificateRequest>(`/requests/${requestId}/reject`, {
    method: "POST",
    auth: true,
    body: { reason },
  });
}

export async function linkRequestToRecord(
  requestId: string,
  recordId: string
): Promise<CertificateRequest> {
  return apiFetch<CertificateRequest>(`/requests/${requestId}/link`, {
    method: "POST",
    auth: true,
    body: { recordId },
  });
}

export async function confirmRequestPayment(requestId: string): Promise<CertificateRequest> {
  return apiFetch<CertificateRequest>(`/requests/${requestId}/payment`, {
    method: "POST",
    auth: true,
    body: {},
  });
}

export interface IssueCertificateResult {
  request: CertificateRequest;
  certificateCode: string;
  verifyUrl: string;
}

/** Digital delivery — generate cert and release to parishioner wallet. */
export async function issueCertificate(requestId: string): Promise<IssueCertificateResult> {
  return apiFetch<IssueCertificateResult>(`/requests/${requestId}/issue`, {
    method: "POST",
    auth: true,
    body: {},
  });
}

/** Pickup delivery — staff confirms print/seal; request becomes ready for release. */
export async function markReadyForPickup(requestId: string): Promise<IssueCertificateResult> {
  return apiFetch<IssueCertificateResult>(`/requests/${requestId}/ready`, {
    method: "POST",
    auth: true,
    body: {},
  });
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
  return apiFetch<CertificateRequest>(`/requests/${requestId}/release`, {
    method: "POST",
    auth: true,
    body: input,
  });
}

export async function revokeIssuedCertificate(certificateId: string, reason: string): Promise<void> {
  await apiFetch(`/certificates/${certificateId}/revoke`, {
    method: "POST",
    auth: true,
    body: { reason },
  });
}
