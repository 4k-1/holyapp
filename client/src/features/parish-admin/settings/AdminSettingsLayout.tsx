// src/features/parish-admin/settings/AdminSettingsLayout.tsx
import { useEffect, useRef } from "react";
import { NavLink, Outlet, useLocation, useOutletContext } from "react-router-dom";
import { SETTINGS_SECTIONS, type SettingsSectionMeta } from "./types";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { canManageParishSettings } from "@/features/parish-admin/permissions";
import type { Parish } from "@/types";
import { AdminPage, AdminPageHeader } from "@/features/parish-admin/components/AdminPageHeader";

const STAFF_SETTINGS_IDS = new Set(["personal", "security"]);

const GROUP_LABELS: Record<SettingsSectionMeta["group"] | "soon", string> = {
  parish: "Parish",
  account: "Your account",
  soon: "Coming soon",
};

function navItemClass(isActive: boolean) {
  return `flex shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-admin-body transition md:whitespace-normal ${
    isActive
      ? "bg-admin-green-100 font-semibold text-admin-green-800"
      : "font-medium text-admin-ink-muted hover:bg-admin-surface-alt hover:text-admin-ink"
  }`;
}

/** One card: section list on the left, the open section on the right. On phones the list scrolls across the top. */
export function AdminSettingsLayout() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const user = useCurrentUser();
  const { pathname } = useLocation();
  const canManage = canManageParishSettings(user?.role);
  const sections = SETTINGS_SECTIONS.filter((s) => canManage || STAFF_SETTINGS_IDS.has(s.id));
  // Sections without a page yet sit together at the bottom, and only on wider screens.
  const groups = (["parish", "account", "soon"] as const)
    .map((group) => ({
      group,
      items: sections.filter((s) => (group === "soon" ? !s.enabled : s.enabled && s.group === group)),
    }))
    .filter((g) => g.items.length > 0);
  const active = sections.find((s) => pathname.split("/").includes(s.path));
  const navRef = useRef<HTMLElement>(null);

  // On phones the list is a strip that scrolls sideways; bring the open section into view.
  useEffect(() => {
    const nav = navRef.current;
    const link = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !link || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollTo({ left: link.offsetLeft - (nav.clientWidth - link.offsetWidth) / 2 });
  }, [pathname]);

  return (
    <AdminPage>
      <AdminPageHeader
        title={canManage ? "Settings" : "My Account"}
        description={
          canManage
            ? "Parish-wide defaults, and your own account."
            : "Your name, contact details, and sign-in options. Parish settings are managed by the parish admin."
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)] overflow-hidden rounded-[20px] border border-admin-border bg-admin-surface shadow-[var(--shadow-card)] md:grid-cols-[232px_minmax(0,1fr)]">
        <nav
          ref={navRef}
          aria-label="Settings sections"
          className="relative flex gap-1 overflow-x-auto border-b border-admin-border p-3 md:flex-col md:gap-5 md:overflow-visible md:border-r md:border-b-0 md:p-4"
        >
          {groups.map(({ group, items }) => (
            <div key={group} className={group === "soon" ? "hidden md:flex md:flex-col md:gap-1" : "contents md:flex md:flex-col md:gap-1"}>
              {groups.length > 1 && (
                <p className="hidden px-3.5 pb-1 text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-faint md:block">
                  {GROUP_LABELS[group]}
                </p>
              )}
              {items.map((s) =>
                s.enabled ? (
                  <NavLink key={s.id} to={s.path} className={({ isActive }) => navItemClass(isActive)}>
                    {s.label}
                  </NavLink>
                ) : (
                  <span
                    key={s.id}
                    aria-disabled="true"
                    className="cursor-not-allowed rounded-xl px-3.5 py-2 text-admin-support font-medium text-admin-ink-faint"
                  >
                    {s.label}
                  </span>
                )
              )}
            </div>
          ))}
        </nav>

        <div className="min-w-0 p-4 sm:p-6 lg:p-7">
          {active && (
            <div className="mb-5">
              <h2 className="font-sans text-[1.125rem] font-semibold text-admin-ink">{active.label}</h2>
              {active.description && (
                <p className="mt-1 max-w-[62ch] text-admin-support text-admin-ink-muted">{active.description}</p>
              )}
            </div>
          )}
          <Outlet context={{ parish }} />
        </div>
      </div>
    </AdminPage>
  );
}
