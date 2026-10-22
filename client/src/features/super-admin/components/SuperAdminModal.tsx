import type { ReactNode } from "react";
import { useDialogDismiss } from "@/features/parish-admin/components/useDialogDismiss";

export function SuperAdminModal({
  title,
  children,
  footer,
  onClose,
  busy = false,
  widthClass = "max-w-[420px]",
}: {
  title: string;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
  busy?: boolean;
  widthClass?: string;
}) {
  useDialogDismiss(onClose, busy);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[rgba(20,30,25,0.35)]"
        onClick={busy ? undefined : onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sa-modal-title"
        className={`relative z-10 w-full overflow-hidden rounded-xl bg-admin-surface shadow-[0_20px_50px_rgba(0,0,0,0.2)] ${widthClass}`}
      >
        <div className="flex items-center justify-between border-b border-admin-border px-5 py-4">
          <h3 id="sa-modal-title" className="font-sans text-[15px] font-bold text-admin-ink">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex h-7 w-7 items-center justify-center rounded text-lg leading-none text-admin-ink-faint hover:text-admin-ink disabled:opacity-40"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="flex flex-col gap-3 px-5 py-[18px]">{children}</div>
        <div className="flex justify-end gap-2 border-t border-admin-border px-5 py-3.5">{footer}</div>
      </div>
    </div>
  );
}

export function SaField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="mb-[5px] text-[11.5px] font-bold text-admin-ink-muted">{label}</p>
      {children}
    </div>
  );
}

export const saInputClass =
  "w-full rounded-lg border border-admin-border bg-white px-2.5 py-[9px] font-sans text-[13px] text-admin-ink outline-none focus:border-admin-green-600";

export const saBtnPrimary =
  "rounded-lg bg-admin-green-700 px-3.5 py-2 text-[12.5px] font-bold text-white hover:bg-admin-green-900 disabled:cursor-not-allowed disabled:opacity-45";

export const saBtnSecondary =
  "rounded-lg border border-admin-border bg-white px-3.5 py-2 text-[12.5px] font-bold text-admin-ink-muted hover:bg-admin-surface-alt disabled:cursor-not-allowed disabled:opacity-45";

export const saBtnDanger =
  "text-[12px] font-bold text-admin-red-700 hover:text-admin-red-700/80";

export const saBtnLink =
  "text-[12px] font-bold text-admin-green-700 hover:text-admin-green-900";

export function SuperAdminToast({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed bottom-6 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-2 rounded-[9px] bg-admin-ink px-[18px] py-[11px] text-[12.8px] font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
    >
      <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-admin-gold-600" />
      {message}
    </div>
  );
}
