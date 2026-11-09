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
): Promise<{ rows: DonationMonthRow[]; purposes: DonationPurposeTotal[] }> {
  return getReport("donations", range);
}

export async function getIntentionMonthly(range: ReportDateRange): Promise<IntentionMonthRow[]> {
  return (await getReport<{ rows: IntentionMonthRow[] }>("intentions", range)).rows;
}
