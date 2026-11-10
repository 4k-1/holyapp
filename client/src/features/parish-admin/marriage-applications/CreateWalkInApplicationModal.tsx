import { useState, type FormEvent } from "react";
import { AdminDialog, AdminDialogFooter, AdminDialogHeader } from "@/features/parish-admin/components/AdminDialog";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { createMarriageApplication } from "@/features/parish-admin/marriage-applications/api/marriageApplicationsApi";

interface CreateWalkInApplicationModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export function CreateWalkInApplicationModal({ onClose, onCreated }: CreateWalkInApplicationModalProps) {
  const [groomFirstName, setGroomFirstName] = useState("");
  const [groomMiddleName, setGroomMiddleName] = useState("");
  const [groomLastName, setGroomLastName] = useState("");
  const [brideFirstName, setBrideFirstName] = useState("");
  const [brideMiddleName, setBrideMiddleName] = useState("");
  const [brideLastName, setBrideLastName] = useState("");
  const [parishionerEmail, setParishionerEmail] = useState("");
  const [dispensationNeeded, setDispensationNeeded] = useState(false);
  const [dispensationNotes, setDispensationNotes] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canSave =
    Boolean(groomFirstName.trim() && groomLastName.trim() && brideFirstName.trim() && brideLastName.trim()) &&
    !submitting;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSubmitting(true);
    setError("");
    try {
      await createMarriageApplication({
        groomFirstName: groomFirstName.trim(),
        groomMiddleName: groomMiddleName.trim() || undefined,
        groomLastName: groomLastName.trim(),
        brideFirstName: brideFirstName.trim(),
        brideMiddleName: brideMiddleName.trim() || undefined,
        brideLastName: brideLastName.trim(),
        parishionerEmail: parishionerEmail.trim() || undefined,
        remarks: remarks.trim() || undefined,
        dispensationNeeded,
        dispensationNotes: dispensationNotes.trim() || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the application.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminDialog onClose={onClose} busy={submitting} panelClassName="max-w-[560px]">
      <AdminDialogHeader
        title="New walk-in application"
        subtitle="Record a couple who applied in person at the parish office."
        onClose={onClose}
        busy={submitting}
      />
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-6 py-5">
          <p className="text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">Groom</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <AdminField label="First name" className="mb-0">
              <AdminInput value={groomFirstName} onChange={(e) => setGroomFirstName(e.target.value)} />
            </AdminField>
            <AdminField label="Middle name" className="mb-0">
              <AdminInput value={groomMiddleName} onChange={(e) => setGroomMiddleName(e.target.value)} />
            </AdminField>
            <AdminField label="Last name" className="mb-0">
              <AdminInput value={groomLastName} onChange={(e) => setGroomLastName(e.target.value)} />
            </AdminField>
          </div>
          <p className="text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">Bride</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <AdminField label="First name" className="mb-0">
              <AdminInput value={brideFirstName} onChange={(e) => setBrideFirstName(e.target.value)} />
            </AdminField>
            <AdminField label="Middle name" className="mb-0">
              <AdminInput value={brideMiddleName} onChange={(e) => setBrideMiddleName(e.target.value)} />
            </AdminField>
            <AdminField label="Last name" className="mb-0">
              <AdminInput value={brideLastName} onChange={(e) => setBrideLastName(e.target.value)} />
            </AdminField>
          </div>
          <AdminField label="Their parishioner account email (optional)" className="mb-0">
            <AdminInput
              type="email"
              value={parishionerEmail}
              onChange={(e) => setParishionerEmail(e.target.value)}
              placeholder="So they can track it online. Blank if they have no account."
            />
          </AdminField>
          <label className="flex items-center gap-2 text-admin-body text-admin-ink">
            <input
              type="checkbox"
              checked={dispensationNeeded}
              onChange={(e) => setDispensationNeeded(e.target.checked)}
            />
            Dispensation needed
          </label>
          {dispensationNeeded && (
            <AdminField label="Dispensation notes" className="mb-0">
              <AdminInput value={dispensationNotes} onChange={(e) => setDispensationNotes(e.target.value)} />
            </AdminField>
          )}
          <AdminField label="Remarks" className="mb-0">
            <AdminInput value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </AdminField>
          {error && <p className="text-admin-support text-admin-red-700">{error}</p>}
        </div>
        <AdminDialogFooter>
          <AdminButton type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" disabled={!canSave}>
            {submitting ? "Saving…" : "Create application"}
          </AdminButton>
        </AdminDialogFooter>
      </form>
    </AdminDialog>
  );
}
