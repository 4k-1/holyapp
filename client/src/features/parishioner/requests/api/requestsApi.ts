import { apiFetch } from "@/lib/api";
import type { RequestFormState } from "@/features/parishioner/requests/types";
import type { CertificateRequest } from "@/types";

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
