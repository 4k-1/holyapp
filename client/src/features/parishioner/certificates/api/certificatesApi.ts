import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/features/auth/session";
import type { IssuedCertificate } from "@/types";

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export async function listCertificates(parishId: string): Promise<IssuedCertificate[]> {
  const data = await apiFetch<{ certificates: IssuedCertificate[] }>("/certificates/mine", { auth: true });
  return (data.certificates ?? []).filter((certificate) => certificate.parishId === parishId);
}

export async function downloadCertificate(certificate: IssuedCertificate): Promise<void> {
  if (!API_URL) throw new Error("VITE_API_URL is not configured.");
  const token = getAccessToken();
  const response = await fetch(`${API_URL}/certificates/${certificate.id}/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    let message = "Could not download this certificate.";
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* the PDF body is not JSON when the download succeeds */
    }
    throw new Error(message);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${certificate.certCode || "certificate"}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
