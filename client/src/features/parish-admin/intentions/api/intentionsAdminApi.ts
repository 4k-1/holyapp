import { apiFetch, ApiError } from "@/lib/api";
import type { MassIntentionRequest, MassSlotView } from "@/types";

function fail(err: unknown): never {
  if (err instanceof ApiError) throw new Error(err.message);
  throw new Error("Unable to reach the server.");
}

export interface BookSlotIntentionInput {
  requesterName: string;
  intentionType: string;
  intentionText: string;
  contact: string;
  offering: number;
}

export async function listAdminMassSlots(
  _parishId: string,
  range: { from: string; to: string; location: string }
): Promise<MassSlotView[]> {
  try {
    const params = new URLSearchParams({
      from: range.from,
      to: range.to,
      location: range.location,
    });
    const data = await apiFetch<{ slots: MassSlotView[] }>(`/intentions/slots?${params.toString()}`);
    return data.slots ?? [];
  } catch (err) {
    fail(err);
  }
}

export async function bookSlotIntention(
  _parishId: string,
  slot: Pick<MassSlotView, "id" | "date" | "time" | "scheduleLabel" | "maxIntentions">,
  input: BookSlotIntentionInput
): Promise<MassIntentionRequest> {
  try {
    const data = await apiFetch<{ intention: MassIntentionRequest }>("/intentions/book", {
      method: "POST",
      body: {
        date: slot.date,
        time: slot.time,
        scheduleLabel: slot.scheduleLabel,
        requesterName: input.requesterName,
        intentionType: input.intentionType,
        intentionText: input.intentionText,
        contact: input.contact,
        offering: input.offering,
      },
    });
    return data.intention;
  } catch (err) {
    fail(err);
  }
}

export async function confirmIntention(intentionId: string): Promise<MassIntentionRequest> {
  try {
    const data = await apiFetch<{ intention: MassIntentionRequest }>(
      `/intentions/${encodeURIComponent(intentionId)}/confirm`,
      { method: "PATCH" }
    );
    return data.intention;
  } catch (err) {
    fail(err);
  }
}

export async function markIntentionSaid(intentionId: string): Promise<MassIntentionRequest> {
  try {
    const data = await apiFetch<{ intention: MassIntentionRequest }>(
      `/intentions/${encodeURIComponent(intentionId)}/said`,
      { method: "PATCH" }
    );
    return data.intention;
  } catch (err) {
    fail(err);
  }
}

export async function listAdminIntentions(_parishId: string): Promise<MassIntentionRequest[]> {
  try {
    const data = await apiFetch<{ intentions: MassIntentionRequest[] }>("/intentions");
    return data.intentions ?? [];
  } catch (err) {
    fail(err);
  }
}

export async function getMassIntentionCapacity(): Promise<number> {
  try {
    const data = await apiFetch<{ capacity: number }>("/intentions/capacity");
    return data.capacity ?? 5;
  } catch (err) {
    fail(err);
  }
}

export async function updateMassIntentionCapacity(maxIntentions: number): Promise<number> {
  try {
    const data = await apiFetch<{ capacity: number }>("/intentions/capacity", {
      method: "PATCH",
      body: { capacity: maxIntentions },
    });
    return data.capacity;
  } catch (err) {
    fail(err);
  }
}
