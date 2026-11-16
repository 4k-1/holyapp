// src/features/parish-admin/settings/components/StaffAccountModal.tsx
import { useEffect, useState } from "react";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { listPersonnel, type ParishPerson } from "@/features/parish-admin/staff/api/personnelApi";
import { AccessOption } from "@/features/parish-admin/staff/components/AccessOption";
import { ACCESS_PRESETS, type AreaAccess } from "@/features/parish-admin/access";
import { AreaAccessEditor } from "./AreaAccessEditor";
import { STAFF_ROLES } from "../types";
import type { NewStaffInput, StaffAccessRole, StaffAccount, StaffRole } from "../types";
import { AdminModalFrame } from "@/features/parish-admin/components/AdminModalFrame";

const selectClass =
  "w-full rounded-md border border-admin-border-strong bg-white px-[11px] py-[9px] text-admin-body text-admin-ink focus:border-admin-green-600 focus:outline-none focus:ring-2 focus:ring-admin-green-600/25";

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
  /** Accounts with no recognised title are listed as "Staff", which isn't a choice here; ask for a real one. */
  const [role, setRole] = useState<StaffRole>(
    account ? (STAFF_ROLES.includes(account.role) ? account.role : "") : STAFF_ROLES[0]
  );
  const [accessRole, setAccessRole] = useState<StaffAccessRole>(account?.accessRole ?? "staff");
  /** New sign-ins start as Secretary; an admin being moved to staff starts from Full staff access. */
  const [areaAccess, setAreaAccess] = useState<AreaAccess>(() =>
    account?.accessRole === "staff" ? { ...account.areaAccess } : { ...ACCESS_PRESETS[account ? 4 : 0].access }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  /** New sign-ins usually go to someone already on the Staff list, so nobody ends up listed twice. */
  const [unlinked, setUnlinked] = useState<ParishPerson[]>([]);
  const [source, setSource] = useState<"list" | "new">("list");
  const [personId, setPersonId] = useState("");
  const linkedPerson = source === "list" ? unlinked.find((p) => p.id === personId) : undefined;

  useEffect(() => {
    if (isEditing) return;
    listPersonnel()
      .then(({ personnel }) => {
        const available = personnel.filter((p) => !p.hasAccount && p.status === "active");
        setUnlinked(available);
        if (available.length === 0) setSource("new");
      })
      .catch(() => setSource("new"));
  }, [isEditing]);

  const accessChanged = isEditing && accessRole !== account!.accessRole;
  const lockAdminAccess = isSelf && account?.accessRole === "admin";

  async function handleSave() {
    if (!isEditing && source === "list" && !linkedPerson) {
      setError("Choose who this sign-in is for.");
      return;
    }
    if ((!linkedPerson && !name.trim()) || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (!linkedPerson && !role) {
      setError("Choose a role.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const access = accessRole === "staff" ? { areaAccess } : {};
      await onSave(
        linkedPerson
          ? { personnelId: linkedPerson.id, name: linkedPerson.name, role: linkedPerson.role, email: email.trim(), accessRole, ...access }
          : { name: name.trim(), email: email.trim(), role, accessRole, ...access }
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  return (
    <AdminModalFrame
      onClose={onClose}
      busy={saving}
      panelClassName="max-w-[580px] rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_12px_40px_-6px_rgba(10,40,30,0.25)]"
    >
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

      <div className="max-h-[70vh] space-y-3.5 overflow-y-auto px-6 py-5">
        {!isEditing && unlinked.length > 0 && (
          <AdminField label="Who is this sign-in for?" className="mb-0">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <AccessOption
                selected={source === "list"}
                title="Someone on the Staff list"
                description="Keeps their name, role, and assigned events."
                onSelect={() => setSource("list")}
              />
              <AccessOption
                selected={source === "new"}
                title="Someone new"
                description="Adds them to the Staff list too."
                onSelect={() => setSource("new")}
              />
            </div>
          </AdminField>
        )}

        {!isEditing && source === "list" && unlinked.length > 0 && (
          <AdminField label="Person" className="mb-0">
            <select
              value={personId}
              onChange={(e) => {
                setPersonId(e.target.value);
                setError("");
              }}
              className={selectClass}
            >
              <option value="">Choose from the Staff list</option>
              {unlinked.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.role}
                </option>
              ))}
            </select>
          </AdminField>
        )}

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {(isEditing || source === "new") && (
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
          )}
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
            {!isEditing && (
              <p className="mt-1.5 text-admin-support text-admin-ink-muted">
                We&apos;ll email them a link to set their own password. It works for 3 days.
              </p>
            )}
          </AdminField>
        </div>

        {(isEditing || source === "new") && (
          <AdminField label="Role" className="mb-0">
            <select value={role} onChange={(e) => setRole(e.target.value as StaffRole)} className={selectClass}>
              {!role && (
                <option value="" disabled>
                  Choose a role
                </option>
              )}
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </AdminField>
        )}

        <AdminField label="Access level" className="mb-0">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <AccessOption
              selected={accessRole === "staff"}
              disabled={lockAdminAccess}
              title="Staff access"
              description="Only the areas you choose below."
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

        {accessRole === "staff" && (
          <AdminField label="What they can open" className="mb-0">
            <AreaAccessEditor value={areaAccess} onChange={setAreaAccess} />
          </AdminField>
        )}

        {accessChanged && (
          <div className="rounded-md border border-admin-gold-700/30 bg-admin-gold-700/10 px-3.5 py-3 text-admin-support text-admin-gold-700">
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
    </AdminModalFrame>
  );
}
