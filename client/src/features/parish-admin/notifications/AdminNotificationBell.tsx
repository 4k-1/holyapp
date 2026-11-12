import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  listNotifications,
  markNotificationRead,
} from "@/features/parish-admin/notifications/api/notificationsApi";
import {
  formatNotificationTime,
  notificationTargetPath,
} from "@/features/parish-admin/notifications/notificationsHelpers";
import type { ParishNotification } from "@/features/parish-admin/notifications/types";
import { BellIcon } from "@/components/ui/icons/AdminIcons";
import type { Parish } from "@/types";
import { SkeletonList } from "@/components/ui/Skeleton";

const RECENT_LIMIT = 5;

export function AdminNotificationBell({
  parish,
  unreadCount,
  onUnreadChange,
}: {
  parish: Parish;
  unreadCount: number;
  onUnreadChange?: () => void;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<ParishNotification[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  // Opening the menu (or switching parish while open) shows the loading state right away.
  const [fetchedFor, setFetchedFor] = useState({ open, parishId: parish.id });
  if (fetchedFor.open !== open || fetchedFor.parishId !== parish.id) {
    setFetchedFor({ open, parishId: parish.id });
    if (open) setLoading(true);
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listNotifications(parish.id).then((all) => {
      if (cancelled) return;
      setRecent(all.slice(0, RECENT_LIMIT));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [open, parish.id]);

  useEffect(() => {
    if (!open) return;

    function handlePointer(e: MouseEvent) {
      if (rootRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  async function openNotification(notification: ParishNotification) {
    if (!notification.read) {
      await markNotificationRead(parish.id, notification.id);
      onUnreadChange?.();
    }
    setOpen(false);
    navigate(notificationTargetPath(parish.slug, notification.href));
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() =>
          setOpen((prev) => {
            if (!prev) {
              setLoading(true);
              setRecent([]);
            }
            return !prev;
          })
        }
        className={`relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-admin-surface-alt hover:text-admin-ink ${
          open ? "bg-admin-surface-alt text-admin-ink" : "text-admin-ink-muted"
        }`}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <BellIcon className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-admin-red-700" />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Recent notifications"
          className="absolute right-0 top-[calc(100%+8px)] z-[80] w-[360px] overflow-hidden rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_8px_28px_-6px_rgba(10,40,30,0.18)]"
        >
          <div className="flex items-center justify-between border-b border-admin-border px-4 py-2.5">
            <p className="text-admin-body font-semibold text-admin-ink">Notifications</p>
          </div>

          <div className="max-h-[min(420px,70vh)] overflow-y-auto">
            {loading && recent.length === 0 ? (
              <SkeletonList rows={3} className="px-4" />
            ) : recent.length === 0 ? (
              <p className="px-4 py-6 text-admin-support text-admin-ink-muted">No notifications yet.</p>
            ) : (
              <NotificationGroups
                notifications={recent}
                onOpen={openNotification}
              />
            )}
          </div>

          <div className="border-t border-admin-border px-4 py-2.5">
            <Link
              to={`/${parish.slug}/admin/notifications`}
              onClick={() => setOpen(false)}
              className="text-admin-support font-semibold text-admin-green-700 hover:underline"
            >
              See all notifications
            </Link>
          </div>
        </div>
      )}
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
          <p className="px-4 pb-1 pt-2.5 text-admin-label font-semibold uppercase tracking-admin-label text-admin-green-700">
            New
          </p>
          <ul>
            {unread.map((notification, i) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                last={i === unread.length - 1 && earlier.length === 0}
                onOpen={onOpen}
              />
            ))}
          </ul>
        </section>
      )}
      {earlier.length > 0 && (
        <section>
          <p className="px-4 pb-1 pt-2.5 text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">
            Earlier
          </p>
          <ul>
            {earlier.map((notification, i) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                last={i === earlier.length - 1}
                onOpen={onOpen}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function NotificationRow({
  notification,
  last,
  onOpen,
}: {
  notification: ParishNotification;
  last: boolean;
  onOpen: (notification: ParishNotification) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(notification)}
        className={`flex w-full items-start gap-2.5 px-4 py-3 text-left hover:bg-admin-green-050/60 ${
          last ? "" : "border-b border-admin-border"
        } ${notification.read ? "bg-admin-surface" : "bg-admin-green-050/35"}`}
      >
        <span
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
            notification.read ? "bg-admin-border-strong" : "bg-admin-green-700"
          }`}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-admin-support ${
              notification.read ? "font-medium text-admin-ink" : "font-semibold text-admin-ink"
            }`}
          >
            {notification.title}
          </span>
          <span className="mt-0.5 block truncate text-admin-label text-admin-ink-muted">
            {formatNotificationTime(notification.createdAt)}
          </span>
        </span>
      </button>
    </li>
  );
}
