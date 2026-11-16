import { apiFetch, ApiError } from "@/lib/api";
import { normalizeAccess } from "@/features/parish-admin/access";
import type { NewStaffInput, StaffAccount, StaffRole, StaffStatus } from "../types";

function fail(err: unknown): never {
  if (err instanceof ApiError) throw new Error(err.message);
  throw new Error("Unable to reach the server.");
}

function asStaffRole(role: string): StaffRole {
  return role || "Admin Staff";
}

function asStaff(row: StaffAccount): StaffAccount {
  return {
    id: row.id,
    name: row.name,
    role: asStaffRole(row.role),
    email: row.email,
    status: row.status === "Inactive" ? "Inactive" : "Active",
    accessRole: row.accessRole === "admin" ? "admin" : "staff",
    personnelId: row.personnelId ?? null,
    areaAccess: normalizeAccess(row.areaAccess),
  };
}

export async function listStaffAccounts(): Promise<StaffAccount[]> {
  try {
    const data = await apiFetch<{ staff: StaffAccount[] }>("/staff");
    return (data.staff ?? []).map(asStaff);
  } catch (err) {
    fail(err);
  }
}

/**
 * Creates the account and emails the person a link to set their own password (no one else ever knows it).
 * inviteSent is false when that email could not go out; send it again with sendStaffSignInLink.
 */
export async function addStaffAccount(input: NewStaffInput): Promise<{ account: StaffAccount; inviteSent: boolean }> {
  try {
    const data = await apiFetch<{ staff: StaffAccount; inviteSent?: boolean }>("/staff", {
      method: "POST",
      body: input,
    });
    return { account: asStaff(data.staff), inviteSent: data.inviteSent !== false };
  } catch (err) {
    fail(err);
  }
}

export async function updateStaffAccount(id: string, input: NewStaffInput): Promise<StaffAccount> {
  try {
    const data = await apiFetch<{ staff: StaffAccount }>(`/staff/${id}`, {
      method: "PATCH",
      body: input,
    });
    return asStaff(data.staff);
  } catch (err) {
    fail(err);
  }
}

/** Emails the person a new link to set their password, e.g. when they are locked out. Admins only. */
export async function sendStaffSignInLink(id: string): Promise<void> {
  try {
    await apiFetch(`/staff/${id}/sign-in-link`, { method: "POST" });
  } catch (err) {
    fail(err);
  }
}

export async function setStaffAccountStatus(id: string, status: StaffStatus): Promise<StaffAccount> {
  try {
    const data = await apiFetch<{ staff: StaffAccount }>(`/staff/${id}/status`, {
      method: "PATCH",
      body: { status },
    });
    return asStaff(data.staff);
  } catch (err) {
    fail(err);
  }
}
