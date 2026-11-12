import { Link, useNavigate } from "react-router-dom";
import { LockIcon, PanelLeftCloseIcon, PanelLeftOpenIcon, UserIcon } from "@/components/ui/icons/AdminIcons";
import { ProfileMenu } from "@/components/layout/ProfileMenu";
import { logout } from "@/features/auth/api/authApi";
import { askConfirm } from "@/lib/notify";
import { AdminNotificationBell } from "@/features/parish-admin/notifications/AdminNotificationBell";
import type { CurrentUser, Parish } from "@/types";
import { userInitials } from "@/lib/userInitials";

interface AdminTopbarProps {
  user: CurrentUser;
  parish: Parish;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  unreadCount?: number;
  onUnreadChange?: () => void;
}

export function AdminTopbar({
  user,
  parish,
  sidebarCollapsed,
  onToggleSidebar,
  unreadCount = 0,
  onUnreadChange,
}: AdminTopbarProps) {
  const navigate = useNavigate();
  const initials = userInitials(user);
  const roleLabel = user.role === "parish_admin" ? "Parish Admin" : "Parish Staff";

  async function handleLogout() {
    const ok = await askConfirm({
      title: "Log out?",
      message: "You'll need to log in again to use the parish admin portal.",
      confirmLabel: "Log out",
    });
    if (!ok) return;
    await logout();
    navigate(`/${parish.slug}/login`, { replace: true });
  }

  return (
    <div className="flex h-16 items-center border-b border-admin-border bg-admin-surface pr-6">
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center pl-2">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="flex shrink-0 items-center justify-center rounded-lg px-2.5 py-2 text-admin-ink-muted hover:bg-admin-surface-alt hover:text-admin-ink"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpenIcon className="h-[17px] w-[17px]" />
            ) : (
              <PanelLeftCloseIcon className="h-[17px] w-[17px]" />
            )}
          </button>

          <div className="flex min-w-0 items-center gap-2.5">
            <Link
              to={`/${parish.slug}/admin`}
              title="HolyApp"
              aria-label="HolyApp, back to the admin dashboard"
              className="ml-1 flex h-[34px] w-[34px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-admin-border bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <img src="/holyapp-logo.webp" alt="" className="h-[26px] w-[26px] object-contain" />
            </Link>
            <span className="h-7 w-px shrink-0 bg-admin-border" aria-hidden="true" />
            {parish.sealUrl ? (
              <img src={parish.sealUrl} alt="" className="h-[34px] w-[34px] shrink-0 rounded-full object-contain" />
            ) : (
              <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-admin-green-100 font-serif text-sm font-bold text-admin-green-700">
                {parish.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0 overflow-hidden whitespace-nowrap leading-tight">
              <p className="truncate font-serif text-admin-group font-semibold text-admin-green-900">
                Parish Admin Portal
              </p>
              <p className="mt-0.5 truncate text-admin-label tracking-admin-label text-admin-ink-muted">{parish.name}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-3">
          <AdminNotificationBell
            parish={parish}
            unreadCount={unreadCount}
            onUnreadChange={onUnreadChange}
          />

          <ProfileMenu
            tone="admin"
            initials={initials}
            name={user.fullName}
            email={user.email}
            detail={`${roleLabel} · ${parish.name}`}
            items={[
              { to: `/${parish.slug}/admin/settings/personal`, label: "My account", icon: <UserIcon /> },
              { to: `/${parish.slug}/admin/settings/security`, label: "Password & security", icon: <LockIcon /> },
            ]}
            onLogout={handleLogout}
          />
        </div>
      </div>
    </div>
  );
}
