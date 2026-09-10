import { MOCK_NOTIFICATIONS } from "@/services/mocks/notifications.mock";
import { recordBelongsToParish } from "@/features/parish/parishApi";
import { delay } from "@/services/delay";
import type { ParishNotification } from "@/features/parish-admin/notifications/types";

function byUnreadThenNewest(a: ParishNotification, b: ParishNotification) {
  if (a.read !== b.read) return a.read ? 1 : -1;
  return a.createdAt < b.createdAt ? 1 : -1;
}

export async function listNotifications(parishId: string): Promise<ParishNotification[]> {
  await delay(180);
  const out: ParishNotification[] = [];
  for (const n of MOCK_NOTIFICATIONS) {
    if (await recordBelongsToParish(n.parishId, parishId)) out.push(n);
  }
  return out.slice().sort(byUnreadThenNewest);
}

export async function getUnreadNotificationCount(parishId: string): Promise<number> {
  await delay(80);
  let count = 0;
  for (const n of MOCK_NOTIFICATIONS) {
    if (!n.read && (await recordBelongsToParish(n.parishId, parishId))) count += 1;
  }
  return count;
}

export async function markNotificationRead(
  parishId: string,
  notificationId: string
): Promise<ParishNotification> {
  await delay(120);
  for (const n of MOCK_NOTIFICATIONS) {
    if (n.id === notificationId && (await recordBelongsToParish(n.parishId, parishId))) {
      n.read = true;
      return { ...n };
    }
  }
  throw new Error(`Notification ${notificationId} not found`);
}

export async function markAllNotificationsRead(parishId: string): Promise<void> {
  await delay(200);
  for (const n of MOCK_NOTIFICATIONS) {
    if (await recordBelongsToParish(n.parishId, parishId)) n.read = true;
  }
}
