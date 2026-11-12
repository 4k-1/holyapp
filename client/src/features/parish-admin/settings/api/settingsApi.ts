import { apiFetch, apiFileUrl, ApiError } from "@/lib/api";
import type { ParishProfile } from "../types";

function fail(err: unknown): never {
  if (err instanceof ApiError) throw new Error(err.message);
  throw new Error("Unable to reach the server.");
}

function withLogoAddress(profile: ParishProfile): ParishProfile {
  return { ...profile, sealUrl: apiFileUrl(profile.sealUrl) };
}

export const LOGO_MAX_BYTES = 5 * 1024 * 1024;
export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

/** Replaces the parish logo everywhere it shows. Returns the new logo's address. */
export async function uploadParishLogo(file: File): Promise<string> {
  try {
    const data = await apiFetch<{ sealUrl: string }>("/parish/settings/logo", {
      method: "PUT",
      rawBody: file,
      headers: { "Content-Type": file.type || "image/png" },
    });
    return apiFileUrl(data.sealUrl) ?? "";
  } catch (err) {
    if (err instanceof ApiError && err.status === 413) throw new Error("That image is over 5 MB. Choose a smaller one.", { cause: err });
    fail(err);
  }
}

export async function removeParishLogo(): Promise<void> {
  try {
    await apiFetch("/parish/settings/logo", { method: "DELETE" });
  } catch (err) {
    fail(err);
  }
}

export async function getParishProfile(): Promise<ParishProfile> {
  try {
    const data = await apiFetch<{ profile: ParishProfile }>("/parish/settings/profile");
    return withLogoAddress(data.profile);
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
    return withLogoAddress(data.profile);
  } catch (err) {
    fail(err);
  }
}
