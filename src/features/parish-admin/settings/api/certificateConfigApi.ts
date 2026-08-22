import { delay } from "@/services/delay";
import { CERTIFICATE_CONFIG, setCertificateConfig } from "@/services/mocks/certificateConfig.mock";
import type { CertificateAppearance, CertificateConfigBySacrament } from "../types";
import type { SacramentType } from "@/types";

function cloneConfig(config: CertificateConfigBySacrament): CertificateConfigBySacrament {
  return {
    baptism: { ...config.baptism },
    confirmation: { ...config.confirmation },
    marriage: { ...config.marriage },
    death: { ...config.death },
  };
}

export async function getCertificateConfig(): Promise<CertificateConfigBySacrament> {
  await delay(200);
  return cloneConfig(CERTIFICATE_CONFIG);
}

export async function getCertificateAppearance(
  sacramentType: SacramentType
): Promise<CertificateAppearance> {
  await delay(150);
  return { ...CERTIFICATE_CONFIG[sacramentType] };
}

export async function updateCertificateConfig(
  input: CertificateConfigBySacrament
): Promise<CertificateConfigBySacrament> {
  await delay(300);
  setCertificateConfig(input);
  return cloneConfig(CERTIFICATE_CONFIG);
}
