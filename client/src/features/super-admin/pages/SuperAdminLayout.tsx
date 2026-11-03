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
    return { title: "Your profile", sub: "Name, contact details, and sign-in email for this platform account." };
  }
  if (/^\/super-admin\/accounts\/[^/]+/.test(pathname)) {
    return { title: "", sub: "" };
  }
  if (pathname.startsWith("/super-admin/accounts")) {
    return { title: "Parish Admins", sub: "Create and manage Parish Admin accounts" };
  }
  return { title: "System Overview", sub: "Cross-parish oversight — Diocese of Cebu" };
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
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return null;

  async function handleSignOut() {
    const ok = await askConfirm({
      title: "Sign out?",
      message: "You'll need to sign in again to use the platform console.",
      confirmLabel: "Sign out",
    });
    if (!ok) return;
    await logout();
    navigate("/super-admin/login", { replace: true });
  }

  return (
    <div data-portal="admin" data-surface="platform" className="flex h-dvh flex-col bg-admin-bg font-sans text-admin-ink">
      <SuperAdminTopbar user={user} collapsed={collapsed} onToggle={() => setCollapsed((v) => !v)} />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <SuperAdminSidebar collapsed={collapsed} onSignOut={handleSignOut} />
        <main className="min-w-0 flex-1 overflow-y-auto px-8 py-[26px]" data-enter-fields>
          {heading.title ? (
            <header className="mb-[22px]">
              <h1 className="font-sans text-[21px] font-extrabold leading-tight text-admin-ink">{heading.title}</h1>
              {heading.sub ? <p className="mt-[3px] text-[12.8px] text-admin-ink-muted">{heading.sub}</p> : null}
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
