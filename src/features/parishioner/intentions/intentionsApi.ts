import { MOCK_MASS_INTENTIONS } from "@/services/mocks/massIntentions.mock";
import type { MassIntentionRequest } from "@/types";

export interface SubmitIntentionInput {
  parishId: string;
  requesterId: string;
  intentionType: string;
  intentionFor: string;
  requestedBy: string;
  scheduleDate: string;
  scheduleTime: string;  // the exact label the parishioner picked, snapshotted as-is
  scheduleLabel: string;
}

export async function submitMassIntention(input: SubmitIntentionInput): Promise<MassIntentionRequest> {
  await new Promise((r) => setTimeout(r, 500));

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