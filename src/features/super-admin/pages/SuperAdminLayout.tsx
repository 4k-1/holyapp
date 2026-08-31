import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { logout } from "@/features/auth/api/authApi";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import {
  ChurchIcon,
  ClipboardIcon,
  GearIcon,
  GridIcon,
  UsersIcon,
} from "@/components/ui/icons/AdminIcons";

const navItem =
  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] text-[13.3px] font-medium text-admin-ink-muted hover:bg-admin-green-100";
const navActive = "bg-admin-green-100 font-bold text-admin-green-900";

export function SuperAdminLayout() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();

  const heading = location.pathname.startsWith("/super-admin/parishes")
    ? { title: "Parishes", sub: "Create and edit parish accounts" }
    : location.pathname.startsWith("/super-admin/accounts")
      ? { title: "Accounts", sub: "Every parish admin, staff, and parishioner" }
      : { title: "System Overview", sub: "Cross-parish oversight — Archdiocese of Cebu" };

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
            <p className="mt-px text-[10.5px] text-admin-ink-faint">Platform</p>
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
          className={({ isActive }) => `${navItem} ${isActive ? navActive : ""}`}
        >
          <ChurchIcon className="h-4 w-4 shrink-0" />
          Parishes
        </NavLink>
        <NavLink
          to="/super-admin/accounts"
          className={({ isActive }) => `${navItem} ${isActive ? navActive : ""}`}
        >
          <UsersIcon className="h-4 w-4 shrink-0" />
          Accounts
        </NavLink>

        <p className="mb-1.5 mt-3.5 px-2 text-[10.5px] font-bold tracking-[0.08em] text-admin-ink-faint">
          OVERSIGHT
        </p>
        <span className={`${navItem} cursor-default opacity-45`}>
          <ClipboardIcon className="h-4 w-4 shrink-0" />
          Audit Logs
        </span>

        <div className="mt-auto border-t border-admin-border pt-3.5">
          <span className={`${navItem} cursor-default opacity-45`}>
            <GearIcon className="h-4 w-4 shrink-0" />
            Settings
          </span>
          <button type="button" onClick={handleSignOut} className={`${navItem} mt-1`}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto px-8 py-[26px]">
          <header className="mb-[22px] flex items-center justify-between">
            <div className="min-w-0">
              <h1 className="font-sans text-[21px] font-extrabold leading-tight text-admin-ink">
                {heading.title}
              </h1>
              <p className="mt-[3px] text-[12.8px] text-admin-ink-muted">{heading.sub}</p>
            </div>
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
