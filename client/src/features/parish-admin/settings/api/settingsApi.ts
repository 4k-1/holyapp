import { apiFetch, apiFileUrl, ApiError } from "@/lib/api";
import type { ParishProfile } from "../types";

function fail(err: unknown): never {
  if (err instanceof ApiError) throw new Error(err.message);
  throw new Error("Unable to reach the server.");
}

function withLogoAddress(profile: ParishProfile): ParishProfile {
  return { ...profile, sealUrl: apiFileUrl(profile.sealUrl), photoUrl: apiFileUrl(profile.photoUrl) };
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

export const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Replaces the church photo on the parishioner dashboard. Returns the new photo's address. */
export async function uploadChurchPhoto(file: File): Promise<string> {
  try {
    const data = await apiFetch<{ photoUrl: string }>("/parish/settings/photo", {
      method: "PUT",
      rawBody: file,
      headers: { "Content-Type": file.type || "image/jpeg" },
    });
    return apiFileUrl(data.photoUrl) ?? "";
  } catch (err) {
    if (err instanceof ApiError && err.status === 413) throw new Error("That photo is over 10 MB. Choose a smaller one.", { cause: err });
    fail(err);
  }
}

export async function removeChurchPhoto(): Promise<void> {
  try {
    await apiFetch("/parish/settings/photo", { method: "DELETE" });
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
