import { apiFetch, ApiError } from "@/lib/api";
import type { ReportDateRange } from "@/features/parish-admin/reports/reportsHelpers";

/* Report totals from the server, for the signed-in office's parish. Months are "YYYY-MM". */

export interface SacramentYearRow {
  year: number;
  baptism: number;
  confirmation: number;
  marriage: number;
  death: number;
}

export interface CertificateMonthRow {
  month: string;
  pending: number;
  processing: number;
  released: number;
  rejected: number;
  baptism: number;
  confirmation: number;
  marriage: number;
  death: number;
  online: number;
  walkin: number;
  /** Copies issued that month; reprints are counted apart and aren't new copies. */
  issued: number;
  reprinted: number;
  /** Printed copies voided because they came out wrong. Their numbers stay used. */
  spoiled: number;
}

export interface DonationMonthRow {
  month: string;
  amount: number;
  cash: number;
  gcash: number;
}

export interface DonationPurposeTotal {
  purpose: string;
  amount: number;
  /** A listed fund the parish passes on in full (D3). */
  mustRemit: boolean;
}

export interface IntentionMonthRow {
  month: string;
  pending: number;
  confirmed: number;
  said: number;
  offering: number;
}

async function getReport<T>(name: string, range: ReportDateRange): Promise<T> {
  const query = new URLSearchParams();
  if (range.from) query.set("from", range.from);
  if (range.to) query.set("to", range.to);
  const search = query.toString();
  try {
    return await apiFetch<T>(`/reports/${name}${search ? `?${search}` : ""}`);
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.message, { cause: err });
    throw new Error("Unable to reach the server.", { cause: err });
  }
}

export async function getSacramentYearly(range: ReportDateRange): Promise<SacramentYearRow[]> {
  return (await getReport<{ rows: SacramentYearRow[] }>("sacraments", range)).rows;
}

export async function getCertificateMonthly(range: ReportDateRange): Promise<CertificateMonthRow[]> {
  return (await getReport<{ rows: CertificateMonthRow[] }>("certificates", range)).rows;
}

export async function getDonationMonthly(
  range: ReportDateRange
): Promise<{ rows: DonationMonthRow[]; purposes: DonationPurposeTotal[]; waiting: { count: number; amount: number } }> {
  return getReport("donations", range);
}

export type IssuedCopyStatus = "valid" | "waiting" | "replaced" | "revoked" | "spoiled";

/** One issued certificate copy, for the register in the Certificates report (A7). */
export interface IssuedCopy {
  id: string;
  code: string;
  sacramentType: string;
  holderName: string | null;
  /** Relative to the admin root, e.g. "records/baptismal/<id>". */
  recordPath: string;
  issuedAt: string;
  issuedBy: string;
  channel: "walkin" | "pickup" | "digital" | null;
  purpose: string | null;
  receiptNumber: string | null;
  status: IssuedCopyStatus;
  voidReason: string | null;
  /** First print plus reprints; null for a digital copy, which the office never prints. */
  timesPrinted: number | null;
}

/** Every copy issued in the range, newest first. A very long range stops at `limit` rows. */
export async function getIssuedCopies(
  range: ReportDateRange
): Promise<{ copies: IssuedCopy[]; truncated: boolean; limit: number }> {
  return getReport("certificates/copies", range);
}

export async function getIntentionMonthly(range: ReportDateRange): Promise<IntentionMonthRow[]> {
  return (await getReport<{ rows: IntentionMonthRow[] }>("intentions", range)).rows;
}
