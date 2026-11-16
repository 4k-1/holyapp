import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { listNotifications, markNotificationRead } from "@/features/parish-admin/notifications/api/notificationsApi";
import { formatNotificationTime } from "@/features/parish-admin/notifications/notificationsHelpers";
import type { ParishNotification } from "@/features/parish-admin/notifications/types";
import { BellIcon } from "@/components/ui/icons/AdminIcons";
import type { Parish } from "@/types";
import { portalPath, useUnreadNotificationCount } from "./usePortalNotifications";

const RECENT_LIMIT = 5;

/** The bell in the portal's top bar: a dot and count for unread updates, and the latest few in a menu. */
export function PortalNotificationBell({ parish }: { parish: Parish }) {
  const navigate = useNavigate();
  const { count, refresh } = useUnreadNotificationCount(parish.id);
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<ParishNotification[] | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listNotifications(parish.id)
      .then((all) => {
        if (!cancelled) setRecent(all.slice(0, RECENT_LIMIT));
      })
      .catch(() => {
        if (!cancelled) setRecent([]);
      });

    function onPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, parish.id]);

  async function openOne(notification: ParishNotification) {
    setOpen(false);
    if (!notification.read) {
      await markNotificationRead(parish.id, notification.id).catch(() => undefined);
      refresh();
    }
    navigate(portalPath(parish.slug, notification.href));
  }

  const label = count > 0 ? `Notifications, ${count} unread` : "Notifications";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          if (!open) setRecent(null);
          setOpen((v) => !v);
        }}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`relative flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors hover:bg-white/15 ${
          open ? "bg-white/15" : ""
        }`}
      >
        <BellIcon className="h-[19px] w-[19px]" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#eeb531] px-1 text-[10.5px] font-bold leading-none text-[#0e3b46] ring-2 ring-primary">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Recent notifications"
          className="fixed inset-x-3 top-[72px] z-[80] overflow-hidden rounded-2xl border border-border bg-surface text-ink shadow-[0_12px_32px_rgba(14,59,70,0.2)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+10px)] sm:w-[380px]"
        >
          <p className="border-b border-border px-4 py-3 text-sm font-semibold">Notifications</p>
          <div className="max-h-[min(440px,65vh)] overflow-y-auto">
            {recent === null ? (
              <p className="px-4 py-6 text-sm text-ink-muted">Loading…</p>
            ) : recent.length === 0 ? (
              <p className="px-4 py-6 text-sm text-ink-muted">
                No notifications yet. Updates on your requests and Mass intentions will show here.
              </p>
            ) : (
              <ul>
                {recent.map((n) => (
                  <li key={n.id} className="border-b border-border last:border-b-0">
                    <NotificationButton notification={n} onOpen={openOne} compact />
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Link
            to={`/${parish.slug}/portal/notifications`}
            onClick={() => setOpen(false)}
            className="block border-t border-border px-4 py-3 text-sm font-semibold text-primary hover:bg-surface-alt"
          >
            See all notifications
          </Link>
        </div>
      )}
    </div>
  );
}

/** One notification: title, what it says and when. Unread ones are tinted, with a dot. */
export function NotificationButton({
  notification,
  onOpen,
  compact = false,
}: {
  notification: ParishNotification;
  onOpen: (n: ParishNotification) => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(notification)}
      className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-alt ${
        notification.read ? "" : "bg-primary/[0.06]"
      }`}
    >
      <span
        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.read ? "bg-transparent" : "bg-primary"}`}
        aria-hidden="true"
      />
      <span className="min-w-0 flex-1">
        <span className={`block text-sm text-ink ${notification.read ? "font-medium" : "font-semibold"}`}>
          {notification.title}
          {!notification.read && <span className="sr-only"> (unread)</span>}
        </span>
        <span className={`mt-0.5 block text-[0.8125rem] leading-relaxed text-ink-muted ${compact ? "line-clamp-2" : ""}`}>
          {notification.body}
        </span>
        <span className="mt-1 block text-xs text-ink-muted">{formatNotificationTime(notification.createdAt)}</span>
      </span>
    </button>
  );
}
