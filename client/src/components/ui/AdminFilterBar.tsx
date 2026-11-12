import type { ReactNode } from "react";

/*
 * The one filter bar the admin tables use, sitting at the top of the table's card:
 * search, the filters that stay in view, and chips for what is switched on.
 *
 *   [ search ] [ status ▾ ] [ date ]                        [ actions ]
 *   [ Pending × ] [ Mar 4, 2026 × ]  Clear all                 12 shown
 */

export type FilterChip = { key: string; label: string; onRemove: () => void };

const pillBase =
  "h-9 rounded-full border px-3.5 text-admin-body outline-none transition focus-visible:ring-[3px] focus-visible:ring-admin-green-100";
const pillIdle = "border-admin-border bg-white text-admin-ink hover:bg-admin-surface-alt";
const pillOn = "border-admin-green-700/40 bg-admin-green-050 text-admin-green-900 font-medium";

export function AdminFilterBar({
  search,
  children,
  chips = [],
  onClearAll,
  actions,
  summary,
}: {
  search?: { value: string; onChange: (value: string) => void; placeholder: string; label: string };
  /** Filters that stay in view next to the search. */
  children?: ReactNode;
  chips?: FilterChip[];
  onClearAll?: () => void;
  actions?: ReactNode;
  /** e.g. "34 shown", on the right of the chip row. */
  summary?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5 border-b border-admin-border px-5 py-3.5">
      <div className="flex flex-wrap items-center gap-2">
        {search && (
          <label className="flex h-9 w-full items-center gap-2 rounded-full border border-admin-border bg-admin-surface-alt px-3.5 text-admin-ink-faint transition focus-within:border-admin-green-700 focus-within:bg-white focus-within:ring-[3px] focus-within:ring-admin-green-100 sm:w-72">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
            </svg>
            <span className="sr-only">{search.label}</span>
            <input
              type="search"
              placeholder={search.placeholder}
              value={search.value}
              onChange={(e) => search.onChange(e.target.value)}
              className="w-full min-w-0 border-none bg-transparent text-admin-body text-admin-ink outline-none placeholder:text-admin-ink-faint [&::-webkit-search-cancel-button]:hidden"
            />
            {search.value && (
              <button
                type="button"
                onClick={() => search.onChange("")}
                aria-label="Clear search"
                className="-mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full hover:bg-admin-border hover:text-admin-ink"
              >
                <CloseIcon />
              </button>
            )}
          </label>
        )}
        {children}
        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </div>

      {(chips.length > 0 || summary) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 rounded-full bg-admin-green-050 py-0.5 pl-2.5 pr-1 text-admin-label font-medium text-admin-green-900 ring-1 ring-admin-green-100"
            >
              {chip.label}
              <button
                type="button"
                onClick={chip.onRemove}
                aria-label={`Remove filter: ${chip.label}`}
                className="flex h-5 w-5 items-center justify-center rounded-full text-admin-green-700 hover:bg-admin-green-100"
              >
                <CloseIcon />
              </button>
            </span>
          ))}
          {chips.length > 1 && onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              className="ml-1 text-admin-label font-medium text-admin-ink-muted hover:text-admin-ink hover:underline"
            >
              Clear all
            </button>
          )}
          {summary && (
            <span className="ml-auto text-admin-label text-admin-ink-muted" aria-live="polite">
              {summary}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3" aria-hidden="true">
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  );
}

/** A filter that stays in view: a pill-shaped select, highlighted when it is not on its first ("all") choice. */
export function QuickSelect<V extends string>({
  label,
  value,
  onChange,
  options,
  idle,
}: {
  label: string;
  value: V;
  onChange: (value: V) => void;
  options: readonly (readonly [V, string])[];
  /** The value that means "no filter"; defaults to the first option. */
  idle?: V;
}) {
  const on = value !== (idle ?? options[0]?.[0]);
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as V)}
      className={`${pillBase} pr-8 ${on ? pillOn : pillIdle}`}
    >
      {options.map(([v, text]) => (
        <option key={v} value={v}>
          {text}
        </option>
      ))}
    </select>
  );
}

/** A single date as a pill, highlighted when set. */
export function QuickDate({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <input
      type="date"
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${pillBase} ${value ? pillOn : pillIdle}`}
    />
  );
}

/** Two or three choices side by side, e.g. Active / Archived. */
export function QuickToggle<V extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: V;
  onChange: (value: V) => void;
  options: readonly (readonly [V, string])[];
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex h-9 items-center rounded-full bg-admin-surface-alt p-1">
      {options.map(([v, text]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={`h-7 rounded-full px-3 text-admin-support font-medium transition ${
            value === v ? "bg-white text-admin-ink shadow-sm" : "text-admin-ink-muted hover:text-admin-ink"
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
