import type { NotificationKind } from "@/features/parish-admin/notifications/types";

export function notificationTargetPath(parishSlug: string, href: string) {
  return `/${parishSlug}/admin/${href}`;
}

export const NOTIFICATION_KIND_LABEL: Record<NotificationKind, string> = {
  request: "Request",
  payment: "Payment",
  schedule: "Schedule",
  intention: "Mass intention",
  donation: "Donation",
};

export function formatNotificationTime(iso: string, now = new Date()) {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return iso;

  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;

  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfThen = new Date(then.getFullYear(), then.getMonth(), then.getDate());
  const dayDiff = Math.round((startOfToday.getTime() - startOfThen.getTime()) / 86400000);
  if (dayDiff === 1) return "Yesterday";
  if (dayDiff < 7) return `${dayDiff} days ago`;

  return then.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
