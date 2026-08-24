// src/features/parish-admin/settings/types.ts

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
  | "mass-rules"
  | "marriage-reqs"
  | "payment"
  | "privacy"
  | "security";

export interface SettingsSectionMeta {
  id: SettingsSectionId;
  label: string;
  /** URL segment under /settings — e.g. "parish-profile" -> /settings/parish-profile */
  path: string;
  /** Sections without a real page yet render a "coming soon" placeholder instead of a broken link. */
  enabled: boolean;
}

export const SETTINGS_SECTIONS: SettingsSectionMeta[] = [
  { id: "profile", label: "Parish Profile", path: "parish-profile", enabled: true },
  { id: "fees", label: "Service Fees", path: "fees", enabled: true },
  { id: "staff", label: "Staff Accounts", path: "staff", enabled: false },
  { id: "certificates", label: "Certificate Configuration", path: "certificates", enabled: true },
  { id: "mass-rules", label: "Mass Intention Rules", path: "mass-rules", enabled: false },
  { id: "marriage-reqs", label: "Marriage Application Requirements", path: "marriage-requirements", enabled: false },
  { id: "payment", label: "Payment Configuration", path: "payment", enabled: false },
  { id: "privacy", label: "Data & Privacy", path: "privacy", enabled: false },
  { id: "security", label: "Account & Security", path: "security", enabled: true },
];
