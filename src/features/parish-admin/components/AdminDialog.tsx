import { useEffect, type ReactNode } from "react";

export function useDialogDismiss(onClose: () => void, busy = false) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, busy]);
}

/**
 * `data-admin-dialog-*` attributes are the contract CertificatePreviewStage uses
 * to subtract header/footer chrome from the available preview height.
 */
export function AdminDialog({
  children,
  onClose,
  busy = false,
  panelClassName = "",
}: {
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
  panelClassName?: string;
}) {
  useDialogDismiss(onClose, busy);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/45" onClick={busy ? undefined : onClose} aria-hidden="true" />
      <div
        data-admin-dialog-panel
        className={`relative z-10 flex max-h-[min(92dvh,840px)] w-full flex-col overflow-hidden rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_12px_40px_-6px_rgba(10,40,30,0.25)] ${panelClassName}`}
      >
        {children}
      </div>
    </div>
  );
}

export function AdminDialogHeader({
  title,
  subtitle,
  onClose,
  busy = false,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  return (
    <div
      data-admin-dialog-header
      className="flex shrink-0 items-start justify-between gap-3 border-b border-admin-border px-5 py-3.5"
    >
      <div>
        <h3 className="font-serif text-admin-section font-semibold text-admin-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-admin-support leading-relaxed text-admin-ink-muted">{subtitle}</p>}
      </div>
      <button
        type="button"
        onClick={onClose}
        disabled={busy}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-admin-ink-muted hover:bg-admin-surface-alt disabled:opacity-50"
        aria-label="Close"
      >
        ✕
      </button>
    </div>
  );
}

export function AdminDialogFooter({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      data-admin-dialog-footer
      className={`flex shrink-0 justify-end gap-2.5 border-t border-admin-border px-5 py-3 ${className}`}
    >
      {children}
    </div>
  );
}
