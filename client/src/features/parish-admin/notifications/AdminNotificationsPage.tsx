import { useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
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
import "@/features/parish-admin/styles/adminDesk.css";
import "./AdminNotificationsPage.css";

type Tab = "unread" | "read";
type Sort = "newest" | "oldest";

export function AdminNotificationsPage() {
  const { parish, refetchUnreadNotifications } = useOutletContext<{
    parish: Parish;
    refetchUnreadNotifications?: () => void;
  }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("unread");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [markingAll, setMarkingAll] = useState(false);

  const { data: notifications = [], loading, refetch } = useAsync(
    () => listNotifications(parish.id),
    [parish.id]
  );

  const unreadCount = notifications.filter((n) => !n.read).length;
  const readCount = notifications.length - unreadCount;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows =
      tab === "unread" ? notifications.filter((n) => !n.read) : notifications.filter((n) => n.read);

    if (q) {
      rows = rows.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.body.toLowerCase().includes(q) ||
          NOTIFICATION_KIND_LABEL[n.kind].toLowerCase().includes(q)
      );
    }

    rows = [...rows].sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sort === "newest" ? -diff : diff;
    });

    return rows;
  }, [notifications, tab, query, sort]);

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
    <div className="admin-dash admin-notif mx-auto max-w-[1180px]">
      <header className="admin-notif__page-header">
        <h1 className="font-serif text-[1.35rem] font-bold tracking-[-0.01em] text-[var(--dash-ink)] sm:text-[1.5rem]">
          Notifications
        </h1>
        <div className="admin-notif__tabs" role="tablist" aria-label="Notification filters">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "unread"}
            className={`admin-notif__tab ${tab === "unread" ? "admin-notif__tab--active" : ""}`}
            onClick={() => setTab("unread")}
          >
            Unread
            {unreadCount > 0 ? <span className="admin-notif__tab-count">{unreadCount}</span> : null}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "read"}
            className={`admin-notif__tab ${tab === "read" ? "admin-notif__tab--active" : ""}`}
            onClick={() => setTab("read")}
          >
            Read
            {readCount > 0 ? <span className="admin-notif__tab-count">{readCount}</span> : null}
          </button>
        </div>
      </header>

      <div className="admin-notif__toolbar">
        <label className="admin-notif__search">
          <SearchIcon />
          <input
            type="search"
            placeholder="Search for notification"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="admin-notif__toolbar-end">
          <label className="admin-notif__select">
            <span className="sr-only">Sort by</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="newest">Date and time</option>
              <option value="oldest">Oldest first</option>
            </select>
            <ChevronIcon />
          </label>
          <button
            type="button"
            className="admin-notif__ghost-btn"
            onClick={markAllRead}
            disabled={unreadCount === 0 || markingAll}
          >
            {markingAll ? "Marking…" : "Mark all as read"}
          </button>
        </div>
      </div>

      <section className="admin-dash__card admin-notif__card overflow-hidden">
        {loading && notifications.length === 0 ? (
          <p className="admin-notif__empty">Loading notifications…</p>
        ) : visible.length === 0 ? (
          <p className="admin-notif__empty">
            {query.trim()
              ? "No notifications match your search."
              : tab === "unread"
                ? "Nothing unread. New requests and schedule reminders will appear here."
                : "No read notifications yet."}
          </p>
        ) : (
          <ul className="admin-notif__list">
            {visible.map((notification) => (
              <li key={notification.id}>
                <button
                  type="button"
                  className="admin-notif__row"
                  onClick={() => openNotification(notification)}
                >
                  <span
                    className={`admin-notif__dot ${notification.read ? "" : "admin-notif__dot--unread"}`}
                    aria-hidden="true"
                  />
                  <span className="admin-notif__copy">
                    <span className="admin-notif__row-title">{notification.title}</span>
                    <span className="admin-notif__row-body">{notification.body}</span>
                  </span>
                  <span className="admin-notif__kind">
                    <KindIcon kind={notification.kind} />
                    {NOTIFICATION_KIND_LABEL[notification.kind]}
                  </span>
                  <time className="admin-notif__time" dateTime={notification.createdAt}>
                    {formatNotificationTime(notification.createdAt)}
                  </time>
                  <span className="admin-notif__more" aria-hidden="true">
                    <MoreIcon />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function KindIcon({ kind }: { kind: NotificationKind }) {
  if (kind === "request" || kind === "schedule") {
    return (
      <svg viewBox="0 0 16 16" fill="none" className="admin-notif__kind-icon" aria-hidden="true">
        <path
          d="M8 1.5 14.5 13h-13L8 1.5Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path d="M8 6v3.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="8" cy="11.2" r="0.7" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" fill="none" className="admin-notif__kind-icon" aria-hidden="true">
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 5v3.2l2 1.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="admin-notif__chevron" aria-hidden="true">
      <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <circle cx="4" cy="10" r="1.5" />
      <circle cx="10" cy="10" r="1.5" />
      <circle cx="16" cy="10" r="1.5" />
    </svg>
  );
}
