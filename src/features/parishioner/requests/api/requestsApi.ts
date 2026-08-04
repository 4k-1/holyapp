import type { RequestFormState } from "@/features/parishioner/requests/types";
import type { CertificateRequest } from "@/types";

export async function submitRequest(
  form: RequestFormState,
  parishId: string,
  requesterId: string
): Promise<CertificateRequest> {
  await new Promise((r) => setTimeout(r, 500));

  return {
    id: `req-${Date.now()}`,
    parishId,
    requesterId,
    sacramentType: form.sacramentType,
    status: "pending",
    origin: "online",
    deliveryMethod: form.deliveryMethod,
    payment: null, // no payment yet — assigned once approved
    createdAt: new Date().toISOString(),
  };
}