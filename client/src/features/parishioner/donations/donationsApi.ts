import { apiFetch, ApiError } from "@/lib/api";

export interface MyDonation {
  id: string;
  amount: number;
  purpose?: string;
  donorName?: string;
  donationDate: string;
  status: "paid" | "pending";
  receiptUrl?: string;
}

export interface GiveInput {
  amount: number;
  purpose: string;
  /** Leave out to give anonymously; the office then sees no name. */
  donorName?: string;
  message?: string;
}

function fail(err: unknown): never {
  if (err instanceof ApiError) throw new Error(err.message, { cause: err });
  throw new Error("Unable to reach the server.", { cause: err });
}

export async function listMyDonations(): Promise<{ donations: MyDonation[]; gcashDonations: boolean }> {
  try {
    const data = await apiFetch<{ donations: MyDonation[]; gcashDonations: boolean }>("/donations/mine");
    return { donations: data.donations ?? [], gcashDonations: Boolean(data.gcashDonations) };
  } catch (err) {
    fail(err);
  }
}

/** Saves the gift as pending and returns the GCash page to finish it on. */
export async function giveDonation(input: GiveInput): Promise<{ checkoutUrl: string }> {
  try {
    return await apiFetch<{ checkoutUrl: string }>("/donations/give", { method: "POST", body: input });
  } catch (err) {
    fail(err);
  }
}

export async function syncMyDonation(id: string): Promise<{ paid: boolean; donation?: MyDonation }> {
  try {
    return await apiFetch<{ paid: boolean; donation?: MyDonation }>(`/donations/${encodeURIComponent(id)}/sync`, {
      method: "POST",
    });
  } catch (err) {
    fail(err);
  }
}
