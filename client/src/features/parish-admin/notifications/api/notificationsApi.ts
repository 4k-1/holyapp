import { MOCK_NOTIFICATIONS } from "@/services/mocks/notifications.mock";
import { delay } from "@/services/delay";
import type { ParishNotification } from "@/features/parish-admin/notifications/types";

function byUnreadThenNewest(a: ParishNotification, b: ParishNotification) {
  if (a.read !== b.read) return a.read ? 1 : -1;
  return a.createdAt < b.createdAt ? 1 : -1;
}

export async function listNotifications(parishId: string): Promise<ParishNotification[]> {
  await delay(180);
  return MOCK_NOTIFICATIONS.filter((n) => n.parishId === parishId).slice().sort(byUnreadThenNewest);
}

export async function getUnreadNotificationCount(parishId: string): Promise<number> {
  await delay(80);
  return MOCK_NOTIFICATIONS.filter((n) => n.parishId === parishId && !n.read).length;
}

export async function markNotificationRead(
  parishId: string,
  notificationId: string
): Promise<ParishNotification> {
  await delay(120);
  const notification = MOCK_NOTIFICATIONS.find(
    (n) => n.id === notificationId && n.parishId === parishId
  );
  if (!notification) throw new Error(`Notification ${notificationId} not found`);
  notification.read = true;
  return { ...notification };
}

export async function markAllNotificationsRead(parishId: string): Promise<void> {
  await delay(200);
  MOCK_NOTIFICATIONS.forEach((n) => {
    if (n.parishId === parishId) n.read = true;
  });
}
