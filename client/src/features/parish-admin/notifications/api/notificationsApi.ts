import { apiFetch } from "@/lib/api";
import type { ParishNotification } from "@/features/parish-admin/notifications/types";

function byUnreadThenNewest(a: ParishNotification, b: ParishNotification) {
  if (a.read !== b.read) return a.read ? 1 : -1;
  return a.createdAt < b.createdAt ? 1 : -1;
}

export async function listNotifications(_parishId: string): Promise<ParishNotification[]> {
  const data = await apiFetch<{ notifications: ParishNotification[] }>("/notifications");
  return (data.notifications ?? []).slice().sort(byUnreadThenNewest);
}

export async function getUnreadNotificationCount(_parishId: string): Promise<number> {
  const data = await apiFetch<{ count: number }>("/notifications/unread-count");
  return data.count ?? 0;
}

export async function markNotificationRead(
  _parishId: string,
  notificationId: string
): Promise<ParishNotification> {
  const data = await apiFetch<{ notification: ParishNotification }>(
    `/notifications/${encodeURIComponent(notificationId)}/read`,
    { method: "PATCH" }
  );
  return data.notification;
}

export async function markAllNotificationsRead(_parishId: string): Promise<void> {
  await apiFetch("/notifications/read-all", { method: "PATCH" });
}
