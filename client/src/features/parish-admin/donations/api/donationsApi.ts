import { delay } from "@/services/delay";
import { DONATIONS_LIST, DONATION_TREND } from "@/services/mocks/donations.mock";
import type { Donation, DonationTrendPoint, NewDonationInput } from "../types";

export async function listDonations(parishId: string): Promise<Donation[]> {
  await delay();
  return DONATIONS_LIST.filter((d) => d.parishId === parishId);
}

export async function getDonationTrend(parishId: string): Promise<DonationTrendPoint[]> {
  await delay(80);
  const hasParishData = DONATIONS_LIST.some((d) => d.parishId === parishId);
  if (!hasParishData) return [];
  return [...DONATION_TREND];
}

export async function recordDonation(
  parishId: string,
  input: NewDonationInput,
  recordedBy = "u-admin"
): Promise<Donation> {
  await delay();
  const donation: Donation = {
    id: `don-${Date.now()}`,
    parishId,
    donorName: input.donorName,
    donationType: input.donationType,
    amount: input.amount,
    donationDate: input.donationDate,
    purpose: input.purpose,
    remarks: input.remarks,
    recordedBy,
    createdAt: new Date().toISOString(),
  };
  DONATIONS_LIST.unshift(donation);
  return donation;
}
