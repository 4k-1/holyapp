// src/features/parish-admin/settings/types.ts
import { PERSONNEL_ROLES } from "@/features/parish-admin/staff/staffRoles";
import type { SacramentType } from "@/types";

export interface ParishProfile {
  name: string;
  address: string;
  patron: string;
  diocese: string;
  phone: string;
  email: string;
  /** URL of the uploaded seal/logo image, if one has been set. */
  sealUrl?: string;
}

export interface ServiceFee {
  id: string;
  label: string;
  amount: number;
  updatedBy: string;
  updatedOn: string; // formatted display date, e.g. "June 2, 2026"
}

export interface CertificateAppearance {
  signatoryName: string;
  signatoryTitle: string;
  numberingPrefix: string;
  footerText: string;
}

export type CertificateConfigBySacrament = Record<SacramentType, CertificateAppearance>;

/** A role from the Staff list, e.g. "Parish Priest" or "Parish Secretary". */
export type StaffRole = string;

export const STAFF_ROLES: StaffRole[] = PERSONNEL_ROLES;

/** "admin" also grants Settings, Service Fees, and Staff Accounts — same split as CurrentUser["role"]. */
export type StaffAccessRole = "staff" | "admin";

export type StaffStatus = "Active" | "Inactive";

export interface StaffAccount {
  id: string;
  name: string;
  role: StaffRole;
  email: string;
  status: StaffStatus;
  accessRole: StaffAccessRole;
  /** Their row on the Staff list, used for the handover when they leave. */
  personnelId?: string | null;
}

export type NewStaffInput = Pick<StaffAccount, "name" | "email" | "role" | "accessRole"> & {
  /** Someone already on the Staff list to attach the sign-in to; their name and role are kept. */
  personnelId?: string;
};

export interface LoginSession {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  current: boolean;
}

export type LoginActivityStatus = "success" | "failed";

export interface LoginActivityEntry {
  id: string;
  timestamp: string;
  device: string;
  location: string;
  status: LoginActivityStatus;
}

export type SettingsSectionId =
  | "profile"
  | "fees"
  | "staff"
  | "certificates"
  | "mass-schedule"
  | "mass-rules"
  | "marriage-reqs"
  | "payment"
  | "privacy"
  | "personal"
  | "security";

export interface SettingsSectionMeta {
  id: SettingsSectionId;
  label: string;
  /** URL segment under /settings — e.g. "parish-profile" -> /settings/parish-profile */
  path: string;
  /** Sections without a real page yet render a "coming soon" placeholder instead of a broken link. */
  enabled: boolean;
  /** "parish" sections are parish-wide; "account" ones belong to whoever is signed in. */
  group: "parish" | "account";
  /** One line under the section title. */
  description: string;
}

export const SETTINGS_SECTIONS: SettingsSectionMeta[] = [
  {
    id: "profile",
    label: "Parish Profile",
    path: "parish-profile",
    enabled: true,
    group: "parish",
    description: "Used across certificates, the public verification page, and correspondence.",
  },
  {
    id: "fees",
    label: "Service Fees",
    path: "fees",
    enabled: true,
    group: "parish",
    description: "Default amounts for new requests. Changing one doesn't affect requests already submitted.",
  },
  {
    id: "staff",
    label: "Staff Accounts",
    path: "staff",
    enabled: true,
    group: "parish",
    description: "People who can sign in to this parish's admin console.",
  },
  {
    id: "certificates",
    label: "Certificates",
    path: "certificates",
    enabled: true,
    group: "parish",
    description: "Who signs each certificate, what it says at the foot, and how it is numbered.",
  },
  {
    id: "mass-schedule",
    label: "Mass Schedule",
    path: "mass-schedule",
    enabled: true,
    group: "parish",
    description: "The parish's regular Mass times. Intentions are offered for these, and nothing can be booked over them.",
  },
  { id: "mass-rules", label: "Mass Intention Rules", path: "mass-rules", enabled: false, group: "parish", description: "" },
  {
    id: "marriage-reqs",
    label: "Marriage Requirements",
    path: "marriage-requirements",
    enabled: false,
    group: "parish",
    description: "",
  },
  { id: "payment", label: "Payments", path: "payment", enabled: false, group: "parish", description: "" },
  { id: "privacy", label: "Data & Privacy", path: "privacy", enabled: false, group: "parish", description: "" },
  {
    id: "personal",
    label: "My Profile",
    path: "personal",
    enabled: true,
    group: "account",
    description: "Your own details on this account. They don't change parish settings.",
  },
  {
    id: "security",
    label: "Account & Security",
    path: "security",
    enabled: true,
    group: "account",
    description: "Your password, two-factor sign-in, and the devices signed in to this account.",
  },
];
