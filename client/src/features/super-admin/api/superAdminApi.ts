import { delay } from "@/services/delay";
import { apiFetch, ApiError } from "@/lib/api";
import {
  getDashboardSnapshot,
  getPlatformAuditLog,
  onboardParish,
  setParishCertTheme,
  updateParish,
  type CreateParishAccountInput,
  type UpdateParishAccountInput,
  type DashboardSnapshot,
  type OnboardParishInput,
  type PlatformAccount,
  type SuperAdminParishOverview,
  type PlatformAdmin,
  CERT_THEMES,
  getCertTheme,
} from "@/services/mocks/superAdmin.mock";
import type { AuditLogEntry, Parish, UserStatus } from "@/types";

export type {
  CreateParishAccountInput,
  DashboardSnapshot,
  OnboardParishInput,
  PlatformAccount,
  PlatformAdmin,
  SuperAdminParishOverview,
  UpdateParishAccountInput,
};
export { CERT_THEMES, getCertTheme };

function fail(err: unknown): never {
  if (err instanceof ApiError) throw new Error(err.message);
  throw new Error("Unable to reach the server.");
}

export async function getPlatformDashboard(): Promise<DashboardSnapshot> {
  await delay(200);
  return getDashboardSnapshot();
}

export async function listPlatformParishes(): Promise<SuperAdminParishOverview[]> {
  try {
    const data = await apiFetch<{ parishes: SuperAdminParishOverview[] }>("/platform/parishes");
    return data.parishes ?? [];
  } catch (err) {
    fail(err);
  }
}

export async function getPlatformParish(id: string): Promise<SuperAdminParishOverview | null> {
  try {
    const data = await apiFetch<{ parish: SuperAdminParishOverview }>(`/platform/parishes/${id}`);
    return data.parish ?? null;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    fail(err);
  }
}

export async function createPlatformParish(input: OnboardParishInput) {
  await delay(250);
  return onboardParish(input);
}

export async function updatePlatformParish(
  id: string,
  patch: Partial<Pick<Parish, "name" | "address" | "contact" | "email">>
) {
  await delay(200);
  return updateParish(id, patch);
}

export async function createPlatformAccount(input: CreateParishAccountInput) {
  try {
    return await apiFetch<{
      user: SuperAdminParishOverview["admins"][number];
      credentials: { email: string; password: string };
    }>("/platform/accounts", {
      method: "POST",
      body: input,
    });
  } catch (err) {
    fail(err);
  }
}

export async function removePlatformAccount(userId: string) {
  try {
    await apiFetch<{ ok: boolean }>(`/platform/accounts/${userId}`, { method: "DELETE" });
  } catch (err) {
    fail(err);
  }
}

export async function setPlatformAccountStatus(userId: string, status: UserStatus) {
  try {
    const data = await apiFetch<{ user: SuperAdminParishOverview["admins"][number] }>(
      `/platform/accounts/${userId}/status`,
      { method: "PATCH", body: { status } }
    );
    return data.user;
  } catch (err) {
    fail(err);
  }
}

export async function resetPlatformAccountPassword(userId: string) {
  try {
    return await apiFetch<{
      credentials: { email: string; password: string };
    }>(`/platform/accounts/${userId}/reset-password`, { method: "POST", body: {} });
  } catch (err) {
    fail(err);
  }
}

export async function updatePlatformAccount(userId: string, patch: UpdateParishAccountInput) {
  try {
    const data = await apiFetch<{ user: SuperAdminParishOverview["admins"][number] }>(
      `/platform/accounts/${userId}`,
      { method: "PATCH", body: patch }
    );
    return data.user;
  } catch (err) {
    fail(err);
  }
}

export async function setPlatformAccountCanEdit(userId: string, canEditRecords: boolean) {
  return updatePlatformAccount(userId, { canEditRecords });
}

export async function setPlatformParishCertTheme(parishId: string, themeId: string) {
  await delay(180);
  return setParishCertTheme(parishId, themeId);
}

export async function listPlatformAccounts(): Promise<PlatformAccount[]> {
  const parishes = await listPlatformParishes();
  const accounts: PlatformAccount[] = [];
  for (const row of parishes) {
    for (const user of [...row.admins, ...row.staff, ...row.parishioners]) {
      accounts.push({
        user,
        parish: row.parish,
        canEditRecords: user.role === "parish_admin",
      });
    }
  }
  return accounts;
}

export async function listPlatformAuditLog(): Promise<AuditLogEntry[]> {
  try {
    const data = await apiFetch<{ entries: AuditLogEntry[] }>("/audit");
    return data.entries ?? [];
  } catch {
    await delay(200);
    return getPlatformAuditLog();
  }
}
