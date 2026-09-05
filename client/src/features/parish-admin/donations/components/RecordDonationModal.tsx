import { useEffect, useState } from "react";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { recordDonation } from "../api/donationsApi";
import { DONATION_TYPES } from "../types";

interface RecordDonationModalProps {
  parishId: string;
  recordedBy?: string;
  onClose: () => void;
  onRecorded: () => void;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export function RecordDonationModal({
  parishId,
  recordedBy = "u-admin",
  onClose,
  onRecorded,
}: RecordDonationModalProps) {
  const [anonymous, setAnonymous] = useState(false);
  const [donorName, setDonorName] = useState("");
  const [donationType, setDonationType] = useState<string>("Cash");
  const [amount, setAmount] = useState("");
  const [donationDate, setDonationDate] = useState(todayISO());
  const [purpose, setPurpose] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    const amt = parseFloat(amount);
    if (!anonymous && !donorName.trim()) {
      setError("Enter a donor name, or mark as anonymous");
      return;
    }
    if (!amt || amt <= 0) {
      setError("Enter a valid amount");
      return;
    }
    if (!donationDate) {
      setError("Select a donation date");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await recordDonation(
        parishId,
        {
          donorName: anonymous ? undefined : donorName.trim(),
          donationType,
          amount: amt,
          donationDate,
          purpose: purpose.trim() || undefined,
          remarks: remarks.trim() || undefined,
        },
        recordedBy
      );
      onRecorded();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 pt-8 sm:pt-12">
      <div className="absolute inset-0 bg-black/45" onClick={submitting ? undefined : onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-[520px] rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_12px_40px_-6px_rgba(10,40,30,0.25)]">
        <div className="flex items-start justify-between gap-3 border-b border-admin-border px-6 py-4">
          <div>
            <h3 className="font-serif text-admin-section font-semibold text-admin-ink">Record donation</h3>
            <p className="mt-0.5 text-admin-support text-admin-ink-muted">Log a donation received by the parish</p>
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
          <label className="flex cursor-pointer items-center gap-2.5 text-admin-body text-admin-ink">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => {
                setAnonymous(e.target.checked);
                if (e.target.checked) setDonorName("");
              }}
              className="h-4 w-4 rounded border-admin-border-strong accent-admin-green-700"
            />
            Anonymous donor
          </label>

          {!anonymous && (
            <AdminField label="Donor name" className="mb-0">
              <AdminInput
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                placeholder="e.g. Norma Marbella"
              />
            </AdminField>
          )}

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <AdminField label="Donation type" className="mb-0">
              <select
                value={donationType}
                onChange={(e) => setDonationType(e.target.value)}
                className="w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-admin-body text-admin-ink"
              >
                {DONATION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </AdminField>
            <AdminField label="Amount (₱)" className="mb-0">
              <AdminInput
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </AdminField>
          </div>

          <AdminField label="Donation date" className="mb-0">
            <AdminInput type="date" value={donationDate} onChange={(e) => setDonationDate(e.target.value)} />
          </AdminField>

          <AdminField label="Purpose (optional)" className="mb-0">
            <AdminInput
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. Church Roof Repair"
            />
          </AdminField>

          <AdminField label="Remarks (optional)" className="mb-0">
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Additional notes about this donation..."
              className="w-full min-h-[76px] resize-y rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-admin-body text-admin-ink"
            />
          </AdminField>

          {error && <p className="text-admin-support font-semibold text-red-700">{error}</p>}
        </div>

        <div className="flex justify-end gap-2.5 border-t border-admin-border px-6 py-4">
          <AdminButton variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </AdminButton>
          <AdminButton onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Recording…" : "Record donation"}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
