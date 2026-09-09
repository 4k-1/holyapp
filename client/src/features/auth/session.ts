import type { CurrentUser, Role, UserStatus } from "@/types";

const ACCESS_TOKEN_KEY = "holyapp-access-token";
const REFRESH_TOKEN_KEY = "holyapp-refresh-token";
export const USER_STORAGE_KEY = "holyapp-mock-user";

/** Backend login/refresh user payload (snake_case). */
export interface BackendAuthUser {
  id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  email: string;
  role: Role;
  parish_id: string | null;
}

export interface BackendAuthResponse {
  token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: BackendAuthUser;
}

export function mapBackendUser(user: BackendAuthUser, status: UserStatus = "active"): CurrentUser {
  const firstName = user.first_name ?? undefined;
  const middleName = user.middle_name ?? undefined;
  const lastName = user.last_name ?? undefined;
  const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ") || user.email;

  return {
    id: user.id,
    parishId: user.parish_id,
    role: user.role,
    status,
    fullName,
    email: user.email,
    firstName,
    middleName,
    lastName,
  };
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setSession(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}
