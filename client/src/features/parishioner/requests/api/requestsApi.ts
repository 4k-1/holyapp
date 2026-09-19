import type { RequestFormState } from "@/features/parishioner/requests/types";
import type { CertificateRequest } from "@/types";
import { recordBelongsToParish } from "@/features/parish/parishApi";
import { getCurrentUser } from "@/features/auth/api/authApi";
import { MOCK_REQUESTS } from "@/services/mocks/requests.mock";
import { delay } from "@/services/delay";

const STORAGE_KEY = "holyapp-parishioner-requests";
const DEMO_PARISHIONER_EMAILS = new Set(["parishioner.a@holyapp.local"]);

/** Only this file is allowed to import MOCK_REQUESTS on the parishioner side. */

function readStoredRequests(): CertificateRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as CertificateRequest[]) : [];
  } catch {
    return [];
  }
}

function writeStoredRequests(requests: CertificateRequest[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
}

export async function listRequests(parishId: string): Promise<CertificateRequest[]> {
  await delay(200);
  const user = getCurrentUser();
  if (!user) return [];

  const out: CertificateRequest[] = [];
  for (const r of readStoredRequests()) {
    if (r.requesterId === user.id && (await recordBelongsToParish(r.parishId, parishId))) {
      out.push(r);
    }
  }

  if (DEMO_PARISHIONER_EMAILS.has(user.email.trim().toLowerCase())) {
    for (const r of MOCK_REQUESTS) {
      if (await recordBelongsToParish(r.parishId, parishId)) out.push(r);
    }
  }

  return out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function submitRequest(
  form: RequestFormState,
  parishId: string,
  requesterId: string
): Promise<CertificateRequest> {
  await delay(500);

  const created: CertificateRequest = {
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

  writeStoredRequests([created, ...readStoredRequests()]);
  return created;
}
