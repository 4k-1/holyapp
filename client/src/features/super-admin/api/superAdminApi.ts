import { delay } from "@/services/delay";
import {
  createParishAccount,
  getDashboardSnapshot,
  getParishOverview,
  getPlatformAccounts,
  getPlatformAuditLog,
  getSuperAdminParishOverviews,
  onboardParish,
  removeParishAccount,
  resetAccountPassword,
  setAccountCanEdit,
  setAccountStatus,
  setParishCertTheme,
  updateParish,
  updateParishAccount,
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

export async function getPlatformDashboard(): Promise<DashboardSnapshot> {
  await delay(200);
  return getDashboardSnapshot();
}

export async function listPlatformParishes(): Promise<SuperAdminParishOverview[]> {
  await delay(200);
  return getSuperAdminParishOverviews();
}

export async function getPlatformParish(id: string): Promise<SuperAdminParishOverview | null> {
  await delay(150);
  return getParishOverview(id);
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
  await delay(250);
  return createParishAccount(input);
}

export async function removePlatformAccount(userId: string) {
  await delay(180);
  return removeParishAccount(userId);
}

export async function setPlatformAccountStatus(userId: string, status: UserStatus) {
  await delay(180);
  return setAccountStatus(userId, status);
}

export async function resetPlatformAccountPassword(userId: string) {
  await delay(180);
  return resetAccountPassword(userId);
}

export async function updatePlatformAccount(userId: string, patch: UpdateParishAccountInput) {
  await delay(200);
  return updateParishAccount(userId, patch);
}

export async function setPlatformAccountCanEdit(userId: string, canEditRecords: boolean) {
  await delay(120);
  return setAccountCanEdit(userId, canEditRecords);
}

export async function setPlatformParishCertTheme(parishId: string, themeId: string) {
  await delay(180);
  return setParishCertTheme(parishId, themeId);
}

export async function listPlatformAccounts(): Promise<PlatformAccount[]> {
  await delay(200);
  return getPlatformAccounts();
}

export async function listPlatformAuditLog(): Promise<AuditLogEntry[]> {
  await delay(200);
  return getPlatformAuditLog();
}
