import { BellIcon, ChevronDownIcon, PanelLeftCloseIcon, PanelLeftOpenIcon } from "@/components/ui/icons/AdminIcons";
import type { CurrentUser, Parish } from "@/types";

interface AdminTopbarProps {
  user: CurrentUser;
  parish: Parish;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export function AdminTopbar({ user, parish, sidebarCollapsed, onToggleSidebar }: AdminTopbarProps) {
  const initials = user.fullName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const roleLabel = user.role === "parish_admin" ? "Parish Admin" : "Parish Staff";

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
          <button
            type="button"
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-admin-ink-muted hover:bg-admin-surface-alt"
          >
            <BellIcon className="h-[18px] w-[18px]" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-admin-red-700" />
          </button>

          <div className="flex cursor-pointer items-center gap-2.5 rounded-full py-1 pl-1 pr-2 hover:bg-admin-surface-alt">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-admin-green-100 text-xs font-bold text-admin-green-700">
              {initials}
            </div>
            <div className="leading-tight">
              <p className="text-admin-body font-semibold text-admin-ink">{user.fullName}</p>
              <p className="text-admin-label text-admin-ink-muted">{roleLabel}</p>
            </div>
            <ChevronDownIcon className="h-3.5 w-3.5 text-admin-ink-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}