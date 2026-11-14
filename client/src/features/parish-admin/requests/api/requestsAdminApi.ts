import { ApiError, apiFetch } from "@/lib/api";
import type { CertificateRequest, IssuedCertificate } from "@/types";

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
  reason: string
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
  certificateId?: string;
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

/** An issued copy as it was printed (from what was saved when it was issued). */
export async function getIssuedCertificate(certificateId: string): Promise<IssuedCertificate> {
  const data = await apiFetch<{ certificate: IssuedCertificate }>(`/certificates/${certificateId}`, { auth: true });
  return data.certificate;
}

export type ReprintReason = "paper_jam" | "printer_error" | "print_quality" | "other";

export const REPRINT_REASONS: { value: ReprintReason; label: string }[] = [
  { value: "paper_jam", label: "Paper jam" },
  { value: "printer_error", label: "Printer error" },
  { value: "print_quality", label: "Faded or misaligned print" },
  { value: "other", label: "Other" },
];

/** Logs a reprint of a valid copy (who, when, why). The copy keeps its number. */
export async function reprintCertificate(
  certificateId: string,
  reason: ReprintReason,
  note?: string
): Promise<{ reprints: number; certificate: IssuedCertificate }> {
  try {
    return await apiFetch<{ reprints: number; certificate: IssuedCertificate }>(
      `/certificates/${certificateId}/reprints`,
      { method: "POST", auth: true, body: { reason, note } }
    );
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.message, { cause: err });
    throw new Error("Unable to reach the server.", { cause: err });
  }
}

async function officePost<T>(path: string, body: unknown, fallback: string): Promise<T> {
  try {
    return await apiFetch<T>(path, { method: "POST", auth: true, body });
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.message, { cause: err });
    throw new Error(fallback, { cause: err });
  }
}

/** "Yes, it printed correctly." */
export function confirmCertificatePrint(certificateId: string): Promise<{ id: string; printConfirmed: boolean }> {
  return officePost(`/certificates/${certificateId}/confirm-print`, {}, "Unable to reach the server.");
}

/** The printout came out wrong: void this copy as spoiled. It keeps its number; issue a new copy instead. */
export function spoilCertificate(certificateId: string, reason: string): Promise<{ id: string }> {
  return officePost(`/certificates/${certificateId}/spoil`, { reason }, "Unable to reach the server.");
}

export interface UnconfirmedCertificate {
  id: string;
  code: string;
  holderName: string;
  sacramentType: string;
  /** Under the parish admin route, e.g. "records/baptismal/<id>". */
  recordPath: string;
  issuedAt: string;
  issuedBy: string;
}

/** Printed copies nobody has confirmed yet, oldest first. */
export async function listUnconfirmedCertificates(): Promise<UnconfirmedCertificate[]> {
  const data = await apiFetch<{ certificates: UnconfirmedCertificate[] }>("/certificates/unconfirmed", { auth: true });
  return data.certificates ?? [];
}
