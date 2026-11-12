// src/features/parish-admin/settings/AdminSettingsPage.tsx
import { useState } from "react";
import { ParishProfileSection } from "./components/ParishProfileSection";
import { SETTINGS_SECTIONS } from "./types";
import type { SettingsSectionId } from "./types";

export function AdminSettingsPage() {
  const [sectionId, setSectionId] = useState<SettingsSectionId>("profile");
  const activeSection = SETTINGS_SECTIONS.find((s) => s.id === sectionId)!;

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-serif text-admin-page font-semibold text-admin-ink">Settings</h1>
        <p className="mt-1 text-admin-body text-admin-ink-muted">
          Parish-wide defaults that apply automatically across the rest of the system.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-7 md:grid-cols-[220px_1fr]">
        <nav className="flex flex-col gap-0.5 md:sticky md:top-5">
          {SETTINGS_SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSectionId(s.id)}
              disabled={!s.enabled}
              className={`rounded-lg px-3 py-2.5 text-left text-admin-body font-semibold transition ${
                sectionId === s.id
                  ? "bg-admin-green-100 text-admin-green-900"
                  : s.enabled
                    ? "text-admin-ink-muted hover:bg-admin-surface-alt hover:text-admin-ink"
                    : "cursor-not-allowed text-admin-ink-faint"
              }`}
            >
              {s.label}
              {!s.enabled && <span className="ml-1.5 text-admin-label font-normal">(coming soon)</span>}
            </button>
          ))}
        </nav>

        <div>
          {activeSection.id === "profile" ? (
            <ParishProfileSection />
          ) : (
            <div className="rounded-md border border-dashed border-admin-border-strong px-5 py-10 text-center">
              <p className="text-admin-body font-semibold text-admin-ink">{activeSection.label} isn't wired up yet</p>
              <p className="mt-1 text-admin-support text-admin-ink-muted">Say the word when you're ready to build this one.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}