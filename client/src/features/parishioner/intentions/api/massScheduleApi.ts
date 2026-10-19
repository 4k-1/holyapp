import { apiFetch } from "@/lib/api";
import type { MassScheduleEntry } from "@/types";

export async function listMassSchedule(): Promise<MassScheduleEntry[]> {
  const data = await apiFetch<{ schedule: MassScheduleEntry[] }>("/schedule/mass-times");
  return data.schedule ?? [];
}

export async function listMassTimesForDate(date: string): Promise<{ times: string[]; label: string }> {
  const data = await apiFetch<{ times?: string[]; label?: string }>(
    `/schedule/mass-times?date=${encodeURIComponent(date)}`
  );
  return { times: data.times ?? [], label: data.label ?? "" };
}
