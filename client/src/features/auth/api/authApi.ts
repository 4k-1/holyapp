import type { CurrentUser } from "@/types";
import { apiFetch } from "@/services/http";

const USER_KEY = "holyapp-user";
const ACCESS_KEY = "holyapp-access-token";
const REFRESH_KEY = "holyapp-refresh-token";
const LEGACY_MOCK_KEY = "holyapp-mock-user";

type AuthUserPayload = {
  id: string;
  parish_id: string | null;
  role: CurrentUser["role"];
  status: CurrentUser["status"];
  full_name?: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  middle_name?: string | null;
  contact_number?: string | null;
  email_verified_at?: string | null;
  created_at?: string | null;
  birthday?: string | null;
  address?: string | null;
};

type SessionResponse = {
  token: string;
  refresh_token: string;
  user: AuthUserPayload;
};

let pendingEmail: string | null = null;

function toCurrentUser(user: AuthUserPayload): CurrentUser {
  const firstName = user.first_name || undefined;
  const lastName = user.last_name || undefined;
  const middleName = user.middle_name || undefined;
  const fullName =
    user.full_name ||
    [firstName, middleName, lastName].filter(Boolean).join(" ");

  return {
    id: user.id,
    parishId: user.parish_id,
    role: user.role,
    status: user.status || "active",
    fullName,
    email: user.email,
    firstName,
    lastName,
    middleName,
    contactNumber: user.contact_number || undefined,
    emailVerifiedAt: user.email_verified_at || undefined,
    createdAt: user.created_at || undefined,
    birthday: user.birthday || undefined,
    address: user.address || undefined,
  };
}

function persistSession(payload: SessionResponse): CurrentUser {
  const user = toCurrentUser(payload.user);
  localStorage.setItem(ACCESS_KEY, payload.token);
  localStorage.setItem(REFRESH_KEY, payload.refresh_token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.removeItem(LEGACY_MOCK_KEY);
  return user;
}

function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(LEGACY_MOCK_KEY);
}

export function getCurrentUser(): CurrentUser | null {
  const token = localStorage.getItem(ACCESS_KEY);
  const raw = localStorage.getItem(USER_KEY);
  if (!token || !raw) {
    return null;
  }
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
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    clearSession();
  }
}

export async function login(email: string, password: string): Promise<CurrentUser> {
  const payload = await apiFetch<SessionResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return persistSession(payload);
}

export async function loginSuperAdmin(email: string, password: string): Promise<CurrentUser> {
  const payload = await apiFetch<SessionResponse>("/auth/login/super-admin", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return persistSession(payload);
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

export async function startRegistration(input: RegisterInput): Promise<void> {
  await apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
  pendingEmail = input.email;
}

export async function verifyRegistrationCode(code: string): Promise<CurrentUser> {
  if (!pendingEmail) {
    throw new Error("No pending registration found. Please register again.");
  }

  const payload = await apiFetch<SessionResponse>("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ email: pendingEmail, code }),
  });
  pendingEmail = null;
  return persistSession(payload);
}

export function resendVerificationCode(): void {
  if (!pendingEmail) return;
  void apiFetch("/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email: pendingEmail }),
  }).catch(() => {});
}

export function logout() {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  clearSession();
  if (!refreshToken) return;
  void apiFetch("/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  }).catch(() => {});
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

export async function sendPasswordResetEmail(): Promise<void> {
  const current = getCurrentUser();
  const email = current?.email;
  if (!email) throw new Error("Not logged in.");

  await apiFetch("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await apiFetch("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

export async function deleteAccount(): Promise<void> {
  clearSession();
}
