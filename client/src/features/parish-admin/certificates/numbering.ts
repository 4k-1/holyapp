import { CERTIFICATE_CONFIG } from "@/services/mocks/certificateConfig.mock";
import type { SacramentType } from "@/types";

export function peekNumberingPrefix(type: SacramentType): string {
  return CERTIFICATE_CONFIG[type].numberingPrefix;
}

/** Certificate numbers look like BAP-2026-000143: prefix, year, running number for the year. */
export function formatCertificateCode(prefix: string, year: number | string, seq: number): string {
  return `${prefix}-${year}-${String(seq).padStart(6, "0")}`;
}

export function normalizeNumberingPrefix(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
}

export function previewCertificateCode(prefix: string): string {
  const safe = prefix.trim() || "—";
  return `${safe}-${new Date().getFullYear()}-000143`;
}
