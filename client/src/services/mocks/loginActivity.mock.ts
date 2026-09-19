// src/services/mocks/loginActivity.mock.ts
import type { LoginActivityEntry } from "@/features/parish-admin/settings/types";

export const LOGIN_ACTIVITY: LoginActivityEntry[] = [
  { id: "act-1", timestamp: "Aug 13, 2026 · 9:42 AM", device: "Chrome on Windows", location: "Cebu City, Philippines", status: "success" },
  { id: "act-2", timestamp: "Aug 12, 2026 · 6:15 PM", device: "Safari on iPhone", location: "Cebu City, Philippines", status: "success" },
  { id: "act-3", timestamp: "Aug 10, 2026 · 11:03 PM", device: "Unknown device", location: "Manila, Philippines", status: "failed" },
  { id: "act-4", timestamp: "Aug 8, 2026 · 8:20 AM", device: "Chrome on Windows", location: "Mandaue City, Philippines", status: "success" },
  { id: "act-5", timestamp: "Aug 5, 2026 · 7:58 AM", device: "Safari on iPhone", location: "Cebu City, Philippines", status: "success" },
];
