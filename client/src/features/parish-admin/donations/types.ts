export const DONATION_TYPES = ["Cash", "GCash", "Check", "Bank Transfer"] as const;
export type DonationType = (typeof DONATION_TYPES)[number];

export interface Donation {
  id: string;
  parishId: string;
  donorName?: string;
  donationType: string;
  amount: number;
  donationDate: string;
  purpose?: string;
  remarks?: string;
  /** Staff member's name, or "Online (GCash)" for gifts made in the portal. */
  recordedBy: string;
  source: "office" | "online" | "mass_intention";
  createdAt: string | null;
  /** Running receipt number, e.g. DON-2026-000231. Online gifts get one when paid. */
  receiptNo?: string;
  /** Set when the gift was voided. A voided gift stays listed but counts toward no totals. */
  voided?: { at: string; by: string; reason: string };
  /** The gift this one corrects (that gift is voided). */
  replacesId?: string;
}

export interface DonationTrendPoint {
  label: string;
  value: number;
}

export interface NewDonationInput {
  donorName?: string;
  donationType: string;
  amount: number;
  donationDate: string;
  purpose?: string;
  remarks?: string;
}

export function donationTypeBadgeTone(type: string): "green" | "gold" | "muted" {
  if (type === "GCash" || type === "Bank Transfer") return "green";
  if (type === "Cash" || type === "Check") return "gold";
  return "muted";
}
