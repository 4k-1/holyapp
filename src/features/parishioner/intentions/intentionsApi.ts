import { MOCK_MASS_INTENTIONS } from "@/services/mocks/massIntentions.mock";
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

/** Only this file is allowed to import MOCK_MASS_INTENTIONS. */
export async function listMassIntentions(parishId: string): Promise<MassIntentionRequest[]> {
  await delay(200);
  return MOCK_MASS_INTENTIONS.filter((i) => i.parishId === parishId).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function submitMassIntention(input: SubmitIntentionInput): Promise<MassIntentionRequest> {
  await delay(500);

  const record: MassIntentionRequest = {
    id: `intention-${Date.now()}`,
    parishId: input.parishId,
    requesterId: input.requesterId,
    intentionType: input.intentionType,
    intentionFor: input.intentionFor,
    requestedBy: input.requestedBy,
    scheduleDate: input.scheduleDate,
    scheduleTime: input.scheduleTime,
    scheduleLabel: input.scheduleLabel,
    createdAt: new Date().toISOString(),
  };

  MOCK_MASS_INTENTIONS.push(record);
  return record;
}