// src/features/parish-admin/settings/AdminSettingsLayout.tsx
import { NavLink, Outlet } from "react-router-dom";
import { SETTINGS_SECTIONS } from "./types";

export function AdminSettingsLayout() {
  return (
    <div>
      <div className="mb-5">
        <h1 className="font-serif text-2xl font-semibold text-admin-ink">Settings</h1>
        <p className="mt-1 text-[13px] text-admin-ink-muted">
          Parish-wide defaults that apply automatically across the rest of the system.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-7 md:grid-cols-[220px_1fr]">
        <nav className="flex flex-col gap-0.5 md:sticky md:top-5">
          {SETTINGS_SECTIONS.map((s) =>
            s.enabled ? (
              <NavLink
                key={s.id}
                to={s.path}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2.5 text-left text-[13px] font-semibold transition ${
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
                className="cursor-not-allowed rounded-lg px-3 py-2.5 text-left text-[13px] font-semibold text-admin-ink-faint"
              >
                {s.label}
                <span className="ml-1.5 text-[10.5px] font-normal">(coming soon)</span>
              </span>
            )
          )}
        </nav>

        <div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}