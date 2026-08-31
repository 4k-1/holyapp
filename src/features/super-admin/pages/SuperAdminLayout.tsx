import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { logout } from "@/features/auth/api/authApi";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import {
  ChurchIcon,
  ClipboardIcon,
  GearIcon,
  GridIcon,
  ReportIcon,
  SealIcon,
} from "@/components/ui/icons/AdminIcons";
import { SuperAdminChromeProvider, useSuperAdminChromeHeading } from "@/features/super-admin/SuperAdminChrome";

const navItem =
  "mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] text-[13.3px] font-medium text-admin-ink-muted hover:bg-admin-green-100";
const navActive = "bg-admin-green-100 font-bold text-admin-green-900";

function headingFromPath(pathname: string) {
  if (pathname.startsWith("/super-admin/parishes")) {
    return { title: "Parishes", sub: "Every parish on HolyApp." };
  }
  if (pathname.startsWith("/super-admin/templates")) {
    return { title: "Certificate Templates", sub: "Manage certificate layouts platform-wide, and check parish branding" };
  }
  if (pathname.startsWith("/super-admin/audit")) {
    return { title: "Audit Logs", sub: "System-wide activity across all parishes" };
  }
  if (pathname.startsWith("/super-admin/reports")) {
    return { title: "System Reports", sub: "Aggregated statistics for oversight" };
  }
  if (pathname.startsWith("/super-admin/settings")) {
    return { title: "Settings", sub: "Super Admin preferences" };
  }
  if (/^\/super-admin\/accounts\/[^/]+/.test(pathname)) {
    return { title: "", sub: "" };
  }
  if (pathname.startsWith("/super-admin/accounts")) {
    return { title: "Parish Admins", sub: "Create and manage Parish Admin accounts" };
  }
  return { title: "System Overview", sub: "Cross-parish oversight — Diocese of Cebu" };
}

function isParishNavActive(pathname: string) {
  return pathname.startsWith("/super-admin/parishes") || /^\/super-admin\/accounts\/[^/]+/.test(pathname);
}

export function SuperAdminLayout() {
  return (
    <SuperAdminChromeProvider>
      <SuperAdminShell />
    </SuperAdminChromeProvider>
  );
}

function SuperAdminShell() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();
  const override = useSuperAdminChromeHeading();
  const heading = override ?? headingFromPath(location.pathname);

  if (!user) return null;

  function handleSignOut() {
    logout();
    navigate("/super-admin/login", { replace: true });
  }

  const initials = user.fullName
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div data-portal="admin" data-surface="platform" className="flex h-dvh bg-admin-bg font-sans text-admin-ink">
      <aside className="flex w-[230px] shrink-0 flex-col border-r border-admin-border bg-admin-surface px-3.5 py-5">
        <div className="mb-4 flex items-center gap-2.5 border-b border-admin-border px-2 pb-[18px]">
          <div
            className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] text-[15px] font-extrabold text-admin-gold-600"
            style={{
              background: "linear-gradient(145deg, var(--color-admin-green-700), var(--color-admin-green-900))",
            }}
          >
            H
          </div>
          <div className="min-w-0 leading-tight">
            <p className="text-[13.5px] font-extrabold tracking-[0.2px] text-admin-ink">HolyApp</p>
            <p className="mt-px text-[10.5px] text-admin-ink-faint">Diocesan Control Center</p>
            <span className="mt-1.5 inline-block rounded-full border border-admin-gold-600 bg-admin-gold-100 px-[7px] py-0.5 text-[9.5px] font-bold uppercase tracking-[0.06em] text-admin-green-900">
              Super Admin
            </span>
          </div>
        </div>

        <p className="mb-1.5 mt-3.5 px-2 text-[10.5px] font-bold tracking-[0.08em] text-admin-ink-faint">
          OVERVIEW
        </p>
        <NavLink
          to="/super-admin"
          end
          className={({ isActive }) => `${navItem} ${isActive ? navActive : ""}`}
        >
          <GridIcon className="h-4 w-4 shrink-0" />
          Dashboard
        </NavLink>

        <p className="mb-1.5 mt-3.5 px-2 text-[10.5px] font-bold tracking-[0.08em] text-admin-ink-faint">
          MANAGEMENT
        </p>
        <NavLink
          to="/super-admin/parishes"
          className={() => `${navItem} ${isParishNavActive(location.pathname) ? navActive : ""}`}
        >
          <ChurchIcon className="h-4 w-4 shrink-0" />
          Parishes
        </NavLink>
        <NavLink
          to="/super-admin/templates"
          className={({ isActive }) => `${navItem} ${isActive ? navActive : ""}`}
        >
          <SealIcon className="h-4 w-4 shrink-0" />
          Certificate Templates
        </NavLink>

        <p className="mb-1.5 mt-3.5 px-2 text-[10.5px] font-bold tracking-[0.08em] text-admin-ink-faint">
          OVERSIGHT
        </p>
        <NavLink
          to="/super-admin/audit"
          className={({ isActive }) => `${navItem} ${isActive ? navActive : ""}`}
        >
          <ClipboardIcon className="h-4 w-4 shrink-0" />
          Audit Logs
        </NavLink>
        <NavLink
          to="/super-admin/reports"
          className={({ isActive }) => `${navItem} ${isActive ? navActive : ""}`}
        >
          <ReportIcon className="h-4 w-4 shrink-0" />
          System Reports
        </NavLink>

        <div className="mt-auto border-t border-admin-border pt-3.5">
          <NavLink
            to="/super-admin/settings"
            className={({ isActive }) => `${navItem} ${isActive ? navActive : ""}`}
          >
            <GearIcon className="h-4 w-4 shrink-0" />
            Settings
          </NavLink>
          <button type="button" onClick={handleSignOut} className={`${navItem} mt-0.5`}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto px-8 py-[26px]">
          <header className={`flex items-center ${heading.title ? "mb-[22px] justify-between" : "mb-3 justify-end"}`}>
            {heading.title ? (
              <div className="min-w-0">
                <h1 className="font-sans text-[21px] font-extrabold leading-tight text-admin-ink">
                  {heading.title}
                </h1>
                {heading.sub ? (
                  <p className="mt-[3px] text-[12.8px] text-admin-ink-muted">{heading.sub}</p>
                ) : null}
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-admin-green-100 text-xs font-bold text-admin-green-900">
                {initials}
              </div>
              <div className="hidden leading-tight sm:block">
                <p className="text-[12.5px] font-semibold text-admin-ink">{user.fullName}</p>
                <p className="text-[10.5px] text-admin-ink-faint">Super Admin</p>
              </div>
            </div>
          </header>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
