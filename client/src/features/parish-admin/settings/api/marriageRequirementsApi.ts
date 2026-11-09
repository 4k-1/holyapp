import { apiFetch, ApiError } from "@/lib/api";

/** One item on the parish's marriage requirements list (item 5a). */
export interface MarriageRequirementSetting {
  id: string;
  /** Built-in items keep this when renamed; null for the parish's own items. */
  key: string | null;
  builtIn: boolean;
  name: string;
  required: boolean;
  /** Off: no longer asked for on open applications. */
  active: boolean;
  /** "always", or the couple's answer that adds it. */
  condition: string;
  /** The answer that removes it (the license, when the Art. 34 affidavit replaces it). */
  skipWhen: string | null;
  validForDays: number | null;
  note: string;
  sortOrder: number;
}

export interface MarriageRequirementInput {
  name?: string;
  required?: boolean;
  active?: boolean;
  condition?: string;
  validForDays?: number | null;
  note?: string;
}

function fail(err: unknown): never {
  if (err instanceof ApiError) throw new Error(err.message, { cause: err });
  throw new Error("Unable to reach the server.", { cause: err });
}

export async function listMarriageRequirements(): Promise<{
  requirements: MarriageRequirementSetting[];
  circumstances: { key: string; question: string }[];
}> {
  try {
    return await apiFetch("/marriage-requirements");
  } catch (err) {
    fail(err);
  }
}

export async function addMarriageRequirement(input: MarriageRequirementInput): Promise<MarriageRequirementSetting> {
  try {
    const data = await apiFetch<{ requirement: MarriageRequirementSetting }>("/marriage-requirements", {
      method: "POST",
      body: input,
    });
    return data.requirement;
  } catch (err) {
    fail(err);
  }
}

export async function updateMarriageRequirement(
  id: string,
  input: MarriageRequirementInput
): Promise<MarriageRequirementSetting> {
  try {
    const data = await apiFetch<{ requirement: MarriageRequirementSetting }>(
      `/marriage-requirements/${encodeURIComponent(id)}`,
      { method: "PATCH", body: input }
    );
    return data.requirement;
  } catch (err) {
    fail(err);
  }
}
