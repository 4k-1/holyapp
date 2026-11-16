import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/parish-admin/notifications/api/notificationsApi";
import type { ParishNotification } from "@/features/parish-admin/notifications/types";
import { notifyError } from "@/lib/notify";
import type { Parish } from "@/types";
import { NotificationButton } from "./PortalNotificationBell";
import { announceNotificationsChanged, portalPath } from "./usePortalNotifications";

/** Every update the parish sent this parishioner, newest unread first. */
export function MyNotificationsPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const navigate = useNavigate();
  const [items, setItems] = useState<ParishNotification[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listNotifications(parish.id)
      .then(setItems)
      .catch((err: unknown) => {
        notifyError(err, "Couldn't load your notifications.");
        setItems([]);
      });
  }, [parish.id]);

  async function openOne(notification: ParishNotification) {
    if (!notification.read) await markNotificationRead(parish.id, notification.id).catch(() => undefined);
    navigate(portalPath(parish.slug, notification.href));
  }

  async function readAll() {
    setBusy(true);
    try {
      await markAllNotificationsRead(parish.id);
      setItems((prev) => (prev ?? []).map((n) => ({ ...n, read: true })));
      announceNotificationsChanged();
    } catch (err) {
      notifyError(err, "Couldn't mark them as read.");
    } finally {
      setBusy(false);
    }
  }

  const unread = (items ?? []).filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-[26px] font-bold text-ink">Notifications</h1>
        {unread > 0 && (
          <button
            type="button"
            onClick={readAll}
            disabled={busy}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-primary hover:bg-surface-alt disabled:opacity-60"
          >
            Mark all as read
          </button>
        )}
      </div>

      {items === null ? (
        <p className="text-sm text-ink-muted">Loading your notifications…</p>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-sm text-ink-muted">
          No notifications yet. When the parish office updates one of your requests or Mass intentions, you&apos;ll see it
          here.
        </div>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-border bg-surface">
          {items.map((n) => (
            <li key={n.id} className="border-b border-border last:border-b-0">
              <NotificationButton notification={n} onOpen={openOne} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
