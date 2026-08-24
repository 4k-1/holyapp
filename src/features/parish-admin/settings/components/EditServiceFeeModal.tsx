// src/features/parish-admin/settings/components/EditServiceFeeModal.tsx
import { useState } from "react";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import type { ServiceFee } from "../types";

interface EditServiceFeeModalProps {
  fee: ServiceFee;
  onClose: () => void;
  onSave: (amount: number) => Promise<void>;
}

export function EditServiceFeeModal({ fee, onClose, onSave }: EditServiceFeeModalProps) {
  const [amount, setAmount] = useState(String(fee.amount));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const parsed = Number(amount);
  const isValid = amount.trim() !== "" && !isNaN(parsed) && parsed >= 0;
  const hasChanged = isValid && parsed !== fee.amount;

  async function handleSave() {
    if (!isValid) {
      setError("Enter a valid amount");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(parsed);
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 pt-8 sm:pt-12">
      <div className="absolute inset-0 bg-black/45" onClick={saving ? undefined : onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-[440px] rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_12px_40px_-6px_rgba(10,40,30,0.25)]">
        <div className="flex items-center justify-between border-b border-admin-border px-6 py-4">
          <h3 className="font-serif text-admin-section font-semibold text-admin-ink">Edit service fee</h3>
          <button
            onClick={onClose}
            disabled={saving}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-admin-ink-muted hover:bg-admin-surface-alt disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3.5 px-6 py-5">
          <p className="text-admin-support text-admin-ink-muted">
            Updating the default fee for <span className="font-semibold text-admin-ink">{fee.label}</span>.
          </p>

          <AdminField label="New default fee" className="mb-0">
            <div className="flex items-center gap-1.5">
              <span className="text-admin-ink-muted">₱</span>
              <AdminInput
                type="number"
                min="0"
                autoFocus
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                }}
              />
            </div>
            {error && <p className="mt-1.5 text-admin-label font-semibold text-red-700">{error}</p>}
          </AdminField>

          <div className="rounded-[10px] border border-admin-gold-700/30 bg-admin-gold-700/10 px-3.5 py-3 text-admin-support text-admin-gold-700">
            <p className="font-semibold">
              {hasChanged ? (
                <>
                  ₱{fee.amount} <span className="opacity-70">→</span> ₱{parsed}
                </>
              ) : (
                "Heads up"
              )}
            </p>
            <p className="mt-0.5 leading-relaxed opacity-90">
              This changes the default fee applied to all new {fee.label.toLowerCase()} requests going
              forward. Requests already submitted or currently in progress keep the fee amount that was
              in effect when they were made — this won't be applied retroactively.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 border-t border-admin-border px-6 py-4">
          <AdminButton variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </AdminButton>
          <AdminButton onClick={handleSave} disabled={!isValid || saving}>
            {saving ? "Saving…" : "Confirm & save changes"}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
