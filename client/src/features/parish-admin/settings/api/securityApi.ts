// src/features/parish-admin/settings/api/securityApi.ts
import { delay } from "@/services/delay";
import { LOGIN_ACTIVITY } from "@/services/mocks/loginActivity.mock";
import { LOGIN_SESSIONS } from "@/services/mocks/loginSessions.mock";
import type { LoginActivityEntry, LoginSession } from "../types";

// NOTE: not scoped by parishId/userId yet since the mock is single-tenant —
// thread the signed-in user's id through here once this talks to a real backend.

let twoFactorEnabled = false;

export interface SecurityOverview {
  twoFactorEnabled: boolean;
  sessions: LoginSession[];
  activity: LoginActivityEntry[];
}

export async function getSecurityOverview(): Promise<SecurityOverview> {
  await delay();
  return {
    twoFactorEnabled,
    sessions: [...LOGIN_SESSIONS],
    activity: [...LOGIN_ACTIVITY],
  };
}

export async function setTwoFactorEnabled(enabled: boolean): Promise<boolean> {
  await delay();
  twoFactorEnabled = enabled;
  return twoFactorEnabled;
}

export async function endSession(id: string): Promise<void> {
  await delay();
  const idx = LOGIN_SESSIONS.findIndex((s) => s.id === id);
  if (idx !== -1) LOGIN_SESSIONS.splice(idx, 1);
}

export async function endAllOtherSessions(): Promise<LoginSession[]> {
  await delay();
  const kept = LOGIN_SESSIONS.filter((s) => s.current);
  LOGIN_SESSIONS.splice(0, LOGIN_SESSIONS.length, ...kept);
  return [...LOGIN_SESSIONS];
}
