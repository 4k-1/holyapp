// src/features/parish-admin/settings/components/SettingsUI.tsx
import type { ButtonHTMLAttributes, ReactNode } from "react";

/** A bordered block inside the settings card: a title row with an optional action, then its contents. */
export function SettingsPanel({
  title,
  description,
  action,
  children,
  flush = false,
  className = "",
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  /** Contents run edge to edge, for tables and lists that draw their own rows. */
  flush?: boolean;
  className?: string;
}) {
  const hasHeader = Boolean(title || action);
  return (
    <section className={`overflow-hidden rounded-2xl border border-admin-border bg-admin-surface ${className}`}>
      {hasHeader && (
        <div className={`flex flex-wrap items-center justify-between gap-3 px-5 pt-[18px] ${flush ? "pb-4" : "pb-0"}`}>
          <div className="min-w-0">
            {title && <h3 className="font-sans text-[0.9375rem] font-semibold text-admin-ink">{title}</h3>}
            {description && <p className="mt-0.5 text-admin-support text-admin-ink-muted">{description}</p>}
          </div>
          {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
        </div>
      )}
      {children && <div className={flush ? "border-t border-admin-border" : `px-5 pb-5 ${hasHeader ? "pt-4" : "pt-5"}`}>{children}</div>}
    </section>
  );
}

/** Read-only label and value, as on a profile. */
export function SettingsField({ label, value, className = "" }: { label: string; value?: ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <dt className="text-admin-support text-admin-ink-muted">{label}</dt>
      <dd className="mt-1 break-words text-admin-body font-medium text-admin-ink">
        {value || <span className="font-normal text-admin-ink-faint">Not set</span>}
      </dd>
    </div>
  );
}

export function SettingsFieldGrid({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">{children}</dl>;
}

/** The round "Edit ✎" button on each panel. */
export function SettingsPillButton({
  children,
  icon = <PencilIcon />,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon?: ReactNode | null }) {
  return (
    <button
      type="button"
      className={`inline-flex h-9 items-center gap-1.5 rounded-full border border-admin-border bg-admin-surface px-4 text-admin-support font-semibold text-admin-ink-muted transition hover:border-admin-green-600 hover:text-admin-green-700 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-admin-green-100 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
      {icon}
    </button>
  );
}

export function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden="true">
      <path d="M12 20h9" strokeLinecap="round" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Large round initials, standing in for a photo. `text` overrides the initials taken from `name`. */
export function SettingsAvatar({ name = "", text, imageUrl }: { name?: string; text?: string; imageUrl?: string }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className="h-[72px] w-[72px] shrink-0 rounded-full border border-admin-border bg-white object-contain p-1"
      />
    );
  }
  return (
    <span className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full bg-admin-green-700 font-serif text-[1.5rem] font-semibold text-white ring-4 ring-admin-green-100">
      {text ?? initialsOf(name)}
    </span>
  );
}

/** Save and Cancel under a panel that is being edited. */
export function SettingsFormActions({
  saving,
  onSave,
  onCancel,
}: {
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-1 flex justify-end gap-2 border-t border-admin-border pt-4">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="h-9 rounded-full border border-admin-border px-4 text-admin-support font-semibold text-admin-ink hover:bg-admin-surface-alt disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="h-9 rounded-full bg-admin-green-700 px-5 text-admin-support font-semibold text-white hover:bg-admin-green-600 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}

function initialsOf(name: string) {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
