import type { Donation, DonationTrendPoint } from "@/features/parish-admin/donations/types";

/** Totals for each of the last `months` months, oldest first, for the trend line. */
export function monthlyTrend(donations: Donation[], months = 6): DonationTrendPoint[] {
  const now = new Date();
  const points: DonationTrendPoint[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;
    const value = donations.filter((d) => d.donationDate.startsWith(key)).reduce((sum, d) => sum + d.amount, 0);
    points.push({ label: month.toLocaleDateString("en-US", { month: "short" }), value });
  }
  return points;
}

export function formatDonationDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatAmount(amount: number) {
  return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export interface DonationDateFilter {
  from: string;
  to: string;
}

export const emptyDonationDateFilter = (): DonationDateFilter => ({ from: "", to: "" });

export function filterDonationsByDate(donations: Donation[], filter: DonationDateFilter) {
  const { from, to } = filter;
  if (!from && !to) return donations;
  return donations.filter((d) => {
    if (from && d.donationDate < from) return false;
    if (to && d.donationDate > to) return false;
    return true;
  });
}

export function donationDateFilterLabel(filter: DonationDateFilter) {
  if (!filter.from && !filter.to) return null;
  if (filter.from && filter.to) {
    return `${formatDonationDate(filter.from)} – ${formatDonationDate(filter.to)}`;
  }
  if (filter.from) return `From ${formatDonationDate(filter.from)}`;
  return `Through ${formatDonationDate(filter.to)}`;
}
