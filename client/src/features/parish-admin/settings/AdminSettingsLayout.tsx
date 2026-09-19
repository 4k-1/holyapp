// src/features/parish-admin/settings/AdminSettingsLayout.tsx
import { NavLink, Outlet, useOutletContext } from "react-router-dom";
import { SETTINGS_SECTIONS } from "./types";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { canManageParishSettings } from "@/features/parish-admin/permissions";
import type { Parish } from "@/types";

const STAFF_SETTINGS_IDS = new Set(["personal", "security"]);

export function AdminSettingsLayout() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const user = useCurrentUser();
  const canManage = canManageParishSettings(user?.role);
  const sections = SETTINGS_SECTIONS.filter((s) => canManage || STAFF_SETTINGS_IDS.has(s.id));

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-serif text-admin-page font-semibold text-admin-ink">
          {canManage ? "Settings" : "My Account"}
        </h1>
        <p className="mt-1 text-admin-body text-admin-ink-muted">
          {canManage
            ? "Parish-wide defaults that apply automatically across the rest of the system."
            : "Your name, contact details, and sign-in options. Parish profile, fees, certificates, and staff accounts are managed by the parish admin."}
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-7 md:grid-cols-[220px_1fr]">
        <nav className="flex flex-col gap-0.5 md:sticky md:top-5">
          {sections.map((s) =>
            s.enabled ? (
              <NavLink
                key={s.id}
                to={s.path}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2.5 text-left text-admin-body font-semibold transition ${
                    isActive
                      ? "bg-admin-green-100 text-admin-green-900"
                      : "text-admin-ink-muted hover:bg-admin-surface-alt hover:text-admin-ink"
                  }`
                }
              >
                {s.label}
              </NavLink>
            ) : (
              <span
                key={s.id}
                className="cursor-not-allowed rounded-lg px-3 py-2.5 text-left text-admin-body font-semibold text-admin-ink-faint"
              >
                {s.label}
                <span className="ml-1.5 text-admin-label font-normal">(coming soon)</span>
              </span>
            )
          )}
        </nav>

        <div>
          <Outlet context={{ parish }} />
        </div>
      </div>
    </div>
  );
}
