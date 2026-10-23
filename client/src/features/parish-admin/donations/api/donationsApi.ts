import { apiFetch, ApiError } from "@/lib/api";
import type { Donation, NewDonationInput } from "../types";

function fail(err: unknown): never {
  if (err instanceof ApiError) throw new Error(err.message, { cause: err });
  throw new Error("Unable to reach the server.", { cause: err });
}

/** Office gifts, paid online gifts, and paid Mass intention donations for the signed-in parish. */
export async function listDonations(_parishId: string): Promise<Donation[]> {
  try {
    const data = await apiFetch<{ donations: Donation[] }>("/donations");
    return data.donations ?? [];
  } catch (err) {
    fail(err);
  }
}

export async function recordDonation(_parishId: string, input: NewDonationInput): Promise<void> {
  try {
    await apiFetch("/donations", { method: "POST", body: input });
  } catch (err) {
    fail(err);
  }
}
