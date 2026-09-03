import { useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/parish-admin/notifications/api/notificationsApi";
import {
  formatNotificationTime,
  NOTIFICATION_KIND_LABEL,
  notificationTargetPath,
} from "@/features/parish-admin/notifications/notificationsHelpers";
import type { NotificationKind, ParishNotification } from "@/features/parish-admin/notifications/types";
import { useAsync } from "@/hooks/useAsync";
import type { Parish } from "@/types";

type Filter = "all" | "unread";

const KIND_TONE: Record<NotificationKind, "amber" | "green" | "gold" | "muted"> = {
  request: "amber",
  payment: "green",
  schedule: "gold",
  intention: "muted",
  donation: "green",
};

export function AdminNotificationsPage() {
  const { parish, refetchUnreadNotifications } = useOutletContext<{
    parish: Parish;
    refetchUnreadNotifications?: () => void;
  }>();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("unread");
  const [markingAll, setMarkingAll] = useState(false);

  const { data: notifications = [], loading, refetch } = useAsync(
    () => listNotifications(parish.id),
    [parish.id]
  );

  const unreadCount = notifications.filter((n) => !n.read).length;
  const visible = useMemo(
    () => (filter === "unread" ? notifications.filter((n) => !n.read) : notifications),
    [filter, notifications]
  );

  async function openNotification(notification: ParishNotification) {
    if (!notification.read) {
      await markNotificationRead(parish.id, notification.id);
      refetch();
      refetchUnreadNotifications?.();
    }
    navigate(notificationTargetPath(parish.slug, notification.href));
  }

  async function markAllRead() {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsRead(parish.id);
      refetch();
      refetchUnreadNotifications?.();
    } finally {
      setMarkingAll(false);
    }
  }

  return (
    <div>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="mb-1 text-admin-page font-semibold text-admin-ink">Notifications</h1>
          <p className="text-admin-body text-admin-ink-muted">
            Requests, schedule, and parish activity that need the office’s eye.
          </p>
        </div>
        <AdminButton variant="secondary" onClick={markAllRead} disabled={unreadCount === 0 || markingAll}>
          {markingAll ? "Marking…" : "Mark all as read"}
        </AdminButton>
      </div>

      <div className="mb-4 flex gap-1.5">
        <FilterTab
          label="Unread"
          count={unreadCount}
          active={filter === "unread"}
          onClick={() => setFilter("unread")}
        />
        <FilterTab
          label="All"
          count={notifications.length}
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />
      </div>

      <AdminCard className="overflow-hidden">
        {loading && notifications.length === 0 ? (
          <p className="px-5 py-8 text-admin-body text-admin-ink-muted">Loading notifications…</p>
        ) : visible.length === 0 ? (
          <p className="px-5 py-8 text-admin-body text-admin-ink-muted">
            {filter === "unread"
              ? "Nothing unread. New requests and schedule reminders will appear here."
              : "No notifications yet for this parish."}
          </p>
        ) : filter === "unread" ? (
          <NotificationList notifications={visible} onOpen={openNotification} />
        ) : (
          <NotificationGroups notifications={visible} onOpen={openNotification} />
        )}
      </AdminCard>
    </div>
  );
}

function NotificationGroups({
  notifications,
  onOpen,
}: {
  notifications: ParishNotification[];
  onOpen: (notification: ParishNotification) => void;
}) {
  const unread = notifications.filter((n) => !n.read);
  const earlier = notifications.filter((n) => n.read);

  return (
    <div>
      {unread.length > 0 && (
        <section>
          <p className="px-5 pb-1 pt-3 text-admin-label font-semibold uppercase tracking-admin-label text-admin-green-700">
            New
          </p>
          <NotificationList
            notifications={unread}
            onOpen={onOpen}
            bordered={earlier.length > 0}
          />
        </section>
      )}
      {earlier.length > 0 && (
        <section>
          <p className="px-5 pb-1 pt-3 text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">
            Earlier
          </p>
          <NotificationList notifications={earlier} onOpen={onOpen} />
        </section>
      )}
    </div>
  );
}

function NotificationList({
  notifications,
  onOpen,
  bordered = false,
}: {
  notifications: ParishNotification[];
  onOpen: (notification: ParishNotification) => void;
  bordered?: boolean;
}) {
  return (
    <ul className={bordered ? "border-b border-admin-border" : undefined}>
      {notifications.map((notification, i) => (
        <li key={notification.id}>
          <button
            type="button"
            onClick={() => onOpen(notification)}
            className={`flex w-full items-start gap-3.5 px-5 py-4 text-left transition-colors hover:bg-admin-green-050/60 ${
              i < notifications.length - 1 ? "border-b border-admin-border" : ""
            } ${notification.read ? "bg-admin-surface" : "bg-admin-green-050/40"}`}
          >
            <span
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                notification.read ? "bg-admin-border-strong" : "bg-admin-green-700"
              }`}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">
              <span className="mb-1 flex flex-wrap items-center gap-2">
                <AdminBadge tone={KIND_TONE[notification.kind]}>
                  {NOTIFICATION_KIND_LABEL[notification.kind]}
                </AdminBadge>
                <time className="text-admin-label text-admin-ink-muted">
                  {formatNotificationTime(notification.createdAt)}
                </time>
              </span>
              <span
                className={`block text-admin-body ${
                  notification.read ? "font-medium text-admin-ink" : "font-semibold text-admin-ink"
                }`}
              >
                {notification.title}
              </span>
              <span className="mt-0.5 block text-admin-support leading-relaxed text-admin-ink-muted">
                {notification.body}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function FilterTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-admin-support font-semibold transition-colors ${
        active
          ? "border-admin-green-700/30 bg-admin-green-100 text-admin-green-900"
          : "border-admin-border bg-admin-surface text-admin-ink-muted hover:bg-admin-surface-alt hover:text-admin-ink"
      }`}
    >
      {label}
      <span className="ml-1.5 font-mono">{count}</span>
    </button>
  );
}
