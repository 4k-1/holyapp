import { Link } from "react-router-dom";
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "@/components/ui/icons/AdminIcons";
import type { CurrentUser } from "@/types";

export function SuperAdminTopbar({
  user,
  collapsed,
  onToggle,
}: {
  user: CurrentUser;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const initials = user.fullName
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

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
            <div
              className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] text-[15px] font-extrabold text-admin-gold-600"
              style={{
                background: "linear-gradient(145deg, var(--color-admin-green-700), var(--color-admin-green-900))",
              }}
            >
              H
            </div>
            <div className="min-w-0 overflow-hidden whitespace-nowrap leading-tight">
              <p className="truncate text-[13.5px] font-extrabold tracking-[0.2px] text-admin-ink">HolyApp</p>
              <p className="mt-px truncate text-[10.5px] text-admin-ink-faint">Diocesan Control Center</p>
            </div>
            <span className="hidden shrink-0 rounded-full border border-admin-gold-600 bg-admin-gold-100 px-[7px] py-0.5 text-[9.5px] font-bold uppercase tracking-[0.06em] text-admin-green-900 sm:inline-block">
              Super Admin
            </span>
          </div>
        </div>

        <Link
          to="/super-admin/settings"
          className="flex shrink-0 items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-admin-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-green-600/30"
          title="Update profile"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-admin-green-100 text-xs font-bold text-admin-green-900">
            {initials}
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-[12.5px] font-semibold text-admin-ink">{user.fullName}</p>
            <p className="text-[10.5px] text-admin-ink-faint">Super Admin</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
