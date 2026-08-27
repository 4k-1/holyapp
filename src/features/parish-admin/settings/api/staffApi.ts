// src/features/parish-admin/settings/api/staffApi.ts
import { delay } from "@/services/delay";
import { STAFF_ACCOUNTS } from "@/services/mocks/staffAccounts.mock";
import type { NewStaffInput, StaffAccount, StaffStatus } from "../types";

// NOTE: not scoped by parishId yet since the mock is single-tenant —
// thread parishId through here once staff accounts are per-parish.

let nextId = STAFF_ACCOUNTS.length + 1;

export async function listStaffAccounts(): Promise<StaffAccount[]> {
  await delay();
  return [...STAFF_ACCOUNTS];
}

export async function addStaffAccount(input: NewStaffInput): Promise<StaffAccount> {
  await delay();
  const account: StaffAccount = {
    id: `st${nextId++}`,
    name: input.name,
    role: input.role,
    email: input.email,
    status: "Active",
    accessRole: input.accessRole,
  };
  STAFF_ACCOUNTS.push(account);
  return { ...account };
}

export async function updateStaffAccount(id: string, input: NewStaffInput): Promise<StaffAccount> {
  await delay();
  const account = STAFF_ACCOUNTS.find((s) => s.id === id);
  if (!account) throw new Error(`Unknown staff id: ${id}`);
  account.name = input.name;
  account.role = input.role;
  account.email = input.email;
  account.accessRole = input.accessRole;
  return { ...account };
}

export async function setStaffAccountStatus(id: string, status: StaffStatus): Promise<StaffAccount> {
  await delay();
  const account = STAFF_ACCOUNTS.find((s) => s.id === id);
  if (!account) throw new Error(`Unknown staff id: ${id}`);
  account.status = status;
  return { ...account };
}
