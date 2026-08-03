import type { CurrentUser } from "@/types";

// password is intentionally plain here — mock only, never do this for real
export const MOCK_USERS: Array<CurrentUser & { password: string }> = [
  {
    id: "u-super",
    parishId: null,
    role: "super_admin",
    fullName: "Super Admin",
    email: "super@holyapp.ph",
    password: "password123",
  },
  {
    id: "u-admin",
    parishId: "parish-1",
    role: "parish_admin",
    fullName: "Admin Immaculada",
    email: "admin@immaculada.ph",
    password: "password123",
  },
  {
    id: "u-parishioner",
    parishId: "parish-1",
    role: "parishioner",
    fullName: "Juan Dela Cruz",
    email: "juan@example.com",
    password: "password123",
  },
];