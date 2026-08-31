import { delay } from "@/services/delay";
import {
  getDashboardSnapshot,
  getPlatformAccounts,
  getPlatformAuditLog,
  getSuperAdminParishOverviews,
  onboardParish,
  updateParish,
  type DashboardSnapshot,
  type OnboardParishInput,
  type PlatformAccount,
  type SuperAdminParishOverview,
} from "@/services/mocks/superAdmin.mock";
import type { AuditLogEntry, Parish } from "@/types";

export type { DashboardSnapshot, OnboardParishInput, PlatformAccount, SuperAdminParishOverview };

export async function getPlatformDashboard(): Promise<DashboardSnapshot> {
  await delay(200);
  return getDashboardSnapshot();
}

export async function listPlatformParishes(): Promise<SuperAdminParishOverview[]> {
  await delay(200);
  return getSuperAdminParishOverviews();
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

export async function listPlatformAccounts(): Promise<PlatformAccount[]> {
  await delay(200);
  return getPlatformAccounts();
}

export async function listPlatformAuditLog(): Promise<AuditLogEntry[]> {
  await delay(200);
  return getPlatformAuditLog();
}
