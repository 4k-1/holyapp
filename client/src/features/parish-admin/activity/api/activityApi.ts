import { apiFetch, ApiError } from "@/lib/api";
import type { AuditLogEntry } from "@/types";

export type ActivityKind = "green" | "yellow" | "red";
export type ActivityArea =
  | "registers"
  | "certificates"
  | "donations"
  | "intentions"
  | "schedule"
  | "marriage"
  | "accounts";

export interface ActivityFilters {
  beforeId?: string;
  actorId?: string;
  area?: ActivityArea;
  kind?: ActivityKind;
}

/** The parish's own activity, newest first, 100 at a time. Parish admins only. */
export async function listParishActivity(
  filters: ActivityFilters = {}
): Promise<{ entries: AuditLogEntry[]; hasMore: boolean }> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  const query = params.toString();
  try {
    const data = await apiFetch<{ entries: AuditLogEntry[]; hasMore?: boolean }>(
      `/audit/parish${query ? `?${query}` : ""}`
    );
    return { entries: data.entries ?? [], hasMore: Boolean(data.hasMore) };
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.message, { cause: err });
    throw new Error("Unable to reach the server.", { cause: err });
  }
}
