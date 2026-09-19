import type { Role } from "@/types";

export function isParishAdminRole(role: Role | null | undefined) {
  return role === "parish_admin";
}

/** Parish staff may add records and annotations; they may not rewrite register fields. */
export function canEditSacramentalRecords(role: Role | null | undefined) {
  return isParishAdminRole(role);
}

/** Parish profile, fees, staff accounts, and certificate configuration. */
export function canManageParishSettings(role: Role | null | undefined) {
  return isParishAdminRole(role);
}
