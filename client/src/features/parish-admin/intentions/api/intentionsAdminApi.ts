import { delay } from "@/services/delay";
import { mockParishIdsFor, recordBelongsToParish } from "@/features/parish/parishApi";
import { MOCK_MASS_INTENTIONS, MOCK_PARISH_MASS_CAPACITY } from "@/services/mocks/massIntentions.mock";
import { listMassSchedule } from "@/features/parishioner/intentions/api/massScheduleApi";
import { buildMassSlotViews } from "@/features/parish-admin/intentions/intentionsHelpers";
import { type MassIntentionRequest, type MassSlotView } from "@/types";

/** Highest number of intentions already booked onto any single Mass, across all parishes/dates in mock data. */
function maxBookedAcrossAllSlots() {
  const counts = new Map<string, number>();
  for (const intention of MOCK_MASS_INTENTIONS) {
    const key = `${intention.scheduleDate}__${intention.scheduleTime}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Math.max(0, ...counts.values());
}

export interface BookSlotIntentionInput {
  requesterName: string;
  intentionType: string;
  intentionText: string;
  contact: string;
  offering: number;
}

/**
 * Scheduled Mass slots in a date range, with remaining Canon 948 / parish capacity.
 * TODO: GET /parishes/:parishId/mass-slots?from=&to=
 */
export async function listAdminMassSlots(
  parishId: string,
  range: { from: string; to: string; location: string }
): Promise<MassSlotView[]> {
  const schedule = await listMassSchedule();
  await delay(80);
  return buildMassSlotViews({
    parishId,
    parishIdAliases: await mockParishIdsFor(parishId),
    from: range.from,
    to: range.to,
    location: range.location,
    schedule,
    intentions: MOCK_MASS_INTENTIONS,
    maxIntentions: MOCK_PARISH_MASS_CAPACITY.value,
  });
}

/**
 * Office records an online request onto a selected slot. Hard-fails at capacity.
 * TODO: POST /parishes/:parishId/mass-slots/:slotId/intention-requests
 */
export async function bookSlotIntention(
  parishId: string,
  slot: Pick<MassSlotView, "id" | "date" | "time" | "scheduleLabel" | "maxIntentions">,
  input: BookSlotIntentionInput
): Promise<MassIntentionRequest> {
  await delay(350);
  const booked = [];
  for (const intention of MOCK_MASS_INTENTIONS) {
    if (
      intention.scheduleDate === slot.date &&
      intention.scheduleTime === slot.time &&
      (await recordBelongsToParish(intention.parishId, parishId))
    ) {
      booked.push(intention);
    }
  }
  if (booked.length >= slot.maxIntentions) {
    throw new Error("This Mass is at full capacity.");
  }

  const record: MassIntentionRequest = {
    id: `MI-${String(MOCK_MASS_INTENTIONS.length + 1).padStart(2, "0")}`,
    parishId,
    requesterId: "online",
    intentionType: input.intentionType,
    intentionFor: input.intentionText,
    requestedBy: input.requesterName,
    contact: input.contact.trim() || undefined,
    status: "confirmed",
    offering: input.offering,
    payment: "paid",
    scheduleDate: slot.date,
    scheduleTime: slot.time,
    scheduleLabel: slot.scheduleLabel,
    createdAt: new Date().toISOString(),
  };
  MOCK_MASS_INTENTIONS.push(record);
  return record;
}

/**
 * TODO: PATCH /parishes/:parishId/mass-intentions/:id { status: "said" }
 */
export async function markIntentionSaid(intentionId: string): Promise<MassIntentionRequest> {
  await delay(200);
  const intention = MOCK_MASS_INTENTIONS.find((row) => row.id === intentionId);
  if (!intention) throw new Error("Intention not found.");
  intention.status = "said";
  return intention;
}

/**
 * All Mass intentions recorded for a parish, newest Mass date first.
 * TODO: GET /parishes/:parishId/mass-intentions
 */
export async function listAdminIntentions(parishId: string): Promise<MassIntentionRequest[]> {
  await delay(180);
  const out: MassIntentionRequest[] = [];
  for (const intention of MOCK_MASS_INTENTIONS) {
    if (await recordBelongsToParish(intention.parishId, parishId)) out.push(intention);
  }
  return out.sort((a, b) => (a.scheduleDate < b.scheduleDate ? 1 : -1));
}

/** Parish-wide intention slots per Mass. Same cap applies to every Mass. */
export async function getMassIntentionCapacity(): Promise<number> {
  await delay(80);
  return MOCK_PARISH_MASS_CAPACITY.value;
}

/**
 * Updates the parish-wide cap. Cannot go below the fullest Mass already booked.
 * TODO: PATCH /parishes/:parishId/settings { massIntentionCapacity }
 */
export async function updateMassIntentionCapacity(maxIntentions: number): Promise<number> {
  await delay(200);
  const cap = Math.max(1, Math.floor(maxIntentions));
  const bookedMax = maxBookedAcrossAllSlots();
  if (cap < bookedMax) {
    throw new Error(`Capacity can't go below ${bookedMax} — the fullest Mass already has that many intentions.`);
  }
  MOCK_PARISH_MASS_CAPACITY.value = cap;
  return cap;
}
