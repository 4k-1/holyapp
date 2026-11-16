import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getUnreadNotificationCount } from "@/features/parish-admin/notifications/api/notificationsApi";

const POLL_MS = 60_000;
const CHANGED_EVENT = "holyapp:notifications-changed";

/** Tells the bell to count again, e.g. after "Mark all as read". */
export function announceNotificationsChanged() {
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

/** The parishioner's unread count, fetched on each page change and every minute while the tab is open. */
export function useUnreadNotificationCount(parishId: string) {
  const location = useLocation();
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    getUnreadNotificationCount(parishId)
      .then(setCount)
      .catch(() => {
        // A missed count is harmless; the next page change or poll tries again.
      });
  }, [parishId]);

  useEffect(() => {
    refresh();
  }, [refresh, location.pathname]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    window.addEventListener(CHANGED_EVENT, refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener(CHANGED_EVENT, refresh);
    };
  }, [refresh]);

  return { count, refresh };
}

/** A notification's link (e.g. "requests/<id>") as a full portal path. */
export function portalPath(slug: string, href: string) {
  const tail = String(href || "").replace(/^\/+/, "");
  return tail && tail !== "notifications" ? `/${slug}/portal/${tail}` : `/${slug}/portal/notifications`;
}
