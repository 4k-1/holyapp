import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  ChurchIcon,
  ClipboardIcon,
  GearIcon,
  GridIcon,
  LogoutIcon,
  ReportIcon,
  SealIcon,
} from "@/components/ui/icons/AdminIcons";

function isParishNavActive(pathname: string) {
  return pathname.startsWith("/super-admin/parishes") || /^\/super-admin\/accounts\/[^/]+/.test(pathname);
}

export function SuperAdminSidebar({
  collapsed,
  onSignOut,
}: {
  collapsed: boolean;
  onSignOut: () => void;
}) {
  const location = useLocation();

  return (
    <aside
      className={`flex h-full shrink-0 flex-col border-r border-admin-border bg-admin-surface transition-[width] duration-200 ${
        collapsed ? "w-14" : "w-[230px]"
      }`}
    >
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2.5 pt-2.5">
        <NavSection label="Overview" collapsed={collapsed} first>
          <SidebarLink to="/super-admin" end icon={<GridIcon />} label="Dashboard" collapsed={collapsed} />
        </NavSection>

        <NavSection label="Management" collapsed={collapsed}>
          <SidebarLink
            to="/super-admin/parishes"
            icon={<ChurchIcon />}
            label="Parishes"
            collapsed={collapsed}
            active={isParishNavActive(location.pathname)}
          />
          <SidebarLink
            to="/super-admin/templates"
            icon={<SealIcon />}
            label="Certificate Templates"
            collapsed={collapsed}
          />
        </NavSection>

        <NavSection label="Oversight" collapsed={collapsed}>
          <SidebarLink to="/super-admin/audit" icon={<ClipboardIcon />} label="Audit Logs" collapsed={collapsed} />
          <SidebarLink to="/super-admin/reports" icon={<ReportIcon />} label="System Reports" collapsed={collapsed} />
        </NavSection>
      </nav>

      <div className={`shrink-0 border-t border-admin-border ${collapsed ? "px-0 py-2.5" : "px-2 py-2.5"}`}>
        <SidebarLink to="/super-admin/settings" icon={<GearIcon />} label="Settings" collapsed={collapsed} />
        <button
          type="button"
          onClick={onSignOut}
          className={`group relative mb-0.5 flex w-full items-center gap-2.5 overflow-hidden whitespace-nowrap rounded-lg text-[13.3px] font-medium text-admin-ink-muted hover:bg-admin-green-100 ${
            collapsed ? "justify-center px-0 py-2.5" : "px-2.5 py-[9px]"
          }`}
        >
          <span className="flex h-[17px] w-[17px] shrink-0 opacity-75 [&>svg]:h-full [&>svg]:w-full">
            <LogoutIcon />
          </span>
          {!collapsed && <span>Sign out</span>}
          {collapsed ? <CollapsedTip label="Sign out" /> : null}
        </button>
      </div>
    </aside>
  );
}

function NavSection({
  label,
  collapsed,
  first = false,
  children,
}: {
  label: string;
  collapsed: boolean;
  first?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      {collapsed ? (
        first ? null : <div className="mx-2 my-2 h-px bg-admin-border" />
      ) : (
        <p className={`mb-1.5 px-2 text-[10.5px] font-bold tracking-[0.08em] text-admin-ink-faint ${first ? "mt-1" : "mt-3.5"}`}>
          {label.toUpperCase()}
        </p>
      )}
      {children}
    </div>
  );
}

function SidebarLink({
  to,
  icon,
  label,
  collapsed,
  end,
  active,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  end?: boolean;
  active?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => {
        const on = active ?? isActive;
        return `group relative mb-0.5 flex items-center gap-2.5 overflow-hidden whitespace-nowrap rounded-lg text-[13.3px] ${
          collapsed ? "justify-center px-0 py-2.5" : "px-2.5 py-[9px]"
        } ${
          on
            ? "bg-admin-green-100 font-bold text-admin-green-900"
            : "font-medium text-admin-ink-muted hover:bg-admin-green-100"
        }`;
      }}
    >
      {({ isActive }) => {
        const on = active ?? isActive;
        return (
          <>
            <span className={`flex h-[17px] w-[17px] shrink-0 [&>svg]:h-full [&>svg]:w-full ${on ? "opacity-100" : "opacity-75"}`}>
              {icon}
            </span>
            {!collapsed && <span className="overflow-hidden">{label}</span>}
            {collapsed ? <CollapsedTip label={label} /> : null}
          </>
        );
      }}
    </NavLink>
  );
}

function CollapsedTip({ label }: { label: string }) {
  return (
    <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-[100] -translate-y-1/2 whitespace-nowrap rounded-[7px] bg-admin-ink px-2.5 py-[5px] text-xs font-semibold text-white opacity-0 shadow-[0_2px_8px_rgba(0,0,0,0.2)] transition-opacity duration-100 group-hover:opacity-100">
      {label}
    </span>
  );
}
