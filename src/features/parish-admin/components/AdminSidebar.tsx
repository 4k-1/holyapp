import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  GridIcon,
  InboxIcon,
  FolderIcon,
  CalendarIcon,
  HeartIcon,
  ChartIcon,
  GearIcon,
} from "@/components/ui/icons/AdminIcons";
import type { Parish, Role } from "@/types";

interface AdminSidebarProps {
  parish: Parish;
  role: Role;
}

const recordLinks = [
  { to: "records/baptismal", label: "Baptismal" },
  { to: "records/confirmation", label: "Confirmation" },
  { to: "records/marriage", label: "Marriage" },
  { to: "records/death", label: "Death" },
  { to: "records/ledgers", label: "Digitized Ledgers" },
];

const requestLinks = [
  { to: "requests", label: "Certificate Requests" },
  { to: "marriage-applications", label: "Marriage Applications" },
  { to: "mass-intentions", label: "Mass Intention Requests" },
];

export function AdminSidebar({ parish, role }: AdminSidebarProps) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const requestsActive = requestLinks.some((l) => location.pathname.includes(l.to));
  const recordsActive = recordLinks.some((l) => location.pathname.includes(l.to));

  return (
    <aside
      className={`sticky top-0 relative flex h-screen flex-shrink-0 flex-col bg-admin-surface text-admin-ink border-r border-admin-border transition-[width] duration-200 ${
        collapsed ? "w-14" : "w-[238px]"
      }`}
    >
      {/* Collapse toggle — floating circle on the edge */}
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        className="absolute right-[-13px] top-5 z-30 flex h-[27px] w-[27px] items-center justify-center rounded-full border-[1.5px] border-admin-border-strong bg-admin-surface text-admin-green-700 shadow-[0_1px_5px_rgba(10,40,30,0.18)] transition-all hover:border-admin-green-700 hover:bg-admin-green-700 hover:text-white hover:shadow-[0_2px_7px_rgba(10,40,30,0.28)]"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`h-[13px] w-[13px] transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
        >
          <polyline points="17 18 11 12 17 6" />
          <polyline points="10 18 4 12 10 6" />
        </svg>
      </button>

      {/* Brand */}
      <div
        className={`flex min-h-16 flex-shrink-0 items-center gap-2.5 border-b border-admin-border ${
          collapsed ? "justify-center px-0 pb-4 pt-[18px]" : "px-[11px] pb-4 pt-[18px]"
        }`}
      >
        {parish.sealUrl ? (
          <img src={parish.sealUrl} alt="" className="h-[34px] w-[34px] shrink-0 rounded-full object-contain" />
        ) : (
          <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-admin-green-100 font-serif text-sm font-bold text-admin-green-700">
            {parish.name.charAt(0)}
          </div>
        )}
        {!collapsed && (
          <div className="min-w-0 overflow-hidden whitespace-nowrap leading-tight">
            <p className="truncate font-serif text-[14.5px] font-semibold tracking-[0.2px] text-admin-green-900">
              Parish Admin Portal
            </p>
            <p className="mt-0.5 truncate text-[10px] tracking-[0.3px] text-admin-ink-muted">{parish.name}</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2.5">
        <SidebarLink to="." end icon={<GridIcon />} label="Dashboard" collapsed={collapsed} />

        <SidebarGroup icon={<InboxIcon />} label="Requests" active={requestsActive} collapsed={collapsed}>
          {requestLinks.map((l) => (
            <SidebarSubLink key={l.to} to={l.to} label={l.label} />
          ))}
        </SidebarGroup>

        <SidebarGroup icon={<FolderIcon />} label="Records" active={recordsActive} collapsed={collapsed}>
          {recordLinks.map((l) => (
            <SidebarSubLink key={l.to} to={l.to} label={l.label} />
          ))}
        </SidebarGroup>

        <SidebarLink to="schedule" icon={<CalendarIcon />} label="Schedule" collapsed={collapsed} />
        <SidebarLink to="donations" icon={<HeartIcon />} label="Donations" collapsed={collapsed} />
        <SidebarLink to="reports" icon={<ChartIcon />} label="Reports" collapsed={collapsed} />
      </nav>

      {/* Foot */}
      <div className={`flex-shrink-0 border-t border-admin-border ${collapsed ? "px-0 py-2.5" : "px-2 py-2.5"}`}>
        <SidebarLink
          to="settings"
          icon={<GearIcon />}
          label={role === "parish_admin" ? "Settings" : "My Account"}
          collapsed={collapsed}
        />
      </div>
    </aside>
  );
}

function SidebarLink({
  to,
  icon,
  label,
  collapsed,
  end,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  end?: boolean;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      data-label={label}
      className={({ isActive }) =>
        `group relative mb-0.5 flex items-center gap-2.5 overflow-hidden whitespace-nowrap rounded-lg text-[13.5px] transition-colors duration-100 ${
          collapsed ? "justify-center px-0 py-2.5" : "px-2.5 py-[9px]"
        } ${
          isActive
            ? "bg-admin-green-100/60 font-semibold text-admin-green-700"
            : "text-admin-ink-muted hover:bg-admin-surface-alt hover:text-admin-ink"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span className={`flex h-[17px] w-[17px] shrink-0 [&>svg]:h-full [&>svg]:w-full ${isActive ? "opacity-100" : "opacity-75"}`}>
            {icon}
          </span>
          {!collapsed && <span className="overflow-hidden">{label}</span>}

          {/* Tooltip when collapsed */}
          {collapsed && (
            <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-[100] -translate-y-1/2 whitespace-nowrap rounded-[7px] bg-admin-ink px-2.5 py-[5px] text-xs font-semibold text-white opacity-0 shadow-[0_2px_8px_rgba(0,0,0,0.2)] transition-opacity duration-100 group-hover:opacity-100">
              {label}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

function SidebarGroup({
  icon,
  label,
  active,
  collapsed,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        data-label={label}
        className={`group relative mb-0.5 flex items-center gap-2.5 overflow-hidden whitespace-nowrap rounded-lg text-[13.5px] ${
          collapsed ? "justify-center px-0 py-2.5" : "px-2.5 py-[9px]"
        } ${active ? "font-semibold text-admin-green-700" : "text-admin-ink-muted"}`}
      >
        <span className={`flex h-[17px] w-[17px] shrink-0 [&>svg]:h-full [&>svg]:w-full ${active ? "opacity-100" : "opacity-75"}`}>
          {icon}
        </span>
        {!collapsed && <span>{label}</span>}
        {collapsed && (
          <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-[100] -translate-y-1/2 whitespace-nowrap rounded-[7px] bg-admin-ink px-2.5 py-[5px] text-xs font-semibold text-white opacity-0 shadow-[0_2px_8px_rgba(0,0,0,0.2)] transition-opacity duration-100 group-hover:opacity-100">
            {label}
          </span>
        )}
      </div>
      {!collapsed && (
        <div className="ml-4 border-l border-admin-border pl-2.5">{children}</div>
      )}
    </div>
  );
}

function SidebarSubLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `mb-0.5 block rounded-lg px-2.5 py-[7px] text-[13px] transition-colors duration-100 ${
          isActive
            ? "bg-admin-green-100/60 font-semibold text-admin-green-700"
            : "text-admin-ink-muted hover:bg-admin-surface-alt hover:text-admin-ink"
        }`
      }
    >
      {label}
    </NavLink>
  );
}