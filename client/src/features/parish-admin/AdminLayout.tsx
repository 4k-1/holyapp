import { useState } from "react";
import { Outlet, useLocation, useOutletContext } from "react-router-dom";
import { PageEnter } from "@/components/ui/PageEnter";
import { AdminSidebar } from "@/features/parish-admin/components/AdminSidebar";
import { AdminTopbar } from "@/features/parish-admin/components/AdminTopbar";
import { getUnreadNotificationCount } from "@/features/parish-admin/notifications/api/notificationsApi";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useAsync } from "@/hooks/useAsync";
import type { Parish } from "@/types";

const PHONE = "(max-width: 639px)";

export function AdminLayout() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const user = useCurrentUser();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.matchMedia("(max-width: 1023px)").matches);
  const { data: unreadCount = 0, refetch: refetchUnreadNotifications } = useAsync(
    () => getUnreadNotificationCount(parish.id),
    [parish.id]
  );

  // On phones the open sidebar covers the page, so close it once a link takes you somewhere.
  const { pathname } = useLocation();
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (window.matchMedia(PHONE).matches) setSidebarCollapsed(true);
  }

  if (!user) return null;

  return (
    <div data-portal="admin" className="flex h-screen flex-col bg-admin-bg">
      <AdminTopbar
        user={user}
        parish={parish}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
        unreadCount={unreadCount}
        onUnreadChange={refetchUnreadNotifications}
      />
      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar role={user.role} collapsed={sidebarCollapsed} unreadCount={unreadCount} />
        {!sidebarCollapsed && (
          <div
            className="fixed inset-x-0 bottom-0 top-16 z-30 bg-black/30 sm:hidden"
            onClick={() => setSidebarCollapsed(true)}
            aria-hidden="true"
          />
        )}
        <main className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <PageEnter>
            <Outlet context={{ parish, refetchUnreadNotifications }} />
          </PageEnter>
        </main>
      </div>
    </div>
  );
}