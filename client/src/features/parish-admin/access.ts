// E1: access per area for staff sign-ins. Mirrors server/src/constants/staffAccess.js.
// Admins always have every area at Manage. Settings, staff accounts, voids and clearing cheques stay admin-only.
import type { CurrentUser } from "@/types";

export type AccessArea = "registers" | "certificates" | "donations" | "intentions" | "schedule" | "marriage";
export type AccessLevel = "off" | "view" | "manage";
export type AreaAccess = Record<AccessArea, AccessLevel>;

export const ACCESS_AREAS: { key: AccessArea; label: string; hint: string }[] = [
  { key: "registers", label: "Registers", hint: "Baptism, confirmation, marriage and death books, and ledgers" },
  { key: "certificates", label: "Certificates", hint: "Certificate requests, issuing, printing and reprints" },
  { key: "donations", label: "Donations & money", hint: "Recording donations and the money reports" },
  { key: "intentions", label: "Mass intentions", hint: "Booking and confirming intentions" },
  { key: "schedule", label: "Schedule", hint: "Masses, events, funerals and assignments" },
  { key: "marriage", label: "Marriage applications", hint: "Requirements, banns and wedding dates" },
];

export const ACCESS_LEVELS: { key: AccessLevel; label: string }[] = [
  { key: "off", label: "Off" },
  { key: "view", label: "View" },
  { key: "manage", label: "Manage" },
];

const RANK: Record<AccessLevel, number> = { off: 0, view: 1, manage: 2 };

function every(level: AccessLevel): AreaAccess {
  return Object.fromEntries(ACCESS_AREAS.map((a) => [a.key, level])) as AreaAccess;
}

export const FULL_ACCESS: AreaAccess = every("manage");

export const ACCESS_PRESETS: { key: string; label: string; description: string; access: AreaAccess }[] = [
  {
    key: "secretary",
    label: "Secretary",
    description: "Runs the office: registers, certificates, intentions, schedule and marriages. Sees donations.",
    access: { registers: "manage", certificates: "manage", donations: "view", intentions: "manage", schedule: "manage", marriage: "manage" },
  },
  {
    key: "cashier",
    label: "Cashier",
    description: "Takes donations and intention offerings. Sees certificates and the schedule.",
    access: { registers: "off", certificates: "view", donations: "manage", intentions: "manage", schedule: "view", marriage: "off" },
  },
  {
    key: "encoder",
    label: "Records encoder",
    description: "Types up register entries. Sees certificates, the schedule and marriages.",
    access: { registers: "manage", certificates: "view", donations: "off", intentions: "off", schedule: "view", marriage: "view" },
  },
  { key: "readonly", label: "Read-only", description: "Can look at every area but change nothing.", access: every("view") },
  { key: "full", label: "Full staff access", description: "Manage on every area. Settings stay with admins.", access: FULL_ACCESS },
];

export function normalizeAccess(value: Partial<Record<string, string>> | null | undefined): AreaAccess {
  const out = { ...FULL_ACCESS };
  for (const area of ACCESS_AREAS) {
    const level = value?.[area.key];
    if (level === "off" || level === "view" || level === "manage") out[area.key] = level;
  }
  return out;
}

/** The preset this access matches exactly, or null for a custom mix. */
export function matchingPreset(access: AreaAccess) {
  return ACCESS_PRESETS.find((p) => ACCESS_AREAS.every((a) => p.access[a.key] === access[a.key])) ?? null;
}

/** Short summary for a table cell, e.g. "Cashier" or "Custom · 4 of 6 areas". */
export function describeAccess(access: AreaAccess) {
  const preset = matchingPreset(access);
  if (preset) return preset.label;
  const open = ACCESS_AREAS.filter((a) => access[a.key] !== "off").length;
  return `Custom · ${open} of ${ACCESS_AREAS.length} areas`;
}

/** What the signed-in user can do in an area. Admins can do everything; parishioners nothing here. */
export function userCan(user: CurrentUser | null | undefined, area: AccessArea, level: Exclude<AccessLevel, "off"> = "view") {
  if (!user) return false;
  if (user.role === "parish_admin" || user.role === "super_admin") return true;
  if (user.role !== "parish_staff") return false;
  return RANK[normalizeAccess(user.areaAccess)[area]] >= RANK[level];
}
