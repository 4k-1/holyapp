// src/features/parish-admin/settings/components/SignOutAllSessionsModal.tsx
import { useState } from "react";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";

interface SignOutAllSessionsModalProps {
  count: number;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function SignOutAllSessionsModal({ count, onClose, onConfirm }: SignOutAllSessionsModalProps) {
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    setSaving(true);
    try {
      await onConfirm();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 pt-8 sm:pt-12">
      <div className="absolute inset-0 bg-black/45" onClick={saving ? undefined : onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-[420px] rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_12px_40px_-6px_rgba(10,40,30,0.25)]">
        <div className="flex items-center justify-between border-b border-admin-border px-6 py-4">
          <h3 className="font-serif text-lg font-semibold text-admin-ink">Sign out of other sessions?</h3>
          <button
            onClick={onClose}
            disabled={saving}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-admin-ink-muted hover:bg-admin-surface-alt disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5">
          <p className="text-[13.5px] text-admin-ink">
            This immediately signs out <span className="font-semibold">{count}</span> other{" "}
            {count === 1 ? "device" : "devices"} currently logged in to this account. This device stays signed in.
          </p>
          <p className="mt-2 text-[12.5px] text-admin-ink-muted">
            Anyone using those devices will need to sign in again with the password and, if enabled, a
            two-factor code.
          </p>
        </div>

        <div className="flex justify-end gap-2.5 border-t border-admin-border px-6 py-4">
          <AdminButton variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </AdminButton>
          <AdminButton variant="danger" onClick={handleConfirm} disabled={saving}>
            {saving ? "Signing out…" : "Sign out of other sessions"}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
