import { Link } from "react-router-dom";
import { PanelLeftCloseIcon, PanelLeftOpenIcon, UserIcon } from "@/components/ui/icons/AdminIcons";
import { ProfileMenu } from "@/components/layout/ProfileMenu";
import type { CurrentUser } from "@/types";
import { userInitials } from "@/lib/userInitials";

export function SuperAdminTopbar({
  user,
  collapsed,
  onToggle,
  onLogout,
}: {
  user: CurrentUser;
  collapsed: boolean;
  onToggle: () => void;
  onLogout: () => void;
}) {
  const initials = userInitials(user);

  return (
    <div className="flex h-16 shrink-0 items-center border-b border-admin-border bg-admin-surface pr-6">
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center pl-2">
          <button
            type="button"
            onClick={onToggle}
            className="flex shrink-0 items-center justify-center rounded-lg px-2.5 py-2 text-admin-ink-muted hover:bg-admin-surface-alt hover:text-admin-ink"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpenIcon className="h-[17px] w-[17px]" />
            ) : (
              <PanelLeftCloseIcon className="h-[17px] w-[17px]" />
            )}
          </button>

          <div className="flex min-w-0 items-center gap-2.5">
            <Link
              to="/super-admin"
              title="HolyApp"
              aria-label="HolyApp, back to the dashboard"
              className="ml-1 flex h-[34px] w-[34px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-admin-border bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <img src="/holyapp-logo.webp" alt="" className="h-[26px] w-[26px] object-contain" />
            </Link>
            <div className="min-w-0 overflow-hidden whitespace-nowrap leading-tight">
              <p className="truncate text-[14.5px] font-extrabold tracking-[0.2px] text-admin-ink">HolyApp</p>
              <p className="mt-px truncate text-[12px] text-admin-ink-faint">Platform console</p>
            </div>
          </div>
        </div>

        <ProfileMenu
          tone="admin"
          initials={initials}
          name={user.fullName}
          email={user.email}
          detail="Super Admin"
          items={[{ to: "/super-admin/settings", label: "My account", icon: <UserIcon /> }]}
          onLogout={onLogout}
        />
      </div>
    </div>
  );
}
