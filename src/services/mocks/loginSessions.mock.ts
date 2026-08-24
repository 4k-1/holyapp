// src/services/mocks/loginSessions.mock.ts
import type { LoginSession } from "@/features/parish-admin/settings/types";

export const LOGIN_SESSIONS: LoginSession[] = [
  { id: "sess-1", device: "Chrome on Windows", location: "Cebu City, Philippines", lastActive: "Active now", current: true },
  { id: "sess-2", device: "Safari on iPhone", location: "Cebu City, Philippines", lastActive: "2 hours ago", current: false },
  { id: "sess-3", device: "Chrome on Windows", location: "Mandaue City, Philippines", lastActive: "3 days ago", current: false },
];
