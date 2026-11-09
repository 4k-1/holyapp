import { useState } from "react";
import { AdminButton, AdminField, AdminInput, AdminSelect } from "@/features/parish-admin/components/AdminForm";
import { findFund, FUNDS } from "@/lib/funds";
import { correctDonation, recordDonation } from "../api/donationsApi";
import { donationReceiptNumber } from "../donationsHelpers";
import { CLEARING_TYPES, DONATION_TYPES, type Donation } from "../types";
import { AdminModalFrame } from "@/features/parish-admin/components/AdminModalFrame";

interface RecordDonationModalProps {
  parishId: string;
  /** When set, the form corrects this gift: it's voided and the corrected gift saved with a new receipt number. */
  correcting?: Donation;
  onClose: () => void;
  onRecorded: () => void;
}

/** The dropdown's value for a typed purpose that isn't one of the listed funds. */
const OTHER = "__other";

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function RecordDonationModal({
  parishId,
  correcting,
  onClose,
  onRecorded,
}: RecordDonationModalProps) {
  const [anonymous, setAnonymous] = useState(Boolean(correcting && !correcting.donorName));
  const [donorName, setDonorName] = useState(correcting?.donorName ?? "");
  const [donationType, setDonationType] = useState<string>(correcting?.donationType ?? "Cash");
  const [amount, setAmount] = useState(correcting ? String(correcting.amount) : "");
  const [donationDate, setDonationDate] = useState(correcting?.donationDate ?? todayISO());
  // A listed fund, or "Other" with the purpose typed in. New gifts start on the General fund.
  const listed = findFund(correcting?.purpose);
  const [fund, setFund] = useState(listed ? listed.name : correcting?.purpose ? OTHER : FUNDS[0].name);
  const [otherPurpose, setOtherPurpose] = useState(listed ? "" : (correcting?.purpose ?? ""));
  const [remarks, setRemarks] = useState(correcting?.remarks ?? "");
  // D4: cheque number and bank, or the transfer reference.
  const [reference, setReference] = useState(correcting?.reference ?? "");
  const [bank, setBank] = useState(correcting?.bank ?? "");
  const needsClearing = CLEARING_TYPES.includes(donationType);
  const [reason, setReason] = useState("");
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
    if (donationType === "Check" && !reference.trim()) {
      setError("Enter the cheque number");
      return;
    }
    if (fund === OTHER && !otherPurpose.trim()) {
      setError("Type what the donation is for, or choose a fund");
      return;
    }
    if (correcting && reason.trim().length < 5) {
      setError("Say why this donation is being corrected");
      return;
    }
    setError("");
    setSubmitting(true);
    const input = {
      donorName: anonymous ? undefined : donorName.trim(),
      donationType,
      amount: amt,
      donationDate,
      purpose: fund === OTHER ? otherPurpose.trim() : fund,
      remarks: remarks.trim() || undefined,
      reference: needsClearing ? reference.trim() || undefined : undefined,
      bank: donationType === "Check" ? bank.trim() || undefined : undefined,
    };
    try {
      if (correcting) await correctDonation(correcting.id, { ...input, reason: reason.trim() });
      else await recordDonation(parishId, input);
      onRecorded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't record this donation.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminModalFrame
      onClose={onClose}
      busy={submitting}
      panelClassName="max-w-[520px] rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_12px_40px_-6px_rgba(10,40,30,0.25)]"
    >
      <div className="flex items-start justify-between gap-3 border-b border-admin-border px-6 py-4">
        <div>
          <h3 className="font-serif text-admin-section font-semibold text-admin-ink">
            {correcting ? "Correct donation" : "Record donation"}
          </h3>
          <p className="mt-0.5 text-admin-support text-admin-ink-muted">
            {correcting
              ? `Receipt ${donationReceiptNumber(correcting)} will be voided and the corrected gift saved with a new receipt number.`
              : "Log a donation received by the parish"}
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

        {needsClearing && (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <AdminField label={donationType === "Check" ? "Cheque number" : "Transfer reference (optional)"} className="mb-0">
              <AdminInput
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder={donationType === "Check" ? "e.g. 0012345" : "e.g. FT2611090001"}
              />
            </AdminField>
            {donationType === "Check" && (
              <AdminField label="Bank (optional)" className="mb-0">
                <AdminInput value={bank} onChange={(e) => setBank(e.target.value)} placeholder="e.g. BDO" />
              </AdminField>
            )}
            <p className="text-admin-support text-admin-ink-muted sm:col-span-2">
              Saved as waiting to clear. It counts in the totals once an admin marks it cleared.
            </p>
          </div>
        )}

        <AdminField label="Donation date" className="mb-0">
          <AdminInput type="date" value={donationDate} onChange={(e) => setDonationDate(e.target.value)} />
        </AdminField>

        <AdminField label="Fund" className="mb-0">
          <AdminSelect value={fund} onChange={(e) => setFund(e.target.value)}>
            <optgroup label="Parish funds">
              {FUNDS.filter((f) => !f.mustRemit).map((f) => (
                <option key={f.name} value={f.name}>
                  {f.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="For the diocese">
              {FUNDS.filter((f) => f.mustRemit).map((f) => (
                <option key={f.name} value={f.name}>
                  {f.name}
                </option>
              ))}
            </optgroup>
            <option value={OTHER}>Other…</option>
          </AdminSelect>
        </AdminField>

        {fund === OTHER && (
          <AdminField label="What is it for?" className="mb-0">
            <AdminInput
              value={otherPurpose}
              onChange={(e) => setOtherPurpose(e.target.value)}
              placeholder="e.g. Bell tower"
              autoFocus
            />
          </AdminField>
        )}

        <AdminField label="Remarks (optional)" className="mb-0">
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Additional notes about this donation..."
            className="w-full min-h-[76px] resize-y rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-admin-body text-admin-ink"
          />
        </AdminField>

        {correcting && (
          <AdminField label="Reason for the correction" className="mb-0">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Typed ₱5,000 instead of ₱500"
              className="w-full min-h-[64px] resize-y rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-admin-body text-admin-ink"
            />
          </AdminField>
        )}

        {error && <p className="text-admin-support font-semibold text-red-700">{error}</p>}
      </div>

      <div className="flex justify-end gap-2.5 border-t border-admin-border px-6 py-4">
        <AdminButton variant="secondary" onClick={onClose} disabled={submitting}>
          Cancel
        </AdminButton>
        <AdminButton onClick={handleSubmit} disabled={submitting}>
          {correcting ? (submitting ? "Saving…" : "Save correction") : submitting ? "Recording…" : "Record donation"}
        </AdminButton>
      </div>
    </AdminModalFrame>
  );
}
