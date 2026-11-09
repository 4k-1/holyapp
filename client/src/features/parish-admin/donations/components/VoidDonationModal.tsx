import { useState } from "react";
import { AdminButton, AdminField } from "@/features/parish-admin/components/AdminForm";
import { AdminModalFrame } from "@/features/parish-admin/components/AdminModalFrame";
import { voidDonation } from "../api/donationsApi";
import { donationReceiptNumber, formatAmount, formatDonationDate } from "../donationsHelpers";
import type { Donation } from "../types";

interface VoidDonationModalProps {
  donation: Donation;
  onClose: () => void;
  onVoided: () => void;
}

/** Voids a gift with a reason. The gift stays listed, marked voided, and leaves every total. */
export function VoidDonationModal({ donation, onClose, onVoided }: VoidDonationModalProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleVoid() {
    if (reason.trim().length < 5) {
      setError("Say why this donation is being voided");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await voidDonation(donation.id, reason.trim());
      onVoided();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't void this donation.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminModalFrame
      onClose={onClose}
      busy={submitting}
      panelClassName="max-w-[480px] rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_12px_40px_-6px_rgba(10,40,30,0.25)]"
    >
      <div className="flex items-start justify-between gap-3 border-b border-admin-border px-6 py-4">
        <div>
          <h3 className="font-serif text-admin-section font-semibold text-admin-ink">Void donation</h3>
          <p className="mt-0.5 text-admin-support text-admin-ink-muted">
            Receipt {donationReceiptNumber(donation)} · {formatAmount(donation.amount)} ·{" "}
            {formatDonationDate(donation.donationDate)}
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-admin-ink-muted hover:bg-admin-surface-alt"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3.5 px-6 py-5">
        <p className="text-admin-body text-admin-ink">
          The donation stays in the list, marked voided, and no longer counts toward any total. This can't be undone.
          {donation.source === "office" && " To fix a wrong amount or name instead, use Correct."}
        </p>
        <AdminField label="Reason" className="mb-0">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Entered twice by mistake"
            autoFocus
            className="w-full min-h-[76px] resize-y rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-admin-body text-admin-ink"
          />
        </AdminField>
        {error && <p className="text-admin-support font-semibold text-red-700">{error}</p>}
      </div>

      <div className="flex justify-end gap-2.5 border-t border-admin-border px-6 py-4">
        <AdminButton variant="secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </AdminButton>
        <AdminButton variant="danger" onClick={handleVoid} disabled={submitting}>
          {submitting ? "Voiding…" : "Void donation"}
        </AdminButton>
      </div>
    </AdminModalFrame>
  );
}
