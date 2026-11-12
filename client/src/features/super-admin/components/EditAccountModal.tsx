import { useState } from "react";
import { updatePlatformAccount } from "@/features/super-admin/api/superAdminApi";
import type { CurrentUser } from "@/types";
import {
  SaField,
  SuperAdminModal,
  saBtnPrimary,
  saBtnSecondary,
  saInputClass,
} from "./SuperAdminModal";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EditableAccount = CurrentUser & { canEditRecords?: boolean };

export function EditAccountModal({
  user,
  onClose,
  onSaved,
}: {
  user: EditableAccount;
  onClose: () => void;
  onSaved: (name: string) => void;
}) {
  const office = user.role === "parish_admin" || user.role === "parish_staff";
  const [name, setName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [contactNumber, setContactNumber] = useState(user.contactNumber ?? "");
  const [role, setRole] = useState<"parish_admin" | "parish_staff">(
    user.role === "parish_staff" ? "parish_staff" : "parish_admin"
  );
  const [canEditRecords, setCanEditRecords] = useState(user.canEditRecords !== false);
  const [gender, setGender] = useState(user.gender ?? "");
  const [birthday, setBirthday] = useState(user.birthday?.slice(0, 10) ?? "");
  const [address, setAddress] = useState(user.address ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await updatePlatformAccount(user.id, {
        name,
        email,
        contactNumber,
        ...(office
          ? {
              role,
              ...(role === "parish_admin" ? { canEditRecords } : {}),
            }
          : {
              gender,
              birthday,
              address,
            }),
      });
      onSaved(name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the account.");
      setBusy(false);
    }
  }

  return (
    <SuperAdminModal
      title="Edit account"
      onClose={onClose}
      busy={busy}
      widthClass="max-w-[480px]"
      footer={
        <>
          <button type="button" className={saBtnSecondary} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={saBtnPrimary} onClick={handleSave} disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </button>
        </>
      }
    >
      <SaField label="Full name">
        <input
          className={saInputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Full name"
          autoFocus
        />
      </SaField>
      <SaField label="Email">
        <input
          className={saInputClass}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email"
        />
      </SaField>
      <SaField label="Contact">
        <input
          className={saInputClass}
          value={contactNumber}
          onChange={(e) => setContactNumber(e.target.value)}
          aria-label="Contact"
        />
      </SaField>
      {office ? (
        <>
          <SaField label="Role">
            <select
              className={saInputClass}
              value={role}
              onChange={(e) => setRole(e.target.value as "parish_admin" | "parish_staff")}
              aria-label="Role"
            >
              <option value="parish_admin">Parish Admin</option>
              <option value="parish_staff">Parish Staff</option>
            </select>
          </SaField>
          {role === "parish_admin" ? (
            <div>
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-[14px] text-admin-ink">
                <input
                  type="checkbox"
                  checked={canEditRecords}
                  onChange={(e) => setCanEditRecords(e.target.checked)}
                  className="h-3.5 w-3.5 accent-admin-green-700"
                />
                Can edit records
              </label>
              <p className="mt-1 text-[13px] text-admin-ink-faint">
                If unchecked, this admin can view records but not create or edit them.
              </p>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <SaField label="Gender">
              <select
                className={saInputClass}
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                aria-label="Gender"
              >
                <option value="">—</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </SaField>
            <SaField label="Birthday">
              <input
                className={saInputClass}
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                aria-label="Birthday"
              />
            </SaField>
          </div>
          <SaField label="Address">
            <input
              className={saInputClass}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              aria-label="Address"
            />
          </SaField>
        </>
      )}
      {error ? <p className="text-[13.5px] font-medium text-admin-red-700">{error}</p> : null}
    </SuperAdminModal>
  );
}
