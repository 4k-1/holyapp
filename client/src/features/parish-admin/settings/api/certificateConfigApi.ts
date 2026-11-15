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

/** Form 97 (marriage) has no parish signatory, so a signature only prints on these. */
export const SIGNED_CERTIFICATES: SacramentType[] = ["baptism", "confirmation", "death"];

export const SIGNATURE_MAX_BYTES = 8 * 1024 * 1024;
export const SIGNATURE_TYPES = ["image/png", "image/jpeg", "image/webp"];

/** Saves a photo of the signature for these certificates. HolyApp makes the paper see-through. */
export async function uploadCertificateSignature(
  types: SacramentType[],
  file: File
): Promise<CertificateConfigBySacrament> {
  try {
    const data = await apiFetch<{ certificates: CertificateConfigBySacrament }>(
      `/parish/settings/certificates/signature?types=${types.join(",")}`,
      { method: "PUT", rawBody: file, headers: { "Content-Type": file.type || "image/jpeg" } }
    );
    return cloneConfig(data.certificates);
  } catch (err) {
    if (err instanceof ApiError && err.status === 413) {
      throw new Error("That image is over 8 MB. Choose a smaller one.", { cause: err });
    }
    fail(err);
  }
}

export async function removeCertificateSignature(types: SacramentType[]): Promise<CertificateConfigBySacrament> {
  try {
    const data = await apiFetch<{ certificates: CertificateConfigBySacrament }>(
      `/parish/settings/certificates/signature?types=${types.join(",")}`,
      { method: "DELETE" }
    );
    return cloneConfig(data.certificates);
  } catch (err) {
    fail(err);
  }
}
