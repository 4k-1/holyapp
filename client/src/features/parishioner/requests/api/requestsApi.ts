import type { RequestFormState } from "@/features/parishioner/requests/types";
import type { CertificateRequest } from "@/types";
import { MOCK_REQUESTS } from "@/services/mocks/requests.mock";
import { delay } from "@/services/delay";

/** Only this file is allowed to import MOCK_REQUESTS on the parishioner side. */
export async function listRequests(parishId: string): Promise<CertificateRequest[]> {
  await delay(200);
  return MOCK_REQUESTS.filter((r) => r.parishId === parishId);
}

export async function submitRequest(
  form: RequestFormState,
  parishId: string,
  requesterId: string
): Promise<CertificateRequest> {
  await delay(500);

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