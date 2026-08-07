import { MOCK_CERTIFICATES } from "@/services/mocks/certificates.mock";
import { delay } from "@/services/delay";
import type { IssuedCertificate } from "@/types";

/** Only this file is allowed to import MOCK_CERTIFICATES. */
export async function listCertificates(parishId: string): Promise<IssuedCertificate[]> {
  await delay(200);
  return MOCK_CERTIFICATES.filter((c) => c.parishId === parishId);
}
