import { useState } from "react";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import { confirmCertificatePrint, spoilCertificate } from "@/features/parish-admin/requests/api/requestsAdminApi";

interface PrintCheckProps {
  certificateId: string;
  code: string;
  /** "No, reprint": opens the window's own reprint step. Left out where reprinting isn't offered. */
  onReprint?: () => void;
  onConfirmed: () => void;
  onSpoiled: () => void;
}

/**
 * "Did it print correctly?" after a copy is printed (A3). Yes confirms the copy; Spoiled voids it
 * with a reason, keeping its number. Unanswered copies stay on the dashboard as not confirmed.
 */
export function PrintCheck({ certificateId, code, onReprint, onConfirmed, onSpoiled }: PrintCheckProps) {
  const [spoiling, setSpoiling] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      await confirmCertificatePrint(certificateId);
      onConfirmed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function spoil() {
    if (reason.trim().length < 5) {
      setError("Say what was wrong with the printout.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await spoilCertificate(certificateId, reason.trim());
      onSpoiled();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full rounded-[10px] border border-admin-gold-700/30 bg-admin-gold-700/10 px-4 py-3">
      {!spoiling ? (
        <div className="flex flex-wrap items-center gap-2.5">
          <p className="mr-auto text-admin-body font-semibold text-admin-ink">Did {code} print correctly?</p>
          <AdminButton size="sm" onClick={confirm} disabled={busy}>
            Yes
          </AdminButton>
          {onReprint && (
            <AdminButton size="sm" variant="secondary" onClick={onReprint} disabled={busy}>
              No, reprint
            </AdminButton>
          )}
          <AdminButton
            size="sm"
            variant="secondary"
            onClick={() => {
              setError("");
              setSpoiling(true);
            }}
            disabled={busy}
          >
            Spoiled
          </AdminButton>
        </div>
      ) : (
        <div className="space-y-2.5">
          <p className="text-admin-body text-admin-ink">
            <span className="font-semibold">Void {code} as spoiled.</span> It can't be used and its QR code will show it as
            void. The number stays used. Issue a new copy for the parishioner afterwards.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What was wrong? e.g. Ink smeared across the name"
            aria-label="What was wrong with the printout"
            autoFocus
            className="w-full min-h-[64px] resize-y rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-admin-body text-admin-ink"
          />
          <div className="flex justify-end gap-2">
            <AdminButton size="sm" variant="secondary" onClick={() => setSpoiling(false)} disabled={busy}>
              Back
            </AdminButton>
            <AdminButton size="sm" variant="danger" onClick={spoil} disabled={busy}>
              {busy ? "Voiding…" : "Void as spoiled"}
            </AdminButton>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-admin-support font-semibold text-red-700">{error}</p>}
    </div>
  );
}
