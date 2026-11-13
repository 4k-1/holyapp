import { apiFetch, ApiError } from "@/lib/api";
import { getRefreshToken } from "@/features/auth/session";
import type { LoginActivityEntry, LoginSession } from "../types";

export interface SecurityOverview {
  twoFactorEnabled: boolean;
  sessions: LoginSession[];
  activity: LoginActivityEntry[];
}

function sessionHeaders(): HeadersInit {
  const refresh = getRefreshToken();
  return refresh ? { "X-Refresh-Token": refresh } : {};
}

function fail(err: unknown): never {
  if (err instanceof ApiError) throw new Error(err.message);
  throw new Error("Unable to reach the server.");
}

export async function getSecurityOverview(): Promise<SecurityOverview> {
  try {
    return await apiFetch<SecurityOverview>("/auth/security", { headers: sessionHeaders() });
  } catch (err) {
    fail(err);
  }
}

export async function setTwoFactorEnabled(enabled: boolean): Promise<boolean> {
  try {
    const data = await apiFetch<{ twoFactorEnabled: boolean }>("/auth/security/two-factor", {
      method: "PATCH",
      body: { enabled },
    });
    return data.twoFactorEnabled;
  } catch (err) {
    fail(err);
  }
}

export async function endSession(id: string): Promise<void> {
  try {
    await apiFetch(`/auth/security/sessions/${id}`, {
      method: "DELETE",
      headers: sessionHeaders(),
    });
  } catch (err) {
    fail(err);
  }
}

export async function endAllOtherSessions(): Promise<LoginSession[]> {
  try {
    const data = await apiFetch<{ sessions: LoginSession[] }>("/auth/security/sessions/others", {
      method: "DELETE",
      headers: sessionHeaders(),
    });
    return data.sessions ?? [];
  } catch (err) {
    fail(err);
  }
}
