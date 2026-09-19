import { delay } from "@/services/delay";
import { recordBelongsToParish } from "@/features/parish/parishApi";
import { DONATIONS_LIST, DONATION_TREND } from "@/services/mocks/donations.mock";
import type { Donation, DonationTrendPoint, NewDonationInput } from "../types";

export async function listDonations(parishId: string): Promise<Donation[]> {
  await delay();
  const out: Donation[] = [];
  for (const d of DONATIONS_LIST) {
    if (await recordBelongsToParish(d.parishId, parishId)) out.push(d);
  }
  return out;
}

export async function getDonationTrend(parishId: string): Promise<DonationTrendPoint[]> {
  await delay(80);
  let hasParishData = false;
  for (const d of DONATIONS_LIST) {
    if (await recordBelongsToParish(d.parishId, parishId)) {
      hasParishData = true;
      break;
    }
  }
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
