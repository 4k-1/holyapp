// src/features/parish-admin/settings/components/StaffAccountModal.tsx
import { useState } from "react";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { STAFF_ROLES } from "../types";
import type { NewStaffInput, StaffAccessRole, StaffAccount, StaffRole } from "../types";

const selectClass =
  "w-full rounded-[7px] border border-admin-border-strong bg-white px-[11px] py-[9px] text-admin-body text-admin-ink focus:border-admin-green-600 focus:outline-none focus:ring-2 focus:ring-admin-green-600/25";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface StaffAccountModalProps {
  /** Existing account when editing; omitted when adding a new one. */
  account?: StaffAccount;
  /** True when editing the currently signed-in account — blocks self-demotion out of admin access. */
  isSelf?: boolean;
  onClose: () => void;
  onSave: (input: NewStaffInput) => Promise<void>;
}

export function StaffAccountModal({ account, isSelf = false, onClose, onSave }: StaffAccountModalProps) {
  const isEditing = !!account;
  const [name, setName] = useState(account?.name ?? "");
  const [email, setEmail] = useState(account?.email ?? "");
  const [role, setRole] = useState<StaffRole>(account?.role ?? STAFF_ROLES[0]);
  const [accessRole, setAccessRole] = useState<StaffAccessRole>(account?.accessRole ?? "staff");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const accessChanged = isEditing && accessRole !== account!.accessRole;
  const lockAdminAccess = isSelf && account?.accessRole === "admin";

  async function handleSave() {
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({ name: name.trim(), email: email.trim(), role, accessRole });
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto p-4 pt-8 sm:pt-12">
      <div className="absolute inset-0 bg-black/45" onClick={saving ? undefined : onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-[500px] rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_12px_40px_-6px_rgba(10,40,30,0.25)]">
        <div className="flex items-center justify-between border-b border-admin-border px-6 py-4">
          <h3 className="font-serif text-admin-section font-semibold text-admin-ink">
            {isEditing ? "Edit staff account" : "Add staff account"}
          </h3>
          <button
            onClick={onClose}
            disabled={saving}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-admin-ink-muted hover:bg-admin-surface-alt disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3.5 px-6 py-5">
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <AdminField label="Full name" className="mb-0">
              <AdminInput
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                placeholder="e.g. Fr. Juan Santos"
              />
            </AdminField>
            <AdminField label="Email address" className="mb-0">
              <AdminInput
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                placeholder="name@parish.ph"
              />
            </AdminField>
          </div>

          <AdminField label="Role" className="mb-0">
            <select value={role} onChange={(e) => setRole(e.target.value as StaffRole)} className={selectClass}>
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </AdminField>

          <AdminField label="Access level" className="mb-0">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <AccessOption
                selected={accessRole === "staff"}
                disabled={lockAdminAccess}
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
            {lockAdminAccess && (
              <p className="mt-1.5 text-admin-label text-admin-ink-faint">
                You can't remove your own admin access.
              </p>
            )}
          </AdminField>

          {accessChanged && (
            <div className="rounded-[10px] border border-admin-gold-700/30 bg-admin-gold-700/10 px-3.5 py-3 text-admin-support text-admin-gold-700">
              <p className="font-semibold">
                {account!.accessRole === "admin" ? "Admin" : "Staff"} access{" "}
                <span className="opacity-70">→</span> {accessRole === "admin" ? "Admin" : "Staff"} access
              </p>
              <p className="mt-0.5 leading-relaxed opacity-90">
                {accessRole === "admin"
                  ? `${name.trim() || "This account"} will immediately gain access to Settings, Service Fees, and Staff Accounts — including the ability to manage other staff and admins.`
                  : `${name.trim() || "This account"} will immediately lose access to Settings, Service Fees, and Staff Accounts.`}
              </p>
            </div>
          )}

          {error && <p className="text-admin-support font-semibold text-red-700">{error}</p>}
        </div>

        <div className="flex justify-end gap-2.5 border-t border-admin-border px-6 py-4">
          <AdminButton variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </AdminButton>
          <AdminButton onClick={handleSave} disabled={saving}>
            {saving
              ? "Saving…"
              : accessChanged
                ? "Confirm & save changes"
                : isEditing
                  ? "Save changes"
                  : "Add staff member"}
          </AdminButton>
        </div>
      </div>
    </div>
  );
}

function AccessOption({
  selected,
  disabled = false,
  title,
  description,
  onSelect,
}: {
  selected: boolean;
  disabled?: boolean;
  title: string;
  description: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`rounded-[10px] border px-3.5 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        selected
          ? "border-admin-green-600 bg-admin-green-050 ring-1 ring-inset ring-admin-green-600/30"
          : "border-admin-border-strong bg-white hover:bg-admin-surface-alt"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
            selected ? "border-admin-green-700 bg-admin-green-700" : "border-admin-border-strong"
          }`}
        >
          {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
        </span>
        <span className="text-admin-body font-semibold text-admin-ink">{title}</span>
      </div>
      <p className="mt-1 pl-6 text-admin-label leading-snug text-admin-ink-muted">{description}</p>
    </button>
  );
}
