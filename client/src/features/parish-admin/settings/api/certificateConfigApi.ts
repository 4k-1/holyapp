import { apiFetch, ApiError } from "@/lib/api";
import type { CertificateAppearance, CertificateConfigBySacrament } from "../types";
import type { SacramentType } from "@/types";

function fail(err: unknown): never {
  if (err instanceof ApiError) throw new Error(err.message);
  throw new Error("Unable to reach the server.");
}

function cloneConfig(config: CertificateConfigBySacrament): CertificateConfigBySacrament {
  return {
    baptism: { ...config.baptism },
    confirmation: { ...config.confirmation },
    marriage: { ...config.marriage },
    death: { ...config.death },
  };
}

export async function getCertificateConfig(): Promise<CertificateConfigBySacrament> {
  try {
    const data = await apiFetch<{ certificates: CertificateConfigBySacrament }>("/parish/settings/certificates");
    return cloneConfig(data.certificates);
  } catch (err) {
    fail(err);
  }
}

export async function getCertificateAppearance(sacramentType: SacramentType): Promise<CertificateAppearance> {
  const config = await getCertificateConfig();
  return { ...config[sacramentType] };
}

export async function updateCertificateConfig(
  input: CertificateConfigBySacrament
): Promise<CertificateConfigBySacrament> {
  try {
    const data = await apiFetch<{ certificates: CertificateConfigBySacrament }>("/parish/settings/certificates", {
      method: "PUT",
      body: { certificates: input },
    });
    return cloneConfig(data.certificates);
  } catch (err) {
    fail(err);
  }
}
