import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { PageEnter } from "@/components/ui/PageEnter";
import { logout } from "@/features/auth/api/authApi";
import { askConfirm } from "@/lib/notify";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { SuperAdminSidebar } from "@/features/super-admin/components/SuperAdminSidebar";
import { SuperAdminTopbar } from "@/features/super-admin/components/SuperAdminTopbar";
import { SuperAdminChromeProvider } from "@/features/super-admin/SuperAdminChrome";
import { useSuperAdminChromeHeading } from "@/features/super-admin/superAdminChromeContext";

const PHONE = "(max-width: 639px)";

function headingFromPath(pathname: string) {
  if (pathname.startsWith("/super-admin/parishes")) {
    return { title: "Parishes", sub: "Every parish on HolyApp." };
  }
  if (pathname.startsWith("/super-admin/templates")) {
    return { title: "Certificate Templates", sub: "The certificate layouts every parish uses" };
  }
  if (pathname.startsWith("/super-admin/audit")) {
    return { title: "Audit Logs", sub: "System-wide activity across all parishes" };
  }
  if (pathname.startsWith("/super-admin/reports")) {
    return { title: "Reports", sub: "How parishes are using HolyApp over time" };
  }
  if (pathname.startsWith("/super-admin/settings")) {
    return { title: "Settings", sub: "Your name, contact details, sign-in email and password." };
  }
  if (/^\/super-admin\/accounts\/[^/]+/.test(pathname)) {
    return { title: "", sub: "" };
  }
  if (pathname.startsWith("/super-admin/accounts")) {
    return { title: "Parishes", sub: "Every parish on HolyApp." };
  }
  return { title: "System Overview", sub: "Every parish on HolyApp at a glance" };
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
  // Collapsed to start with on phones and small tablets, as on the parish admin side.
  const [collapsed, setCollapsed] = useState(() => window.matchMedia("(max-width: 1023px)").matches);

  // On phones the open sidebar covers the page, so close it once a link takes you somewhere.
  const [lastPath, setLastPath] = useState(location.pathname);
  if (location.pathname !== lastPath) {
    setLastPath(location.pathname);
    if (window.matchMedia(PHONE).matches) setCollapsed(true);
  }

  if (!user) return null;

  async function handleLogout() {
    const ok = await askConfirm({
      title: "Log out?",
      message: "You'll need to log in again to use the platform console.",
      confirmLabel: "Log out",
    });
    if (!ok) return;
    await logout();
    navigate("/super-admin/login", { replace: true });
  }

  return (
    <div data-portal="admin" data-surface="platform" className="flex h-dvh flex-col bg-admin-bg font-sans text-admin-ink">
      <SuperAdminTopbar
        user={user}
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        onLogout={handleLogout}
      />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <SuperAdminSidebar collapsed={collapsed} />
        {!collapsed && (
          <div
            className="fixed inset-x-0 bottom-0 top-16 z-30 bg-black/30 sm:hidden"
            onClick={() => setCollapsed(true)}
            aria-hidden="true"
          />
        )}
        <main className="min-w-0 flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-[26px]" data-enter-fields>
          {heading.title ? (
            <header className="mb-[22px]">
              <h1 className="font-sans text-[21px] font-extrabold leading-tight text-admin-ink">{heading.title}</h1>
              {heading.sub ? <p className="mt-[3px] text-[14px] text-admin-ink-muted">{heading.sub}</p> : null}
            </header>
          ) : null}
          <PageEnter>
            <Outlet />
          </PageEnter>
        </main>
      </div>
    </div>
  );
}
