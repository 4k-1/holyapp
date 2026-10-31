import type { ReactNode } from "react";

interface AdminStatCardProps {
  label: string;
  value: ReactNode;
  /** Small line under the number, e.g. "+3 this week". */
  hint?: ReactNode;
  /** Optional glyph shown in a soft chip at the top right. */
  icon?: ReactNode;
  /** Marks the card as the current filter when the card is clickable. */
  active?: boolean;
  onClick?: () => void;
}

/**
 * The one summary-number card used across the parish admin portal. The label area always reserves two lines,
 * so numbers line up across a row no matter how long each label is.
 */
export function AdminStatCard({ label, value, hint, icon, active = false, onClick }: AdminStatCardProps) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p
          className={`line-clamp-2 min-h-[2.5em] text-[0.8125rem] font-medium leading-[1.25] ${
            active ? "text-admin-green-900" : "text-admin-ink-muted"
          }`}
        >
          {label}
        </p>
        {icon && (
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-admin-green-050 text-admin-green-700"
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 font-sans text-[1.75rem] font-semibold leading-none tracking-[-0.02em] tabular-nums text-admin-ink">
        {value}
      </p>
      {hint && <p className="mt-2 text-admin-label text-admin-ink-muted">{hint}</p>}
    </>
  );

  const base = "flex w-full flex-col rounded-[var(--radius)] border bg-admin-surface px-4 py-4 text-left shadow-[var(--shadow-card)]";
  if (!onClick) {
    return <div className={`${base} border-admin-border`}>{body}</div>;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`${base} transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-green-600/40 ${
        active
          ? "border-admin-green-700 bg-admin-green-050 shadow-[inset_0_0_0_1px_var(--color-admin-green-700)]"
          : "border-admin-border hover:border-admin-border-strong"
      }`}
    >
      {body}
    </button>
  );
}
