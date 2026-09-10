import { MOCK_CERTIFICATES } from "@/services/mocks/certificates.mock";
import { recordBelongsToParish } from "@/features/parish/parishApi";
import { delay } from "@/services/delay";
import type { IssuedCertificate } from "@/types";

/** Only this file is allowed to import MOCK_CERTIFICATES. */
export async function listCertificates(parishId: string): Promise<IssuedCertificate[]> {
  await delay(200);
  const out: IssuedCertificate[] = [];
  for (const c of MOCK_CERTIFICATES) {
    if (await recordBelongsToParish(c.parishId, parishId)) out.push(c);
  }
  return out;
}
