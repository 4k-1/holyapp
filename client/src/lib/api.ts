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
  /** Sent as-is instead of JSON (e.g. an image File). Set the Content-Type header yourself. */
  rawBody?: BodyInit;
  /** When false, skip attaching the access token (login/logout/refresh). Default true. */
  auth?: boolean;
  /** Internal: read the response as a Blob instead of JSON. */
  _blob?: boolean;
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

/** Fired with the number of requests still on their way, for the loading bar at the top. */
export const API_ACTIVITY_EVENT = "holyapp-api-activity";
let inFlight = 0;

function reportActivity(change: number) {
  inFlight += change;
  window.dispatchEvent(new CustomEvent<number>(API_ACTIVITY_EVENT, { detail: inFlight }));
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  reportActivity(1);
  try {
    return await request<T>(path, options);
  } finally {
    reportActivity(-1);
  }
}

/** Fetches a file the API serves (e.g. a scanned page) with the signed-in user's token. */
export async function apiFetchBlob(path: string, options: ApiFetchOptions = {}): Promise<Blob> {
  reportActivity(1);
  try {
    return await request<Blob>(path, { ...options, _blob: true });
  } finally {
    reportActivity(-1);
  }
}

async function request<T>(path: string, options: ApiFetchOptions): Promise<T> {
  if (!API_URL) {
    throw new ApiError("VITE_API_URL is not configured.", 500);
  }

  const { body, rawBody, headers, auth = true, _retried = false, _blob = false, ...rest } = options;
  const accessToken = auth ? getAccessToken() : null;

  const response = await fetch(`${API_URL}${path.startsWith("/") ? path : `/${path}`}`, {
    ...rest,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: rawBody ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });

  if (_blob && response.ok) return (await response.blob()) as T;

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
        return request<T>(path, { ...options, _retried: true });
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
