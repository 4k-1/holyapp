function apiBaseUrl() {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;

  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
  if (host && host !== "localhost" && host !== "127.0.0.1") {
    return `http://${host}:5000`;
  }

  return "http://localhost:5000";
}

const API_URL = apiBaseUrl();

const ACCESS_KEY = "holyapp-access-token";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAccessToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = (await response.json().catch(() => ({}))) as { error?: string };

  if (!response.ok) {
    throw new ApiError(data.error || "Request failed.", response.status);
  }

  return data as T;
}
