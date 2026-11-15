import type { CurrentUser, Role } from "@/types";
import { apiFetch, ApiError, refreshAccessToken } from "@/lib/api";
import {
  clearSession,
  getAccessToken,
  getDeviceId,
  getRefreshToken,
  mapBackendUser,
  setSession,
  USER_STORAGE_KEY,
  type BackendAuthResponse,
  type BackendAuthUser,
} from "@/features/auth/session";

/**
 * Auth hits the backend for login, logout, refresh, register/verify, session, and profile updates.
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
  window.dispatchEvent(new Event("holyapp-user-updated"));
}

export class TwoFactorChallenge extends Error {
  challengeId: string;
  email: string;
  /** Test mode only (super admin, mocked delivery): the code, since no email is sent. */
  mockCode?: string;

  constructor(challengeId: string, email: string, mockCode?: string) {
    super("Enter the code sent to your email.");
    this.name = "TwoFactorChallenge";
    this.challengeId = challengeId;
    this.email = email;
    this.mockCode = mockCode;
  }
}

type LoginResponse = BackendAuthResponse & {
  two_factor_required?: boolean;
  challenge_id?: string;
  email?: string;
  mock_code?: string;
};

function applySession(data: BackendAuthResponse): CurrentUser {
  const user = mapBackendUser(data.user);
  setSession(data.token, data.refresh_token);
  setCurrentUser(user);
  return user;
}

function loginBody(email: string, password: string) {
  return { email, password, device_id: getDeviceId() };
}

export async function login(email: string, password: string): Promise<CurrentUser> {
  let data: LoginResponse;
  try {
    data = await apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: loginBody(email, password),
      auth: false,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) throw new Error("Invalid email or password.", { cause: err });
      if (err.status === 403) {
        throw new Error("This account has been suspended. Contact the parish office.", { cause: err });
      }
      throw new Error(err.message, { cause: err });
    }
    throw new Error("Unable to reach the server. Is the backend running?", { cause: err });
  }

  if (data.two_factor_required && data.challenge_id) {
    throw new TwoFactorChallenge(data.challenge_id, data.email || email);
  }

  if (data.user.role === "super_admin") {
    throw new Error("This account uses the platform sign-in, not the parish portal.");
  }

  return applySession(data);
}

export async function loginSuperAdmin(email: string, password: string): Promise<CurrentUser> {
  let data: LoginResponse;
  try {
    data = await apiFetch<LoginResponse>("/auth/login/super-admin", {
      method: "POST",
      body: loginBody(email, password),
      auth: false,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) throw new Error("Invalid email or password.", { cause: err });
      throw new Error(err.message, { cause: err });
    }
    throw new Error("Unable to reach the server. Is the backend running?", { cause: err });
  }

  if (data.two_factor_required && data.challenge_id) {
    throw new TwoFactorChallenge(data.challenge_id, data.email || email, data.mock_code);
  }

  if (data.user.role !== "super_admin") {
    throw new Error("This account belongs to a parish. Sign in through your parish portal.");
  }

  return applySession(data);
}

export async function verifyLoginTwoFactor(challengeId: string, code: string): Promise<CurrentUser> {
  try {
    const data = await apiFetch<BackendAuthResponse>("/auth/login/2fa", {
      method: "POST",
      body: { challenge_id: challengeId, code, device_id: getDeviceId() },
      auth: false,
    });
    return applySession(data);
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.message, { cause: err });
    throw new Error("Unable to reach the server. Is the backend running?", { cause: err });
  }
}

export async function resendLoginTwoFactor(challengeId: string): Promise<string> {
  return (await resendLoginTwoFactorCode(challengeId)).challengeId;
}

/** Like resendLoginTwoFactor, plus the new test-mode code when delivery is mocked (super admin). */
export async function resendLoginTwoFactorCode(
  challengeId: string
): Promise<{ challengeId: string; mockCode?: string }> {
  try {
    const data = await apiFetch<{ challenge_id?: string; mock_code?: string }>("/auth/login/2fa/resend", {
      method: "POST",
      body: { challenge_id: challengeId, device_id: getDeviceId() },
      auth: false,
    });
    return { challengeId: data.challenge_id || challengeId, mockCode: data.mock_code };
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.message, { cause: err });
    throw new Error("Unable to reach the server. Is the backend running?", { cause: err });
  }
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  middleName?: string;
  birthday: string;
  /** Optional. */
  address?: string;
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
        address: input.address?.trim() || undefined,
        email: input.email.trim(),
        password: input.password,
        parishId: input.parishId,
      },
      auth: false,
    });
    pendingVerificationEmail = input.email.trim();
  } catch (err) {
    if (err instanceof ApiError) {
      throw new Error(err.message, { cause: err });
    }
    throw new Error("Unable to reach the server. Is the backend running?", { cause: err });
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
      throw new Error(err.message, { cause: err });
    }
    throw new Error("Unable to reach the server. Is the backend running?", { cause: err });
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
      throw new Error(err.message, { cause: err });
    }
    throw new Error("Unable to reach the server. Is the backend running?", { cause: err });
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

export async function fetchCurrentProfile(): Promise<CurrentUser> {
  try {
    const data = await apiFetch<{ user: BackendAuthUser }>("/auth/me");
    const user = mapBackendUser(data.user);
    setCurrentUser(user);
    return user;
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.message, { cause: err });
    throw new Error("Unable to reach the server. Is the backend running?", { cause: err });
  }
}

export interface UpdateProfileInput {
  firstName: string;
  lastName: string;
  middleName?: string;
  birthday: string;
  email: string;
  address: string;
  contactNumber?: string;
}

export async function updateProfile(input: UpdateProfileInput): Promise<CurrentUser> {
  if (!getCurrentUser()) throw new Error("Not logged in.");
  try {
    const data = await apiFetch<{ user: BackendAuthUser }>("/auth/me", {
      method: "PATCH",
      body: {
        firstName: input.firstName,
        lastName: input.lastName,
        middleName: input.middleName ?? "",
        birthday: input.birthday,
        email: input.email,
        address: input.address,
        contactNumber: input.contactNumber ?? "",
      },
    });
    const updated = mapBackendUser(data.user);
    setCurrentUser(updated);
    return updated;
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.message, { cause: err });
    throw new Error("Unable to reach the server. Is the backend running?", { cause: err });
  }
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
      throw new Error(err.message, { cause: err });
    }
    throw new Error("Unable to reach the server. Is the backend running?", { cause: err });
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
      throw new Error(err.message, { cause: err });
    }
    throw new Error("Unable to reach the server. Is the backend running?", { cause: err });
  }
}
