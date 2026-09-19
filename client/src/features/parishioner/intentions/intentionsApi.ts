import { MOCK_MASS_INTENTIONS } from "@/services/mocks/massIntentions.mock";
import { recordBelongsToParish } from "@/features/parish/parishApi";
import { delay } from "@/services/delay";
import type { MassIntentionRequest } from "@/types";

export interface SubmitIntentionInput {
  parishId: string;
  requesterId: string | null;
  intentionType: string;
  intentionFor: string;
  requestedBy: string;
  scheduleDate: string;
  scheduleTime: string;  // the exact label the parishioner picked, snapshotted as-is
  scheduleLabel: string;
}

/** Parishioner portal: this requester's intentions only. Admin uses listAdminMassSlots. */
export async function listMassIntentions(parishId: string, requesterId: string): Promise<MassIntentionRequest[]> {
  await delay(200);
  const out: MassIntentionRequest[] = [];
  for (const i of MOCK_MASS_INTENTIONS) {
    if (i.requesterId === requesterId && (await recordBelongsToParish(i.parishId, parishId))) {
      out.push(i);
    }
  }
  return out.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Parishioner / public submit a request — not a confirmed booking.
 * TODO: POST /parishes/:parishId/mass-intention-requests (status=pending).
 * Office confirms onto a slot; do not decrement remaining capacity until confirmed
 * if the real API treats pending as a waitlist. Mock occupies the slot so we cannot overbook.
 * TODO: reject when the preferred slot is already at MASS_INTENTION_MAX_PER_SLOT.
 */
export async function submitMassIntention(input: SubmitIntentionInput): Promise<MassIntentionRequest> {
  await delay(500);

  const record: MassIntentionRequest = {
    id: `intention-${Date.now()}`,
    parishId: input.parishId,
    requesterId: input.requesterId,
    intentionType: input.intentionType,
    intentionFor: input.intentionFor,
    requestedBy: input.requestedBy,
    status: "pending",
    offering: 100,
    payment: "unpaid",
    scheduleDate: input.scheduleDate,
    scheduleTime: input.scheduleTime,
    scheduleLabel: input.scheduleLabel,
    createdAt: new Date().toISOString(),
  };

  MOCK_MASS_INTENTIONS.push(record);
  return record;
}