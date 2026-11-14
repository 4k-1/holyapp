import { useId } from "react";
import {
  ACCESS_AREAS,
  ACCESS_LEVELS,
  ACCESS_PRESETS,
  matchingPreset,
  type AccessLevel,
  type AreaAccess,
} from "@/features/parish-admin/access";

const selectClass =
  "w-full rounded-md border border-admin-border-strong bg-white px-[11px] py-[9px] text-admin-body text-admin-ink focus:border-admin-green-600 focus:outline-none focus:ring-2 focus:ring-admin-green-600/25";

const SELECTED: Record<AccessLevel, string> = {
  off: "bg-admin-ink-muted text-white",
  view: "bg-admin-green-100 text-admin-green-900",
  manage: "bg-admin-green-700 text-white",
};

/**
 * E1: a preset picker over a grid of areas, each Off / View / Manage. Changing any row after picking a preset
 * turns the picker to "Custom".
 */
export function AreaAccessEditor({ value, onChange }: { value: AreaAccess; onChange: (next: AreaAccess) => void }) {
  const presetId = useId();
  const preset = matchingPreset(value);

  return (
    <div>
      <label htmlFor={presetId} className="mb-1.5 block text-admin-support font-semibold text-admin-ink">
        Start from
      </label>
      <select
        id={presetId}
        value={preset?.key ?? "custom"}
        onChange={(e) => {
          const next = ACCESS_PRESETS.find((p) => p.key === e.target.value);
          if (next) onChange({ ...next.access });
        }}
        className={selectClass}
      >
        {ACCESS_PRESETS.map((p) => (
          <option key={p.key} value={p.key}>
            {p.label}
          </option>
        ))}
        {!preset && (
          <option value="custom" disabled>
            Custom
          </option>
        )}
      </select>
      <p className="mt-1 text-admin-support text-admin-ink-muted">
        {preset ? preset.description : "Adjusted by hand. Pick a preset to start over."}
      </p>

      <ul className="mt-3 divide-y divide-admin-border rounded-lg border border-admin-border">
        {ACCESS_AREAS.map((area) => (
          <li key={area.key} className="flex flex-col gap-2 px-3.5 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <p className="text-admin-body font-semibold text-admin-ink">{area.label}</p>
              <p className="text-admin-label leading-snug text-admin-ink-muted">{area.hint}</p>
            </div>
            <div
              role="radiogroup"
              aria-label={area.label}
              className="inline-flex shrink-0 self-start rounded-md border border-admin-border-strong bg-white p-0.5 sm:self-auto"
            >
              {ACCESS_LEVELS.map((level) => {
                const selected = value[area.key] === level.key;
                return (
                  <button
                    key={level.key}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => onChange({ ...value, [area.key]: level.key })}
                    className={`min-w-[64px] rounded px-2.5 py-1.5 text-admin-support font-semibold transition-colors ${
                      selected ? SELECTED[level.key] : "text-admin-ink-muted hover:bg-admin-surface-alt"
                    }`}
                  >
                    {level.label}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-admin-support text-admin-ink-muted">
        View lets them look without changing anything. Settings, staff accounts, voids and clearing cheques always stay
        with admins.
      </p>
    </div>
  );
}
