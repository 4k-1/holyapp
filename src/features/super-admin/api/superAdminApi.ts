import { delay } from "@/services/delay";
import {
  getDashboardSnapshot,
  getPlatformAccounts,
  getPlatformAuditLog,
  getSuperAdminParishOverviews,
  type DashboardSnapshot,
  type PlatformAccount,
  type SuperAdminParishOverview,
} from "@/services/mocks/superAdmin.mock";
import type { AuditLogEntry } from "@/types";

export type { DashboardSnapshot, PlatformAccount, SuperAdminParishOverview };

export async function getPlatformDashboard(): Promise<DashboardSnapshot> {
  await delay(200);
  return getDashboardSnapshot();
}

export async function listPlatformParishes(): Promise<SuperAdminParishOverview[]> {
  await delay(200);
  return getSuperAdminParishOverviews();
}

export async function listPlatformAccounts(): Promise<PlatformAccount[]> {
  await delay(200);
  return getPlatformAccounts();
}

export async function listPlatformAuditLog(): Promise<AuditLogEntry[]> {
  await delay(200);
  return getPlatformAuditLog();
}
