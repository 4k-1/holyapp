import type { CurrentUser, Parish } from "@/types";
import { MOCK_AUDIT_LOG } from "@/services/mocks/auditLog.mock";
import { MOCK_BAPTISMAL_RECORDS } from "@/services/mocks/baptismalRecords.mock";
import { MOCK_CERTIFICATES } from "@/services/mocks/certificates.mock";
import { MOCK_CONFIRMATION_RECORDS } from "@/services/mocks/confirmationRecords.mock";
import { MOCK_DEATH_RECORDS } from "@/services/mocks/deathRecords.mock";
import { MOCK_MARRIAGE_RECORDS } from "@/services/mocks/marriageRecords.mock";
import { MOCK_PARISHES } from "@/services/mocks/parishes.mock";
import { MOCK_REQUESTS } from "@/services/mocks/requests.mock";
import { MOCK_USERS, mockUser } from "@/services/mocks/users.mock";

export interface ParishRecordCounts {
  baptism: number;
  confirmation: number;
  marriage: number;
  death: number;
  total: number;
}

export interface PlatformAdmin extends CurrentUser {
  canEditRecords: boolean;
}

export interface CertTheme {
  id: string;
  name: string;
  desc: string;
  accent: string;
  borderWidth: string;
  borderStyle: string;
}

export const CERT_THEMES: CertTheme[] = [
  {
    id: "classic",
    name: "Classic Green Border",
    desc: "Forest green double-rule border, serif heading — the platform default.",
    accent: "#1B5940",
    borderWidth: "3px",
    borderStyle: "double",
  },
  {
    id: "modern",
    name: "Modern Minimal",
    desc: "Thin single-rule border, understated and clean.",
    accent: "#3B4E8A",
    borderWidth: "1.5px",
    borderStyle: "solid",
  },
  {
    id: "ornate",
    name: "Ornate Gold Seal",
    desc: "Bold gold border for a more traditional, formal look.",
    accent: "#AD8A2C",
    borderWidth: "3px",
    borderStyle: "double",
  },
];

const canEditByUserId: Record<string, boolean> = {
  "u-admin-carla": false,
};

const certThemeByParishId: Record<string, string> = {};

export interface SuperAdminParishOverview {
  parish: Parish;
  admins: PlatformAdmin[];
  staff: CurrentUser[];
  parishioners: CurrentUser[];
  records: ParishRecordCounts;
  certificateCount: number;
  requestCount: number;
  certTheme: string;
}

function usersOf(parishId: string, role: CurrentUser["role"]) {
  return MOCK_USERS.filter((u) => u.parishId === parishId && u.role === role).map(
    ({ password: _password, ...user }) => user
  );
}

function withCanEdit(user: CurrentUser): PlatformAdmin {
  return { ...user, canEditRecords: canEditByUserId[user.id] !== false };
}

export function getCertTheme(id?: string) {
  return CERT_THEMES.find((theme) => theme.id === id) ?? CERT_THEMES[0];
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
    admins: usersOf(parish.id, "parish_admin").map(withCanEdit),
    staff: usersOf(parish.id, "parish_staff"),
    parishioners: usersOf(parish.id, "parishioner"),
    records: recordCounts(parish.id),
    certificateCount: MOCK_CERTIFICATES.filter((c) => c.parishId === parish.id).length,
    requestCount: MOCK_REQUESTS.filter((r) => r.parishId === parish.id).length,
    certTheme: certThemeByParishId[parish.id] ?? "classic",
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
  canEditRecords: boolean;
}

/** Every parish-scoped account on the platform. Super admins are excluded. */
export function getPlatformAccounts(): PlatformAccount[] {
  const accounts: PlatformAccount[] = [];
  for (const { password: _password, ...user } of MOCK_USERS) {
    if (user.role === "super_admin" || !user.parishId) continue;
    const parish = MOCK_PARISHES.find((p) => p.id === user.parishId);
    if (!parish) continue;
    accounts.push({ user, parish, canEditRecords: canEditByUserId[user.id] !== false });
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

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "parish";
}

function uniqueSlug(name: string) {
  const base = slugify(name);
  let slug = base;
  let n = 2;
  while (MOCK_PARISHES.some((p) => p.slug === slug)) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}

function splitPersonName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Admin", lastName: "Account" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] };
}

function nextId(prefix: string, existing: string[]) {
  let n = existing.length + 1;
  let id = `${prefix}-${n}`;
  while (existing.includes(id)) {
    n += 1;
    id = `${prefix}-${n}`;
  }
  return id;
}

export function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let pass = "";
  for (let i = 0; i < 10; i += 1) pass += chars[Math.floor(Math.random() * chars.length)];
  return pass;
}

export interface OnboardParishInput {
  name: string;
  address: string;
  contact?: string;
  email?: string;
  adminName?: string;
  adminEmail?: string;
  adminPassword?: string;
}

export function onboardParish(input: OnboardParishInput) {
  const name = input.name.trim();
  const address = input.address.trim();
  const adminName = input.adminName?.trim() ?? "";
  const adminEmail = input.adminEmail?.trim().toLowerCase() ?? "";
  const now = new Date().toISOString();

  if (adminEmail && MOCK_USERS.some((u) => u.email.toLowerCase() === adminEmail)) {
    throw new Error("That email already has an account.");
  }

  const parish: Parish = {
    id: nextId(
      "parish",
      MOCK_PARISHES.map((p) => p.id)
    ),
    slug: uniqueSlug(name),
    name,
    address,
    contact: input.contact?.trim() ?? "",
    email: input.email?.trim() ?? "",
    createdAt: now,
    updatedAt: now,
  };
  MOCK_PARISHES.push(parish);

  MOCK_AUDIT_LOG.unshift({
    id: nextId(
      "aud",
      MOCK_AUDIT_LOG.map((a) => a.id)
    ),
    parishId: parish.id,
    actorId: "u-super",
    action: "parish.created",
    entityType: "parish",
    entityId: parish.id,
    metadata: { name: parish.name },
    createdAt: now,
  });

  let credentials: { email: string; password: string } | undefined;
  if (adminName && adminEmail) {
    const password = input.adminPassword?.trim() || generateTempPassword();
    const names = splitPersonName(adminName);
    const user = mockUser({
      id: nextId(
        "u-admin",
        MOCK_USERS.map((u) => u.id)
      ),
      parishId: parish.id,
      role: "parish_admin",
      firstName: names.firstName,
      lastName: names.lastName,
      fullName: adminName,
      email: adminEmail,
      password,
      emailVerifiedAt: now,
      createdAt: now,
    });
    MOCK_USERS.push(user);
    MOCK_AUDIT_LOG.unshift({
      id: nextId(
        "aud",
        MOCK_AUDIT_LOG.map((a) => a.id)
      ),
      parishId: parish.id,
      actorId: "u-super",
      action: "app_user.created",
      entityType: "app_user",
      entityId: user.id,
      metadata: { role: "parish_admin", email: adminEmail },
      createdAt: now,
    });
    credentials = { email: adminEmail, password };
  }

  return { parish, credentials };
}

export function updateParish(
  id: string,
  patch: Partial<Pick<Parish, "name" | "address" | "contact" | "email">>
) {
  const parish = MOCK_PARISHES.find((p) => p.id === id);
  if (!parish) throw new Error("Parish not found.");
  if (patch.name !== undefined) parish.name = patch.name.trim();
  if (patch.address !== undefined) parish.address = patch.address.trim();
  if (patch.contact !== undefined) parish.contact = patch.contact.trim();
  if (patch.email !== undefined) parish.email = patch.email.trim();
  parish.updatedAt = new Date().toISOString();
  return parish;
}

export function getParishOverview(id: string) {
  return getSuperAdminParishOverviews().find((row) => row.parish.id === id) ?? null;
}

export interface CreateParishAccountInput {
  parishId: string;
  role: "parish_admin" | "parishioner";
  name: string;
  email: string;
  password?: string;
  canEditRecords?: boolean;
}

export function createParishAccount(input: CreateParishAccountInput) {
  const parish = MOCK_PARISHES.find((p) => p.id === input.parishId);
  if (!parish) throw new Error("Parish not found.");
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (MOCK_USERS.some((u) => u.email.toLowerCase() === email)) {
    throw new Error("That email already has an account.");
  }
  const now = new Date().toISOString();
  const password = input.password?.trim() || generateTempPassword();
  const names = splitPersonName(name);
  const prefix = input.role === "parish_admin" ? "u-admin" : "u-parishioner";
  const user = mockUser({
    id: nextId(
      prefix,
      MOCK_USERS.map((u) => u.id)
    ),
    parishId: parish.id,
    role: input.role,
    firstName: names.firstName,
    lastName: names.lastName,
    fullName: name,
    email,
    password,
    emailVerifiedAt: now,
    createdAt: now,
  });
  MOCK_USERS.push(user);
  if (input.role === "parish_admin") {
    canEditByUserId[user.id] = input.canEditRecords !== false;
  }
  MOCK_AUDIT_LOG.unshift({
    id: nextId(
      "aud",
      MOCK_AUDIT_LOG.map((a) => a.id)
    ),
    parishId: parish.id,
    actorId: "u-super",
    action: "app_user.created",
    entityType: "app_user",
    entityId: user.id,
    metadata: {
      role: input.role,
      email,
      ...(input.role === "parish_admin" && input.canEditRecords === false ? { canEditRecords: false } : {}),
    },
    createdAt: now,
  });
  return { user, parish, credentials: { email, password } };
}

export function removeParishAccount(userId: string) {
  const index = MOCK_USERS.findIndex((u) => u.id === userId);
  if (index < 0) throw new Error("Account not found.");
  const user = MOCK_USERS[index];
  if (user.role === "super_admin") throw new Error("Cannot remove a platform admin.");
  MOCK_USERS.splice(index, 1);
  MOCK_AUDIT_LOG.unshift({
    id: nextId(
      "aud",
      MOCK_AUDIT_LOG.map((a) => a.id)
    ),
    parishId: user.parishId,
    actorId: "u-super",
    action: "app_user.removed",
    entityType: "app_user",
    entityId: user.id,
    metadata: { role: user.role, email: user.email },
    createdAt: new Date().toISOString(),
  });
  return user;
}

export function setAccountStatus(userId: string, status: "active" | "suspended") {
  const user = MOCK_USERS.find((u) => u.id === userId);
  if (!user || user.role === "super_admin") throw new Error("Account not found.");
  user.status = status;
  MOCK_AUDIT_LOG.unshift({
    id: nextId(
      "aud",
      MOCK_AUDIT_LOG.map((a) => a.id)
    ),
    parishId: user.parishId,
    actorId: "u-super",
    action: status === "suspended" ? "app_user.suspended" : "app_user.reactivated",
    entityType: "app_user",
    entityId: user.id,
    metadata: { email: user.email },
    createdAt: new Date().toISOString(),
  });
  return user;
}

export function resetAccountPassword(userId: string) {
  const user = MOCK_USERS.find((u) => u.id === userId);
  if (!user || user.role === "super_admin") throw new Error("Account not found.");
  const password = generateTempPassword();
  user.password = password;
  MOCK_AUDIT_LOG.unshift({
    id: nextId(
      "aud",
      MOCK_AUDIT_LOG.map((a) => a.id)
    ),
    parishId: user.parishId,
    actorId: "u-super",
    action: "app_user.password_reset",
    entityType: "app_user",
    entityId: user.id,
    metadata: { email: user.email },
    createdAt: new Date().toISOString(),
  });
  return { name: user.fullName, email: user.email, password };
}

export interface UpdateParishAccountInput {
  name?: string;
  email?: string;
  contactNumber?: string;
  gender?: string;
  birthday?: string;
  address?: string;
  role?: "parish_admin" | "parish_staff";
  canEditRecords?: boolean;
}

export function updateParishAccount(userId: string, patch: UpdateParishAccountInput) {
  const user = MOCK_USERS.find((u) => u.id === userId);
  if (!user || user.role === "super_admin") throw new Error("Account not found.");

  if (patch.email !== undefined) {
    const email = patch.email.trim().toLowerCase();
    if (!email) throw new Error("Email is required.");
    if (MOCK_USERS.some((other) => other.id !== userId && other.email.toLowerCase() === email)) {
      throw new Error("That email already has an account.");
    }
    user.email = email;
  }

  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (!name) throw new Error("Name is required.");
    const names = splitPersonName(name);
    user.firstName = names.firstName;
    user.lastName = names.lastName;
    user.fullName = name;
  }

  if (patch.contactNumber !== undefined) user.contactNumber = patch.contactNumber.trim();
  if (patch.gender !== undefined) user.gender = patch.gender.trim() || undefined;
  if (patch.birthday !== undefined) user.birthday = patch.birthday.trim() || undefined;
  if (patch.address !== undefined) user.address = patch.address.trim() || undefined;

  const office = user.role === "parish_admin" || user.role === "parish_staff";
  if (office && patch.role && patch.role !== user.role) {
    user.role = patch.role;
  }

  if (user.role === "parish_admin" && patch.canEditRecords !== undefined) {
    canEditByUserId[user.id] = patch.canEditRecords;
  }

  MOCK_AUDIT_LOG.unshift({
    id: nextId(
      "aud",
      MOCK_AUDIT_LOG.map((a) => a.id)
    ),
    parishId: user.parishId,
    actorId: "u-super",
    action: "app_user.updated",
    entityType: "app_user",
    entityId: user.id,
    metadata: { email: user.email, role: user.role },
    createdAt: new Date().toISOString(),
  });

  const { password: _password, ...safe } = user;
  return {
    ...safe,
    canEditRecords: user.role === "parish_admin" ? canEditByUserId[user.id] !== false : undefined,
  };
}

export function setAccountCanEdit(userId: string, canEditRecords: boolean) {
  const user = MOCK_USERS.find((u) => u.id === userId);
  if (!user || user.role !== "parish_admin") throw new Error("Account not found.");
  canEditByUserId[user.id] = canEditRecords;
  MOCK_AUDIT_LOG.unshift({
    id: nextId(
      "aud",
      MOCK_AUDIT_LOG.map((a) => a.id)
    ),
    parishId: user.parishId,
    actorId: "u-super",
    action: canEditRecords ? "app_user.granted_edit" : "app_user.revoked_edit",
    entityType: "app_user",
    entityId: user.id,
    metadata: { email: user.email, canEditRecords },
    createdAt: new Date().toISOString(),
  });
  return { ...user, canEditRecords };
}

export function setParishCertTheme(parishId: string, themeId: string) {
  const parish = MOCK_PARISHES.find((p) => p.id === parishId);
  if (!parish) throw new Error("Parish not found.");
  const theme = getCertTheme(themeId);
  certThemeByParishId[parishId] = theme.id;
  MOCK_AUDIT_LOG.unshift({
    id: nextId(
      "aud",
      MOCK_AUDIT_LOG.map((a) => a.id)
    ),
    parishId,
    actorId: "u-super",
    action: "parish.cert_theme_updated",
    entityType: "parish",
    entityId: parishId,
    metadata: { theme: theme.name },
    createdAt: new Date().toISOString(),
  });
  return { parish, theme };
}
