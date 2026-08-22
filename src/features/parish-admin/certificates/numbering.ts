import { CERTIFICATE_CONFIG } from "@/services/mocks/certificateConfig.mock";
import type { SacramentType } from "@/types";

export function peekNumberingPrefix(type: SacramentType): string {
  return CERTIFICATE_CONFIG[type].numberingPrefix;
}

export function formatCertificateCode(prefix: string, token: string, seq: string): string {
  return `CF-${prefix}-${token}-${seq}`;
}

export function normalizeNumberingPrefix(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
}

export function previewCertificateCode(prefix: string): string {
  const safe = prefix.trim() || "—";
  return `CF-${safe}-####-01`;
}
