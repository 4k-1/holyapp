// src/services/mocks/staffAccounts.mock.ts
import type { StaffAccount } from "@/features/parish-admin/settings/types";

// "st1" mirrors the logged-in admin (u-admin / admin@immaculada.ph in users.mock.ts) so the
// signed-in account shows up in its own staff list, same as any real multi-admin parish.
export const STAFF_ACCOUNTS: StaffAccount[] = [
  { id: "st1", name: "Admin Immaculada", role: "Admin Staff", email: "admin@immaculada.ph", status: "Active", accessRole: "admin" },
  { id: "st2", name: "Fr. Juan Santos", role: "Priest", email: "juan.santos@immaculada.ph", status: "Active", accessRole: "staff" },
  { id: "st3", name: "Fr. Emilio Reyes", role: "Priest", email: "emilio.reyes@immaculada.ph", status: "Active", accessRole: "staff" },
  { id: "st4", name: "Rec. Staff Carla Bautista", role: "Parish Secretary", email: "carla.bautista@immaculada.ph", status: "Active", accessRole: "admin" },
  { id: "st5", name: "Rec. Staff Miguel Torres", role: "Admin Staff", email: "miguel.torres@immaculada.ph", status: "Inactive", accessRole: "staff" },
];