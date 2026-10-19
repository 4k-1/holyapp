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
}

function fail(err: unknown): never {
  if (err instanceof ApiError) throw new Error(err.message);
  throw new Error("Unable to reach the server.");
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

export async function submitMassIntention(input: SubmitIntentionInput): Promise<MassIntentionRequest> {
  try {
    const data = await apiFetch<{ intention: MassIntentionRequest }>("/intentions", {
      method: "POST",
      body: {
        intentionType: input.intentionType,
        intentionFor: input.intentionFor,
        requestedBy: input.requestedBy,
        scheduleDate: input.scheduleDate,
        scheduleTime: input.scheduleTime,
        scheduleLabel: input.scheduleLabel,
      },
    });
    return data.intention;
  } catch (err) {
    fail(err);
  }
}
