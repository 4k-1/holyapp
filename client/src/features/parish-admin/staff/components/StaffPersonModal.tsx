import { useState } from "react";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { addPerson, updatePerson, type ParishPerson } from "../api/personnelApi";

interface StaffPersonModalProps {
  person?: ParishPerson;
  roles: string[];
  onClose: () => void;
  onSaved: (person: ParishPerson) => void;
}

/** Adds someone to the staff list, or edits their role and contact. */
export function StaffPersonModal({ person, roles, onClose, onSaved }: StaffPersonModalProps) {
  const [name, setName] = useState(person?.name ?? "");
  const [role, setRole] = useState(person?.role ?? roles[0] ?? "Parish Priest");
  const [contact, setContact] = useState(person?.contact ?? "");
  const [status, setStatus] = useState<"active" | "inactive">(person?.status ?? "active");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const nameLocked = Boolean(person?.hasAccount);

  async function handleSave() {
    if (!name.trim()) {
      setError("Enter a name.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const input = {
        role,
        contact: contact.trim(),
        ...(nameLocked ? {} : { name: name.trim() }),
        ...(person && !nameLocked ? { status } : {}),
      };
      onSaved(person ? await updatePerson(person.id, input) : await addPerson(input));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save this person.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 pt-8 sm:pt-12">
      <div className="absolute inset-0 bg-black/45" onClick={saving ? undefined : onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-person-title"
        className="relative z-10 w-full max-w-[460px] rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_12px_40px_-6px_rgba(10,40,30,0.25)]"
      >
        <div className="border-b border-admin-border px-6 py-4">
          <h3 id="staff-person-title" className="font-serif text-admin-section font-semibold text-admin-ink">
            {person ? "Edit staff" : "Add staff"}
          </h3>
          <p className="mt-0.5 text-admin-support text-admin-ink-muted">
            {person?.hasAccount
              ? "Their name and status follow their staff account. Change those under Settings → Staff Accounts."
              : "This doesn't create a sign-in. If they need to use the system, choose Give sign-in on their row."}
          </p>
        </div>
        <div className="space-y-3.5 px-6 py-5">
          <AdminField label="Full name" className="mb-0">
            <AdminInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Fr. Juan Santos"
              disabled={nameLocked}
              autoFocus={!nameLocked}
            />
          </AdminField>
          <AdminField label="Role" className="mb-0">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-admin-body text-admin-ink"
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Contact (optional)" className="mb-0">
            <AdminInput value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Mobile number or email" />
          </AdminField>
          {person && !nameLocked && (
            <AdminField label="Status" className="mb-0">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
                className="w-full rounded-lg border border-admin-border bg-admin-surface px-3 py-2 text-admin-body text-admin-ink"
              >
                <option value="active">Active: can be assigned to events</option>
                <option value="inactive">Inactive: kept on record, not assignable</option>
              </select>
            </AdminField>
          )}
          {error && <p className="text-admin-support font-semibold text-red-700">{error}</p>}
        </div>
        <div className="flex justify-end gap-2.5 border-t border-admin-border px-6 py-4">
          <AdminButton variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </AdminButton>
          <AdminButton onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : person ? "Save" : "Add staff"}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
