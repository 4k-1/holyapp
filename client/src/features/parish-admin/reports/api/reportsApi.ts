import { delay } from "@/services/delay";
import {
  CERTIFICATE_MONTHLY,
  DONATION_MONTHLY,
  INTENTION_MONTHLY,
  SACRAMENT_YEARLY,
  type CertificateMonthRow,
  type DonationMonthRow,
  type IntentionMonthRow,
  type SacramentYearRow,
} from "@/services/mocks/reports.mock";
import {
  monthInRange,
  yearInRange,
  type ReportDateRange,
} from "@/features/parish-admin/reports/reportsHelpers";

export async function getSacramentYearly(
  _parishId: string,
  range: ReportDateRange
): Promise<SacramentYearRow[]> {
  await delay(180);
  return SACRAMENT_YEARLY.filter((row) => yearInRange(row.year, range));
}

export async function getCertificateMonthly(
  _parishId: string,
  range: ReportDateRange
): Promise<CertificateMonthRow[]> {
  await delay(180);
  return CERTIFICATE_MONTHLY.filter((row) => monthInRange(row.month, range));
}

export async function getDonationMonthly(
  _parishId: string,
  range: ReportDateRange
): Promise<DonationMonthRow[]> {
  await delay(180);
  return DONATION_MONTHLY.filter((row) => monthInRange(row.month, range));
}

export async function getIntentionMonthly(
  _parishId: string,
  range: ReportDateRange
): Promise<IntentionMonthRow[]> {
  await delay(180);
  return INTENTION_MONTHLY.filter((row) => monthInRange(row.month, range));
}
