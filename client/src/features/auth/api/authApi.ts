import type { CurrentUser, Role } from "@/types";
import { apiFetch, ApiError, refreshAccessToken } from "@/lib/api";
import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  mapBackendUser,
  setSession,
  USER_STORAGE_KEY,
  type BackendAuthResponse,
} from "@/features/auth/session";

/**
 * Auth is partially real: login, logout, refresh, register/verify, and session validation hit the backend.
 * Profile update flows are still mocked.
 * Guards remain UX-only — the backend must enforce roles on every request.
 */

export function getCurrentUser(): CurrentUser | null {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    const user = JSON.parse(raw) as CurrentUser;
    if (!user.status) user.status = "active";
    return user;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: CurrentUser | null) {
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
}

export async function login(email: string, password: string): Promise<CurrentUser> {
  let data: BackendAuthResponse;
  try {
    data = await apiFetch<BackendAuthResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) throw new Error("Invalid email or password.");
      if (err.status === 403) {
        throw new Error("This account has been suspended. Contact the parish office.");
      }
      throw new Error(err.message);
    }
    throw new Error("Unable to reach the server. Is the backend running?");
  }

  if (data.user.role === "super_admin") {
    throw new Error("This account uses the platform sign-in, not the parish portal.");
  }

  const user = mapBackendUser(data.user);
  setSession(data.token, data.refresh_token);
  setCurrentUser(user);
  return user;
}

export async function loginSuperAdmin(email: string, password: string): Promise<CurrentUser> {
  let data: BackendAuthResponse;
  try {
    data = await apiFetch<BackendAuthResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) throw new Error("Invalid email or password.");
      if (err.status === 403) {
        throw new Error("This platform account has been suspended.");
      }
      throw new Error(err.message);
    }
    throw new Error("Unable to reach the server. Is the backend running?");
  }

  if (data.user.role !== "super_admin") {
    throw new Error("This account belongs to a parish. Sign in through your parish portal.");
  }

  const user = mapBackendUser(data.user);
  setSession(data.token, data.refresh_token);
  setCurrentUser(user);
  return user;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  middleName?: string;
  birthday: string;
  address: string;
  email: string;
  password: string;
  parishId: string;
}

/** Email waiting on OTP verify after startRegistration. */
let pendingVerificationEmail: string | null = null;

export async function startRegistration(input: RegisterInput): Promise<void> {
  try {
    await apiFetch<{ ok: boolean; email: string }>("/auth/register", {
      method: "POST",
      body: {
        firstName: input.firstName,
        lastName: input.lastName,
        middleName: input.middleName,
        birthday: input.birthday,
        address: input.address,
        email: input.email.trim(),
        password: input.password,
        parishId: input.parishId,
      },
      auth: false,
    });
    pendingVerificationEmail = input.email.trim();
  } catch (err) {
    if (err instanceof ApiError) {
      throw new Error(err.message);
    }
    throw new Error("Unable to reach the server. Is the backend running?");
  }
}

export async function verifyRegistrationCode(code: string): Promise<CurrentUser> {
  if (!pendingVerificationEmail) {
    throw new Error("No pending registration found. Please register again.");
  }

  try {
    const data = await apiFetch<BackendAuthResponse>("/auth/verify-email", {
      method: "POST",
      body: { email: pendingVerificationEmail, code: code.trim() },
      auth: false,
    });
    const user = mapBackendUser(data.user);
    setSession(data.token, data.refresh_token);
    setCurrentUser(user);
    pendingVerificationEmail = null;
    return user;
  } catch (err) {
    if (err instanceof ApiError) {
      throw new Error(err.message);
    }
    throw new Error("Unable to reach the server. Is the backend running?");
  }
}

export async function resendVerificationCode(): Promise<void> {
  if (!pendingVerificationEmail) return;
  try {
    await apiFetch("/auth/resend-verification", {
      method: "POST",
      body: { email: pendingVerificationEmail },
      auth: false,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      throw new Error(err.message);
    }
    throw new Error("Unable to reach the server. Is the backend running?");
  }
}

export async function logout() {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) {
      await apiFetch("/auth/logout", {
        method: "POST",
        body: { refresh_token: refreshToken },
        auth: false,
      });
    }
  } catch {
    // Always clear local session even if revoke fails (offline / expired token).
  } finally {
    clearSession();
    setCurrentUser(null);
  }
}

/** JWT payload returned by GET /rbac/me (not a full profile). */
type RbacMeUser = {
  id: string;
  parish_id: string | null;
  role: Role;
};

/**
 * Confirm the access token with the backend. Clears local session on 401.
 * If the access token expired, apiFetch refreshes via /auth/refresh and retries.
 * Keeps the stored profile snapshot; syncs id/role/parishId from the token.
 */
export async function validateSession(): Promise<CurrentUser | null> {
  if (!getAccessToken()) {
    if (getRefreshToken()) {
      const refreshed = await refreshAccessToken();
      if (!refreshed) return null;
    } else {
      if (getCurrentUser()) setCurrentUser(null);
      return null;
    }
  }

  try {
    const data = await apiFetch<{ user: RbacMeUser }>("/rbac/me");
    const current = getCurrentUser();
    if (current && current.id === data.user.id) {
      const synced: CurrentUser = {
        ...current,
        parishId: data.user.parish_id,
        role: data.user.role,
      };
      setCurrentUser(synced);
      return synced;
    }

    // Token valid but no matching snapshot — keep a minimal user until full profile exists.
    const minimal: CurrentUser = {
      id: data.user.id,
      parishId: data.user.parish_id,
      role: data.user.role,
      status: "active",
      fullName: current?.fullName ?? "",
      email: current?.email ?? "",
      firstName: current?.firstName,
      middleName: current?.middleName,
      lastName: current?.lastName,
    };
    setCurrentUser(minimal);
    return minimal;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      clearSession();
      setCurrentUser(null);
      return null;
    }
    // Network / server hiccup: keep local snapshot so the UI still works offline briefly.
    return getCurrentUser();
  }
}

export interface UpdateProfileInput {
  firstName: string;
  lastName: string;
  middleName?: string;
  birthday: string;
  email: string;
  address: string;
}

export async function updateProfile(input: UpdateProfileInput): Promise<CurrentUser> {
  await new Promise((r) => setTimeout(r, 400));

  const current = getCurrentUser();
  if (!current) throw new Error("Not logged in.");

  const fullName = [input.firstName, input.middleName, input.lastName].filter(Boolean).join(" ");

  const updated: CurrentUser = {
    ...current,
    firstName: input.firstName,
    lastName: input.lastName,
    middleName: input.middleName,
    birthday: input.birthday,
    email: input.email,
    address: input.address,
    fullName,
  };

  setCurrentUser(updated);
  return updated;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const trimmed = email.trim();
  if (!trimmed) throw new Error("Email is required.");
  try {
    await apiFetch("/auth/forgot-password", {
      method: "POST",
      body: { email: trimmed },
      auth: false,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      throw new Error(err.message);
    }
    throw new Error("Unable to reach the server. Is the backend running?");
  }
}

/** Logged-in users: send reset email to the current account. */
export async function sendPasswordResetEmail(): Promise<void> {
  const current = getCurrentUser();
  if (!current?.email) throw new Error("Not logged in.");
  await requestPasswordReset(current.email);
}

export async function resetPassword(token: string, password: string): Promise<void> {
  if (!token) throw new Error("This reset link is invalid or has expired.");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");
  try {
    await apiFetch("/auth/reset-password", {
      method: "POST",
      body: { token, password },
      auth: false,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      throw new Error(err.message);
    }
    throw new Error("Unable to reach the server. Is the backend running?");
  }
}

export async function deleteAccount(): Promise<void> {
  await new Promise((r) => setTimeout(r, 500));
  clearSession();
  setCurrentUser(null);
}