import type { CurrentUser, Parish } from "@/types";
import { MOCK_AUDIT_LOG } from "@/services/mocks/auditLog.mock";
import { MOCK_BAPTISMAL_RECORDS } from "@/services/mocks/baptismalRecords.mock";
import { MOCK_CERTIFICATES } from "@/services/mocks/certificates.mock";
import { MOCK_CONFIRMATION_RECORDS } from "@/services/mocks/confirmationRecords.mock";
import { MOCK_DEATH_RECORDS } from "@/services/mocks/deathRecords.mock";
import { MOCK_MARRIAGE_RECORDS } from "@/services/mocks/marriageRecords.mock";
import { MOCK_PARISHES } from "@/services/mocks/parishes.mock";
import { MOCK_REQUESTS } from "@/services/mocks/requests.mock";
import { MOCK_USERS } from "@/services/mocks/users.mock";

export interface ParishRecordCounts {
  baptism: number;
  confirmation: number;
  marriage: number;
  death: number;
  total: number;
}

export interface SuperAdminParishOverview {
  parish: Parish;
  admins: CurrentUser[];
  staff: CurrentUser[];
  parishioners: CurrentUser[];
  records: ParishRecordCounts;
  certificateCount: number;
  requestCount: number;
}

function usersOf(parishId: string, role: CurrentUser["role"]) {
  return MOCK_USERS.filter((u) => u.parishId === parishId && u.role === role).map(
    ({ password: _password, ...user }) => user
  );
}

function recordCounts(parishId: string): ParishRecordCounts {
  const baptism = MOCK_BAPTISMAL_RECORDS.filter((r) => r.parishId === parishId).length;
  const confirmation = MOCK_CONFIRMATION_RECORDS.filter((r) => r.parishId === parishId).length;
  const marriage = MOCK_MARRIAGE_RECORDS.filter((r) => r.parishId === parishId).length;
  const death = MOCK_DEATH_RECORDS.filter((r) => r.parishId === parishId).length;
  return { baptism, confirmation, marriage, death, total: baptism + confirmation + marriage + death };
}

export function getSuperAdminParishOverviews(): SuperAdminParishOverview[] {
  return MOCK_PARISHES.map((parish) => ({
    parish,
    admins: usersOf(parish.id, "parish_admin"),
    staff: usersOf(parish.id, "parish_staff"),
    parishioners: usersOf(parish.id, "parishioner"),
    records: recordCounts(parish.id),
    certificateCount: MOCK_CERTIFICATES.filter((c) => c.parishId === parish.id).length,
    requestCount: MOCK_REQUESTS.filter((r) => r.parishId === parish.id).length,
  }));
}

export function getPlatformAuditLog() {
  return [...MOCK_AUDIT_LOG].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getSuperAdmins() {
  return MOCK_USERS.filter((u) => u.role === "super_admin").map(({ password: _password, ...user }) => user);
}

export interface PlatformAccount {
  user: CurrentUser;
  parish: Parish;
}

/** Every parish-scoped account on the platform. Super admins are excluded. */
export function getPlatformAccounts(): PlatformAccount[] {
  const accounts: PlatformAccount[] = [];
  for (const { password: _password, ...user } of MOCK_USERS) {
    if (user.role === "super_admin" || !user.parishId) continue;
    const parish = MOCK_PARISHES.find((p) => p.id === user.parishId);
    if (!parish) continue;
    accounts.push({ user, parish });
  }
  return accounts;
}

export interface SacramentShare {
  key: string;
  label: string;
  count: number;
  color: string;
}

export interface DashboardSnapshot {
  parishCount: number;
  activeAdminCount: number;
  parishesWithAdmin: number;
  pendingSetupCount: number;
  parishionerCount: number;
  recordTotal: number;
  certificateTotal: number;
  recordsBySacrament: SacramentShare[];
  requestsBySacrament: SacramentShare[];
  parishes: SuperAdminParishOverview[];
  admins: PlatformAccount[];
  audit: ReturnType<typeof getPlatformAuditLog>;
}

const SACRAMENT_COLORS = {
  baptism: "#2f6b45",
  confirmation: "#f2b632",
  marriage: "#5b6b63",
  death: "#c0392f",
};

export function getDashboardSnapshot(): DashboardSnapshot {
  const parishes = getSuperAdminParishOverviews();
  const accounts = getPlatformAccounts();
  const admins = accounts.filter((a) => a.user.role === "parish_admin");
  const activeAdmins = admins.filter((a) => a.user.status === "active");
  const parishesWithAdmin = parishes.filter((p) => p.admins.length > 0).length;
  const recordsBySacrament: SacramentShare[] = [
    { key: "baptism", label: "Baptism", count: parishes.reduce((s, p) => s + p.records.baptism, 0), color: SACRAMENT_COLORS.baptism },
    { key: "confirmation", label: "Confirmation", count: parishes.reduce((s, p) => s + p.records.confirmation, 0), color: SACRAMENT_COLORS.confirmation },
    { key: "marriage", label: "Marriage", count: parishes.reduce((s, p) => s + p.records.marriage, 0), color: SACRAMENT_COLORS.marriage },
    { key: "death", label: "Death", count: parishes.reduce((s, p) => s + p.records.death, 0), color: SACRAMENT_COLORS.death },
  ];
  const requestCounts = { baptism: 0, confirmation: 0, marriage: 0, death: 0 };
  for (const req of MOCK_REQUESTS) {
    requestCounts[req.sacramentType] += 1;
  }
  const requestsBySacrament: SacramentShare[] = [
    { key: "baptism", label: "Baptism", count: requestCounts.baptism, color: SACRAMENT_COLORS.baptism },
    { key: "confirmation", label: "Confirmation", count: requestCounts.confirmation, color: SACRAMENT_COLORS.confirmation },
    { key: "marriage", label: "Marriage", count: requestCounts.marriage, color: SACRAMENT_COLORS.marriage },
    { key: "death", label: "Death", count: requestCounts.death, color: SACRAMENT_COLORS.death },
  ];

  return {
    parishCount: parishes.length,
    activeAdminCount: activeAdmins.length,
    parishesWithAdmin,
    pendingSetupCount: parishes.length - parishesWithAdmin,
    parishionerCount: accounts.filter((a) => a.user.role === "parishioner").length,
    recordTotal: parishes.reduce((s, p) => s + p.records.total, 0),
    certificateTotal: parishes.reduce((s, p) => s + p.certificateCount, 0),
    recordsBySacrament,
    requestsBySacrament,
    parishes,
    admins,
    audit: getPlatformAuditLog(),
  };
}
