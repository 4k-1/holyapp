import { apiFetch } from "@/lib/api";
import type { RequestFormState } from "@/features/parishioner/requests/types";
import type { CertificateRequest, PaymentReceipt } from "@/types";

export async function listRequests(parishId: string): Promise<CertificateRequest[]> {
  const data = await apiFetch<{ requests: CertificateRequest[] }>("/requests/mine", { auth: true });
  return (data.requests ?? []).filter((request) => request.parishId === parishId);
}

export async function submitRequest(
  form: RequestFormState,
  _parishId: string,
  _requesterId: string
): Promise<CertificateRequest> {
  return apiFetch<CertificateRequest>("/requests", {
    method: "POST",
    auth: true,
    body: {
      sacramentType: form.sacramentType,
      deliveryMethod: form.deliveryMethod,
      purpose: form.purpose,
      relationship: form.relationship,
      sacramentDate: form.sacramentDate,
      fields: form.fields,
    },
  });
}

export async function startGcashPayment(requestId: string): Promise<{ checkoutUrl?: string; paid?: boolean }> {
  return apiFetch(`/requests/${requestId}/gcash`, { method: "POST", auth: true, body: {} });
}

export async function syncGcashPayment(requestId: string): Promise<{ paid: boolean; request: CertificateRequest }> {
  return apiFetch(`/requests/${requestId}/gcash/sync`, { method: "POST", auth: true, body: {} });
}

export async function getRequestReceipt(requestId: string): Promise<PaymentReceipt> {
  const data = await apiFetch<{ receipt: PaymentReceipt }>(`/requests/${requestId}/receipt`, { auth: true });
  return data.receipt;
}

/** What the parishioner typed into the request form. */
export interface SubmittedRequestDetails {
  relationship: string | null;
  sacramentDate: string | null;
  fields: Record<string, string>;
}

export async function getMyRequest(
  requestId: string
): Promise<{ request: CertificateRequest; submitted: SubmittedRequestDetails }> {
  return apiFetch(`/requests/mine/${encodeURIComponent(requestId)}`, { auth: true });
}
