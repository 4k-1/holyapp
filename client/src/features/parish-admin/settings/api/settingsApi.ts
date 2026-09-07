// src/features/parish-admin/settings/api/settingsApi.ts
import { delay } from "@/services/delay";
import { PARISH_PROFILE, setParishProfile } from "@/services/mocks/parishProfile.mock";
import type { ParishProfile } from "../types";

// NOTE: not scoped by parishId yet since the mock is single-tenant —
// thread parishId through here once parish profile is per-parish.

export async function getParishProfile(): Promise<ParishProfile> {
  await delay();
  return { ...PARISH_PROFILE };
}

export async function updateParishProfile(input: ParishProfile): Promise<ParishProfile> {
  await delay();
  setParishProfile({ ...input });
  return { ...input };
}