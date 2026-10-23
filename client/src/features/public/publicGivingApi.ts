import { apiFetch, ApiError } from "@/lib/api";
import type { GiveInput } from "@/features/parishioner/donations/donationsApi";
import type { OpenMassSlot, SubmitIntentionInput } from "@/features/parishioner/intentions/intentionsApi";

/** Giving and Mass intentions for visitors without an account. Calls go out unsigned, keyed by parish slug. */

function fail(err: unknown): never {
  if (err instanceof ApiError) throw new Error(err.message, { cause: err });
  throw new Error("Unable to reach the server.", { cause: err });
}

function base(slug: string) {
  return `/public/${encodeURIComponent(slug)}`;
}

export async function guestGivingOptions(slug: string): Promise<{ gcashDonations: boolean }> {
  try {
    return await apiFetch<{ gcashDonations: boolean }>(`${base(slug)}/donations/options`, { auth: false });
  } catch (err) {
    fail(err);
  }
}

export async function guestGive(slug: string, input: GiveInput): Promise<{ checkoutUrl: string }> {
  try {
    return await apiFetch<{ checkoutUrl: string }>(`${base(slug)}/donations/give`, {
      method: "POST",
      body: input,
      auth: false,
    });
  } catch (err) {
    fail(err);
  }
}

export async function guestSyncDonation(slug: string, id: string): Promise<{ paid: boolean; donation?: { amount: number } }> {
  try {
    return await apiFetch(`${base(slug)}/donations/${encodeURIComponent(id)}/sync`, { method: "POST", auth: false });
  } catch (err) {
    fail(err);
  }
}

export async function guestOpenMassSlots(slug: string): Promise<{ slots: OpenMassSlot[]; gcashDonations: boolean }> {
  try {
    const data = await apiFetch<{ slots: OpenMassSlot[]; gcashDonations: boolean }>(
      `${base(slug)}/intentions/open-slots`,
      { auth: false }
    );
    return { slots: data.slots ?? [], gcashDonations: Boolean(data.gcashDonations) };
  } catch (err) {
    fail(err);
  }
}

export async function guestSubmitIntention(
  slug: string,
  input: SubmitIntentionInput
): Promise<{ checkoutUrl: string | null }> {
  try {
    const data = await apiFetch<{ checkoutUrl?: string | null }>(`${base(slug)}/intentions`, {
      method: "POST",
      auth: false,
      body: {
        intentionType: input.intentionType,
        intentionFor: input.intentionFor,
        requestedBy: input.requestedBy,
        contact: input.contact,
        scheduleDate: input.scheduleDate,
        scheduleTime: input.scheduleTime,
        scheduleLabel: input.scheduleLabel,
        donation: input.donation ?? 0,
      },
    });
    return { checkoutUrl: data.checkoutUrl ?? null };
  } catch (err) {
    fail(err);
  }
}

export async function guestSyncIntentionDonation(slug: string, intentionId: string): Promise<{ paid: boolean }> {
  try {
    const data = await apiFetch<{ paid: boolean }>(
      `${base(slug)}/intentions/${encodeURIComponent(intentionId)}/donation/sync`,
      { method: "POST", auth: false, body: {} }
    );
    return { paid: Boolean(data.paid) };
  } catch (err) {
    fail(err);
  }
}
