// src/features/parish-admin/settings/components/Disable2FAModal.tsx
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import { AdminModalFrame } from "@/features/parish-admin/components/AdminModalFrame";

interface Disable2FAModalProps {
  saving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function Disable2FAModal({ saving, onClose, onConfirm }: Disable2FAModalProps) {
  return (
    <AdminModalFrame
      onClose={onClose}
      busy={saving}
      panelClassName="max-w-[420px] rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_12px_40px_-6px_rgba(10,40,30,0.25)]"
    >
      <div className="flex items-center justify-between border-b border-admin-border px-6 py-4">
        <h3 className="font-serif text-admin-section font-semibold text-admin-ink">Turn off two-factor authentication?</h3>
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
        <div className="rounded-md border border-admin-gold-700/30 bg-admin-gold-700/10 px-3.5 py-3 text-admin-support text-admin-gold-700">
          <p className="font-semibold">This makes your account easier to break into.</p>
          <p className="mt-0.5 leading-relaxed opacity-90">
            Anyone who gets hold of your password will be able to sign in immediately — no email code
            required. You can turn two-factor authentication back on at any time.
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2.5 border-t border-admin-border px-6 py-4">
        <AdminButton variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </AdminButton>
        <AdminButton variant="danger" onClick={onConfirm} disabled={saving}>
          {saving ? "Turning off…" : "Turn off 2FA"}
        </AdminButton>
      </div>
    </AdminModalFrame>
  );
}
