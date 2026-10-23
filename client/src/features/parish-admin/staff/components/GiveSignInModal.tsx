import { useState } from "react";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { addStaffAccount } from "@/features/parish-admin/settings/api/staffApi";
import type { StaffAccessRole } from "@/features/parish-admin/settings/types";
import type { ParishPerson } from "../api/personnelApi";
import { AccessOption } from "./AccessOption";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface GiveSignInModalProps {
  person: ParishPerson;
  onClose: () => void;
  onDone: () => void;
}

/** Creates a sign-in for someone already on the Staff list; they keep their name, role and schedule. */
export function GiveSignInModal({ person, onClose, onDone }: GiveSignInModalProps) {
  const [email, setEmail] = useState(person.contact.includes("@") ? person.contact : "");
  const [accessRole, setAccessRole] = useState<StaffAccessRole>("staff");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!EMAIL_RE.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await addStaffAccount({
        personnelId: person.id,
        name: person.name,
        role: person.role,
        email: email.trim(),
        accessRole,
      });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create this sign-in.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 pt-8 sm:pt-12">
      <div className="absolute inset-0 bg-black/45" onClick={saving ? undefined : onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="give-sign-in-title"
        className="relative z-10 w-full max-w-[500px] rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_12px_40px_-6px_rgba(10,40,30,0.25)]"
      >
        <div className="border-b border-admin-border px-6 py-4">
          <h3 id="give-sign-in-title" className="font-serif text-admin-section font-semibold text-admin-ink">
            Give {person.name} a sign-in
          </h3>
          <p className="mt-0.5 text-admin-support text-admin-ink-muted">
            {person.role} · They stay on the Staff list with the same name, role, and assigned events.
          </p>
        </div>

        <div className="space-y-3.5 px-6 py-5">
          <AdminField label="Email address" className="mb-0">
            <AdminInput
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              placeholder="name@parish.ph"
              autoFocus
            />
          </AdminField>

          <AdminField label="Access level" className="mb-0">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <AccessOption
                selected={accessRole === "staff"}
                title="Staff access"
                description="Records, requests, donations, and schedule."
                onSelect={() => setAccessRole("staff")}
              />
              <AccessOption
                selected={accessRole === "admin"}
                title="Admin access"
                description="Everything in Staff, plus Settings, Service Fees, and Staff Accounts."
                onSelect={() => setAccessRole("admin")}
              />
            </div>
          </AdminField>

          <p className="text-admin-support text-admin-ink-muted">
            They can choose their own password with "Forgot password?" on the sign-in page.
          </p>
          {error && <p className="text-admin-support font-semibold text-red-700">{error}</p>}
        </div>

        <div className="flex justify-end gap-2.5 border-t border-admin-border px-6 py-4">
          <AdminButton variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </AdminButton>
          <AdminButton onClick={handleSave} disabled={saving}>
            {saving ? "Creating…" : "Create sign-in"}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}
