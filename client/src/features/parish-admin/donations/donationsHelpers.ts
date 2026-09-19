import type { Donation } from "@/features/parish-admin/donations/types";

const STAFF_NAMES: Record<string, string> = {
  "u-admin": "Admin Immaculada",
  "u-super": "Super Admin",
};

export function recordedByLabel(userId: string) {
  return STAFF_NAMES[userId] ?? userId;
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
