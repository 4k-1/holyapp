import { apiFetch, ApiError } from "@/lib/api";
import type { ParishProfile } from "../types";

function fail(err: unknown): never {
  if (err instanceof ApiError) throw new Error(err.message);
  throw new Error("Unable to reach the server.");
}

export async function getParishProfile(): Promise<ParishProfile> {
  try {
    const data = await apiFetch<{ profile: ParishProfile }>("/parish/settings/profile");
    return data.profile;
  } catch (err) {
    fail(err);
  }
}

export async function updateParishProfile(input: ParishProfile): Promise<ParishProfile> {
  try {
    const data = await apiFetch<{ profile: ParishProfile }>("/parish/settings/profile", {
      method: "PATCH",
      body: input,
    });
    return data.profile;
  } catch (err) {
    fail(err);
  }
}
