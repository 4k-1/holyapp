import { MOCK_MASS_SCHEDULE } from "@/services/mocks/massSchedule.mock";
import { delay } from "@/services/delay";
import type { MassScheduleEntry } from "@/types";

/** Only this file is allowed to import MOCK_MASS_SCHEDULE. */
export async function listMassSchedule(): Promise<MassScheduleEntry[]> {
  await delay(150);
  return MOCK_MASS_SCHEDULE;
}
