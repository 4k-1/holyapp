import {
  clearSession,
  getAccessToken,
  getRefreshToken,
  mapBackendUser,
  setSession,
  USER_STORAGE_KEY,
  type BackendAuthResponse,
} from "@/features/auth/session";

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type ApiFetchOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  /** When false, skip attaching the access token (login/logout/refresh). Default true. */
  auth?: boolean;
  /** Internal: set after one refresh+retry so we don't loop. */
  _retried?: boolean;
};

let refreshInflight: Promise<boolean> | null = null;

function clearLocalAuth() {
  clearSession();
  localStorage.removeItem(USER_STORAGE_KEY);
}

/** Exchange refresh_token for a new access/refresh pair. Shared so parallel 401s wait on one refresh. */
export async function refreshAccessToken(): Promise<boolean> {
  if (refreshInflight) return refreshInflight;

  refreshInflight = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken || !API_URL) {
      clearLocalAuth();
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        clearLocalAuth();
        return false;
      }

      const data = (await response.json()) as BackendAuthResponse;
      setSession(data.token, data.refresh_token);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mapBackendUser(data.user)));
      return true;
    } catch {
      return false;
    }
  })().finally(() => {
    refreshInflight = null;
  });

  return refreshInflight;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  if (!API_URL) {
    throw new ApiError("VITE_API_URL is not configured.", 500);
  }

  const { body, headers, auth = true, _retried = false, ...rest } = options;
  const accessToken = auth ? getAccessToken() : null;

  const response = await fetch(`${API_URL}${path.startsWith("/") ? path : `/${path}`}`, {
    ...rest,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let payload: unknown = null;
  const text = await response.text();
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = { error: text };
    }
  }

  if (!response.ok) {
    if (response.status === 401 && auth && !_retried) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        return apiFetch<T>(path, { ...options, _retried: true });
      }
    }

    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof (payload as { error: unknown }).error === "string"
        ? (payload as { error: string }).error
        : `Request failed (${response.status})`;
    throw new ApiError(message, response.status);
  }

  return payload as T;
}
