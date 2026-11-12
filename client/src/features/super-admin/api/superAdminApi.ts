import { apiFetch, ApiError } from "@/lib/api";
import {
  type CreateParishAccountInput,
  type UpdateParishAccountInput,
  type DashboardSnapshot,
  type OnboardParishInput,
  type PlatformAccount,
  type SuperAdminParishOverview,
  type PlatformAdmin,
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

function fail(err: unknown): never {
  if (err instanceof ApiError) throw new Error(err.message);
  throw new Error("Unable to reach the server.");
}

export async function getPlatformDashboard(): Promise<DashboardSnapshot> {
  try {
    const data = await apiFetch<{ snapshot: DashboardSnapshot }>("/platform/dashboard");
    return data.snapshot;
  } catch (err) {
    fail(err);
  }
}

/** Both ends included, YYYY-MM-DD; an empty end is open. */
export interface ReportRange {
  from: string;
  to: string;
}

export interface ReportFigures {
  records: number;
  certificates: number;
  requests: number;
  parishesInUse: number;
}

export interface PlatformReport {
  /** The range actually used, or null for an open end. */
  from: string | null;
  to: string | null;
  parishCount: number;
  figures: ReportFigures;
  /** The same number of days just before, for comparison; null when either end is open. */
  previous: ReportFigures | null;
  previousRange: { from: string; to: string; days: number } | null;
  unit: "week" | "month" | "year";
  /** Each bar's first and last day, cut to the range. */
  buckets: { start: string; end: string; records: number; certificates: number }[];
  outcomes: {
    released: number;
    rejected: number;
    open: number;
    onlineReleased: number;
    /** Middle wait in days for online requests; null when there are too few to say. */
    typicalDays: number | null;
  };
  parishes: {
    id: string;
    name: string;
    address: string;
    records: number;
    certificates: number;
    openRequests: number;
    lastActivity: string | null;
    activeInPeriod: boolean;
    hasAdmin: boolean;
  }[];
}

export async function getPlatformReport(range: ReportRange): Promise<PlatformReport> {
  const params = new URLSearchParams();
  if (range.from) params.set("from", range.from);
  if (range.to) params.set("to", range.to);
  try {
    const data = await apiFetch<{ report: PlatformReport }>(`/platform/reports?${params}`);
    return data.report;
  } catch (err) {
    fail(err);
  }
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
  try {
    return await apiFetch<{
      parish: Parish;
      overview?: SuperAdminParishOverview;
      credentials?: { email: string; password: string };
    }>("/platform/parishes", {
      method: "POST",
      body: input,
    });
  } catch (err) {
    fail(err);
  }
}

export async function updatePlatformParish(
  id: string,
  patch: Partial<Pick<Parish, "name" | "address" | "contact" | "email">>
) {
  try {
    const data = await apiFetch<{ parish: Parish }>(`/platform/parishes/${id}`, {
      method: "PATCH",
      body: patch,
    });
    return data.parish;
  } catch (err) {
    fail(err);
  }
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

export type AuditKind = "green" | "yellow" | "red";

/** 100 entries at a time, newest first. Pass the last entry shown as `beforeId` to get the ones older than it. */
export async function listPlatformAuditLog(options: {
  beforeId?: string;
  parishId?: string;
  kind?: AuditKind;
} = {}): Promise<{ entries: AuditLogEntry[]; hasMore: boolean }> {
  const params = new URLSearchParams();
  if (options.beforeId) params.set("beforeId", options.beforeId);
  if (options.parishId) params.set("parishId", options.parishId);
  if (options.kind) params.set("kind", options.kind);
  const query = params.toString();
  try {
    const data = await apiFetch<{ entries: AuditLogEntry[]; hasMore?: boolean }>(`/audit${query ? `?${query}` : ""}`);
    return { entries: data.entries ?? [], hasMore: Boolean(data.hasMore) };
  } catch (err) {
    fail(err);
  }
}
