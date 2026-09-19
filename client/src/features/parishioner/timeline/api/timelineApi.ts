import { apiFetch, ApiError } from "@/lib/api";
import type { SacramentType } from "@/types";

export interface TimelineEvent {
  id: string;
  sacramentType: SacramentType;
  date: string | null;
  title: string;
  place: string | null;
  parishName: string | null;
  bookNumber: number | string | null;
  pageNumber: number | string | null;
  entryNumber: number | string | null;
}

export async function listMyTimeline(): Promise<TimelineEvent[]> {
  try {
    const data = await apiFetch<{ events: TimelineEvent[] }>("/auth/me/timeline");
    return data.events ?? [];
  } catch (err) {
    if (err instanceof ApiError) throw new Error(err.message);
    throw new Error("Unable to reach the server.");
  }
}
