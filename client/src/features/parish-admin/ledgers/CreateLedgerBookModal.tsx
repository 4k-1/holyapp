import { useState, type FormEvent } from "react";
import { AdminDialog, AdminDialogFooter, AdminDialogHeader } from "@/features/parish-admin/components/AdminDialog";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { ledgerSacramentLabel } from "@/features/parish-admin/ledgers/ledgersHelpers";
import type { LedgerBookCreateInput } from "@/features/parish-admin/ledgers/types";
import type { SacramentType } from "@/types";

interface CreateLedgerBookModalProps {
  sacramentType: SacramentType;
  onClose: () => void;
  onSubmit: (input: LedgerBookCreateInput) => Promise<void>;
}

export function CreateLedgerBookModal({ sacramentType, onClose, onSubmit }: CreateLedgerBookModalProps) {
  const [volumeLabel, setVolumeLabel] = useState("");
  const [yearStart, setYearStart] = useState("");
  const [yearEnd, setYearEnd] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canSave = Boolean(volumeLabel.trim() && yearStart && !submitting);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSubmitting(true);
    setError("");
    try {
      const start = Number(yearStart);
      const end = yearEnd ? Number(yearEnd) : start;
      await onSubmit({
        sacramentType,
        title: `${ledgerSacramentLabel(sacramentType)} Register ${volumeLabel.trim()}`,
        volumeLabel: volumeLabel.trim(),
        yearStart: Math.min(start, end),
        yearEnd: Math.max(start, end),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start this book.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminDialog onClose={onClose} busy={submitting} panelClassName="max-w-[460px]">
      <AdminDialogHeader
        title="Start a new register book"
        subtitle={`Creates an empty ${ledgerSacramentLabel(sacramentType).toLowerCase()} register shell to scan pages into.`}
        onClose={onClose}
        busy={submitting}
      />
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <AdminField label="Book label">
            <AdminInput
              value={volumeLabel}
              onChange={(e) => setVolumeLabel(e.target.value)}
              placeholder="e.g. Book 7"
              required
            />
          </AdminField>
          <div className="grid grid-cols-2 gap-3">
            <AdminField label="Year start">
              <AdminInput
                type="number"
                min={1500}
                max={2100}
                value={yearStart}
                onChange={(e) => setYearStart(e.target.value)}
                placeholder="2026"
                required
              />
            </AdminField>
            <AdminField label="Year end (optional)">
              <AdminInput
                type="number"
                min={1500}
                max={2100}
                value={yearEnd}
                onChange={(e) => setYearEnd(e.target.value)}
                placeholder="2026"
              />
            </AdminField>
          </div>
          {error && (
            <p className="mt-2 rounded-md border border-[#E3C3BC] bg-admin-red-100 px-3.5 py-2.5 text-admin-support text-admin-red-700">
              {error}
            </p>
          )}
        </div>
        <AdminDialogFooter>
          <AdminButton variant="secondary" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" disabled={!canSave}>
            {submitting ? "Starting…" : "Start book"}
          </AdminButton>
        </AdminDialogFooter>
      </form>
    </AdminDialog>
  );
}
