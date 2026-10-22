import { useId, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  GridIcon,
  InboxIcon,
  FolderIcon,
  CalendarIcon,
  HeartIcon,
  ChartIcon,
  GearIcon,
  BellIcon,
  ChevronDownIcon,
} from "@/components/ui/icons/AdminIcons";
import type { Role } from "@/types";

interface AdminSidebarProps {
  role: Role;
  collapsed: boolean;
  unreadCount?: number;
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
  { to: "mass-intentions", label: "Mass Intentions" },
];

const reportLinks = [
  { to: "reports/sacraments", label: "Sacraments" },
  { to: "reports/certificates", label: "Certificates" },
  { to: "reports/donations", label: "Donations" },
  { to: "reports/intentions", label: "Mass Intentions" },
];

export function AdminSidebar({ role, collapsed, unreadCount = 0 }: AdminSidebarProps) {
  const location = useLocation();

  const requestsActive = requestLinks.some((l) => pathMatches(location.pathname, l.to));
  const recordsActive = recordLinks.some((l) => pathMatches(location.pathname, l.to));
  const reportsActive = reportLinks.some((l) => pathMatches(location.pathname, l.to));

  return (
    <aside
      className={`flex h-full flex-shrink-0 flex-col bg-admin-surface text-admin-ink border-r border-admin-border transition-[width] duration-200 ${
        collapsed ? "w-14" : "w-[238px]"
      }`}
    >
      {/* Nav */}
      <nav className="admin-sidebar-scroll flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2.5 pt-2.5">
        <SidebarLink to="." end icon={<GridIcon />} label="Dashboard" collapsed={collapsed} />
        <SidebarLink
          to="notifications"
          icon={<BellIcon />}
          label="Notifications"
          collapsed={collapsed}
          badge={unreadCount}
        />

        <SidebarGroup
          icon={<InboxIcon />}
          label="Requests"
          active={requestsActive}
          collapsed={collapsed}
          links={requestLinks}
        >
          {requestLinks.map((l) => (
            <SidebarSubLink key={l.to} to={l.to} label={l.label} />
          ))}
        </SidebarGroup>

        <SidebarGroup
          icon={<FolderIcon />}
          label="Records"
          active={recordsActive}
          collapsed={collapsed}
          links={recordLinks}
        >
          {recordLinks.map((l) => (
            <SidebarSubLink key={l.to} to={l.to} label={l.label} />
          ))}
        </SidebarGroup>

        <SidebarLink to="schedule" icon={<CalendarIcon />} label="Schedule" collapsed={collapsed} />
        <SidebarLink to="donations" icon={<HeartIcon />} label="Donations" collapsed={collapsed} />
        <SidebarGroup
          icon={<ChartIcon />}
          label="Reports"
          active={reportsActive}
          collapsed={collapsed}
          links={reportLinks}
        >
          {reportLinks.map((l) => (
            <SidebarSubLink key={l.to} to={l.to} label={l.label} />
          ))}
        </SidebarGroup>
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

function pathMatches(pathname: string, segment: string) {
  return pathname === segment || pathname.includes(`/${segment}`);
}

function SidebarLink({
  to,
  icon,
  label,
  collapsed,
  end,
  badge,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  end?: boolean;
  badge?: number;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      data-label={label}
      className={({ isActive }) =>
        `group relative mb-0.5 flex items-center gap-2.5 overflow-hidden whitespace-nowrap rounded-lg text-admin-body transition-colors duration-100 ${
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
          <span className={`relative flex h-[17px] w-[17px] shrink-0 [&>svg]:h-full [&>svg]:w-full ${isActive ? "opacity-100" : "opacity-75"}`}>
            {icon}
            {collapsed && badge != null && badge > 0 && (
              <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-admin-red-700" />
            )}
          </span>
          {!collapsed && <span className="min-w-0 flex-1 overflow-hidden">{label}</span>}
          {!collapsed && badge != null && badge > 0 && (
            <span className="rounded-full bg-admin-red-100 px-1.5 py-px font-mono text-admin-label font-semibold text-admin-red-700">
              {badge}
            </span>
          )}

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
  links,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean;
  links: { to: string; label: string }[];
  children: React.ReactNode;
}) {
  const location = useLocation();
  const panelId = useId();
  const [open, setOpen] = useState(active);
  const [prevActive, setPrevActive] = useState(active);
  if (active !== prevActive) {
    setPrevActive(active);
    if (active) setOpen(true);
  }

  const fallbackTo = links.find((l) => pathMatches(location.pathname, l.to))?.to ?? links[0]?.to ?? ".";

  const activeClass = collapsed
    ? "bg-admin-green-100/60 font-semibold text-admin-green-700"
    : "font-semibold text-admin-green-700";
  const idleClass = "text-admin-ink-muted hover:bg-admin-surface-alt hover:text-admin-ink";
  const baseClass = `group relative mb-0.5 flex w-full items-center gap-2.5 overflow-hidden whitespace-nowrap rounded-lg text-admin-body transition-colors duration-100 ${
    collapsed ? "justify-center px-0 py-2.5" : "px-2.5 py-[9px]"
  }`;

  return (
    <div>
      {collapsed ? (
        <NavLink
          to={fallbackTo}
          data-label={label}
          aria-current={active ? "page" : undefined}
          className={`${baseClass} ${active ? activeClass : idleClass}`}
        >
          <span className={`flex h-[17px] w-[17px] shrink-0 [&>svg]:h-full [&>svg]:w-full ${active ? "opacity-100" : "opacity-75"}`}>
            {icon}
          </span>
          <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-[100] -translate-y-1/2 whitespace-nowrap rounded-[7px] bg-admin-ink px-2.5 py-[5px] text-xs font-semibold text-white opacity-0 shadow-[0_2px_8px_rgba(0,0,0,0.2)] transition-opacity duration-100 group-hover:opacity-100">
            {label}
          </span>
        </NavLink>
      ) : (
        <button
          type="button"
          data-label={label}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((prev) => !prev)}
          className={`${baseClass} ${active ? activeClass : idleClass}`}
        >
          <span className={`flex h-[17px] w-[17px] shrink-0 [&>svg]:h-full [&>svg]:w-full ${active ? "opacity-100" : "opacity-75"}`}>
            {icon}
          </span>
          <span className="min-w-0 flex-1 text-left">{label}</span>
          <ChevronDownIcon
            className={`h-3.5 w-3.5 shrink-0 opacity-70 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          />
        </button>
      )}
      {!collapsed && open && (
        <div id={panelId} className="ml-4 border-l border-admin-border pl-2.5">
          {children}
        </div>
      )}
    </div>
  );
}

function SidebarSubLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `mb-0.5 block rounded-lg px-2.5 py-[7px] text-admin-body transition-colors duration-100 ${
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