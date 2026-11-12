import { useState } from "react";
import { AdminButton, AdminField } from "@/features/parish-admin/components/AdminForm";
import { AdminModalFrame } from "@/features/parish-admin/components/AdminModalFrame";
import { bounceDonation, clearDonation } from "../api/donationsApi";
import { donationReceiptNumber, formatAmount, formatDonationDate } from "../donationsHelpers";
import type { Donation } from "../types";

interface SettleDonationModalProps {
  donation: Donation;
  outcome: "cleared" | "bounced";
  onClose: () => void;
  onDone: () => void;
}

/**
 * D4: marks a pending cheque or transfer cleared (it starts counting) or bounced (with a reason;
 * it never counts). Admins only. Once marked it stays; a mistake is fixed with Void or Correct.
 */
export function SettleDonationModal({ donation, outcome, onClose, onDone }: SettleDonationModalProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const bounced = outcome === "bounced";
  const what = donation.donationType === "Check" ? "cheque" : "transfer";
  const reference = [donation.reference, donation.bank].filter(Boolean).join(" · ");

  async function handleSubmit() {
    if (bounced && reason.trim().length < 5) {
      setError(`Say why the ${what} bounced`);
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      if (bounced) await bounceDonation(donation.id, reason.trim());
      else await clearDonation(donation.id);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save this.");
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
          <h3 className="font-serif text-admin-section font-semibold text-admin-ink">
            {bounced ? `Mark ${what} bounced` : `Mark ${what} cleared`}
          </h3>
          <p className="mt-0.5 text-admin-support text-admin-ink-muted">
            Receipt {donationReceiptNumber(donation)} · {formatAmount(donation.amount)} ·{" "}
            {formatDonationDate(donation.donationDate)}
            {reference ? ` · ${reference}` : ""}
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
          {bounced
            ? `The gift stays in the list, marked bounced, and never counts toward any total. The receipt keeps its number and prints as BOUNCED.`
            : `Only do this once the money is in the parish's bank account. The gift then counts toward the totals.`}{" "}
          This can't be changed later.
        </p>
        {bounced && (
          <AdminField label="Reason" className="mb-0">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Insufficient funds"
              autoFocus
              className="w-full min-h-[76px] resize-y rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-admin-body text-admin-ink"
            />
          </AdminField>
        )}
        {error && <p className="text-admin-support font-semibold text-red-700">{error}</p>}
      </div>

      <div className="flex justify-end gap-2.5 border-t border-admin-border px-6 py-4">
        <AdminButton variant="secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </AdminButton>
        <AdminButton variant={bounced ? "danger" : "primary"} onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Saving…" : bounced ? "Mark bounced" : "Mark cleared"}
        </AdminButton>
      </div>
    </AdminModalFrame>
  );
}
