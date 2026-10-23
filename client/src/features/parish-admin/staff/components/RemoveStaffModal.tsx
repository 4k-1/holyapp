import { useState } from "react";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import { removePerson, type ParishPerson } from "../api/personnelApi";

interface RemoveStaffModalProps {
  person: ParishPerson;
  onClose: () => void;
  onRemoved: () => void;
}

export function RemoveStaffModal({ person, onClose, onRemoved }: RemoveStaffModalProps) {
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");

  async function handleRemove() {
    setRemoving(true);
    setError("");
    try {
      await removePerson(person.id);
      onRemoved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove this person.");
      setRemoving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 pt-8 sm:pt-12">
      <div className="absolute inset-0 bg-black/45" onClick={removing ? undefined : onClose} aria-hidden="true" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="remove-staff-title"
        className="relative z-10 w-full max-w-[420px] rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_12px_40px_-6px_rgba(10,40,30,0.25)]"
      >
        <div className="px-6 py-5">
          <h3 id="remove-staff-title" className="font-serif text-admin-section font-semibold text-admin-ink">
            Remove {person.name}?
          </h3>
          <p className="mt-2 text-admin-body text-admin-ink-muted">
            They will no longer appear on the staff list or when assigning events. Events already assigned to them
            keep their name. This can't be undone; to keep them on record, set them inactive instead.
          </p>
          {error && <p className="mt-3 text-admin-support font-semibold text-red-700">{error}</p>}
        </div>
        <div className="flex justify-end gap-2.5 border-t border-admin-border px-6 py-4">
          <AdminButton variant="secondary" onClick={onClose} disabled={removing}>
            Cancel
          </AdminButton>
          <AdminButton variant="danger" onClick={handleRemove} disabled={removing}>
            {removing ? "Removing…" : "Remove"}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
