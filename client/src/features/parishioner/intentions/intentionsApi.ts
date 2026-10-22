import { apiFetch, ApiError } from "@/lib/api";
import type { MassIntentionRequest } from "@/types";

export interface SubmitIntentionInput {
  parishId: string;
  requesterId: string | null;
  intentionType: string;
  intentionFor: string;
  requestedBy: string;
  scheduleDate: string;
  scheduleTime: string;
  scheduleLabel: string;
  /** Optional GCash donation in pesos; 0 or missing means none. */
  donation?: number;
}

/** A Mass that still has room for another intention. */
export interface OpenMassSlot {
  id: string;
  date: string;
  time: string;
  scheduleLabel: string;
  remaining: number;
  maxIntentions: number;
}

function fail(err: unknown): never {
  if (err instanceof ApiError) throw new Error(err.message, { cause: err });
  throw new Error("Unable to reach the server.", { cause: err });
}

export async function listMassIntentions(
  _parishId: string,
  _requesterId: string
): Promise<MassIntentionRequest[]> {
  try {
    const data = await apiFetch<{ intentions: MassIntentionRequest[] }>("/intentions/mine");
    return data.intentions ?? [];
  } catch (err) {
    fail(err);
  }
}

export async function listOpenMassSlots(): Promise<{ slots: OpenMassSlot[]; gcashDonations: boolean }> {
  try {
    const data = await apiFetch<{ slots: OpenMassSlot[]; gcashDonations: boolean }>("/intentions/open-slots");
    return { slots: data.slots ?? [], gcashDonations: Boolean(data.gcashDonations) };
  } catch (err) {
    fail(err);
  }
}

export async function submitMassIntention(
  input: SubmitIntentionInput
): Promise<{ intention: MassIntentionRequest; checkoutUrl: string | null }> {
  try {
    const data = await apiFetch<{ intention: MassIntentionRequest; checkoutUrl?: string | null }>("/intentions", {
      method: "POST",
      body: {
        intentionType: input.intentionType,
        intentionFor: input.intentionFor,
        requestedBy: input.requestedBy,
        scheduleDate: input.scheduleDate,
        scheduleTime: input.scheduleTime,
        scheduleLabel: input.scheduleLabel,
        donation: input.donation ?? 0,
      },
    });
    return { intention: data.intention, checkoutUrl: data.checkoutUrl ?? null };
  } catch (err) {
    fail(err);
  }
}

/** After returning from GCash, ask the server to confirm the donation with PayMongo. */
export async function syncIntentionDonation(intentionId: string): Promise<{ paid: boolean }> {
  try {
    const data = await apiFetch<{ paid: boolean }>(`/intentions/${encodeURIComponent(intentionId)}/donation/sync`, {
      method: "POST",
      body: {},
    });
    return { paid: Boolean(data.paid) };
  } catch (err) {
    fail(err);
  }
}
