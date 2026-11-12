import { useState } from "react";
import { createPlatformAccount } from "@/features/super-admin/api/superAdminApi";
import { generateTempPassword } from "@/lib/tempPassword";
import type { SuperAdminParishOverview } from "@/features/super-admin/api/superAdminApi";
import {
  SaField,
  SuperAdminModal,
  saBtnPrimary,
  saBtnSecondary,
  saInputClass,
} from "./SuperAdminModal";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AddAccountModal({
  role,
  parishes,
  lockedParishId,
  onClose,
  onCreated,
}: {
  role: "parish_admin" | "parishioner";
  parishes: SuperAdminParishOverview[];
  lockedParishId?: string;
  onClose: () => void;
  onCreated: (result: { name: string; credentials: { email: string; password: string } }) => void;
}) {
  const isAdmin = role === "parish_admin";
  const [parishId, setParishId] = useState(lockedParishId ?? parishes[0]?.parish.id ?? "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(generateTempPassword);
  const [canEditRecords, setCanEditRecords] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    if (!parishId || !name.trim() || !email.trim() || !password.trim()) {
      setError("Parish, name, email, and password are all required.");
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await createPlatformAccount({
        parishId,
        role,
        name,
        email,
        password,
        ...(role === "parish_admin" ? { canEditRecords } : {}),
      });
      onCreated({ name: result.user.fullName, credentials: result.credentials });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the account.");
      setBusy(false);
    }
  }

  return (
    <SuperAdminModal
      title={isAdmin ? "Add Admin Account" : "Add Parishioner Account"}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className={saBtnSecondary} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={saBtnPrimary} onClick={handleCreate} disabled={busy}>
            {busy ? "Creating…" : "Create Account"}
          </button>
        </>
      }
    >
      <SaField label="Parish">
        <select
          className={saInputClass}
          value={parishId}
          onChange={(e) => setParishId(e.target.value)}
          disabled={Boolean(lockedParishId)}
          aria-label="Parish"
        >
          {parishes.map((row) => (
            <option key={row.parish.id} value={row.parish.id}>
              {row.parish.name}
            </option>
          ))}
        </select>
      </SaField>
      <SaField label={isAdmin ? "Admin name" : "Full name"}>
        <input
          className={saInputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={isAdmin ? "e.g. Fr. Juan Dela Cruz" : "e.g. Maria Santos"}
          aria-label={isAdmin ? "Admin name" : "Full name"}
          autoFocus
        />
      </SaField>
      <SaField label={isAdmin ? "Admin email" : "Email"}>
        <input
          className={saInputClass}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={isAdmin ? "e.g. juan.delacruz@parish.ph" : "e.g. maria.santos@gmail.com"}
          aria-label="Email"
        />
      </SaField>
      {isAdmin ? (
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
      <SaField label="Temporary Password">
        <div className="flex gap-2">
          <input
            className={`${saInputClass} flex-1 font-mono tracking-[0.03em]`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="Temporary Password"
          />
          <button
            type="button"
            className={`${saBtnSecondary} shrink-0`}
            onClick={() => setPassword(generateTempPassword())}
          >
            Regenerate
          </button>
        </div>
      </SaField>
      {error ? <p className="text-[13.5px] font-medium text-admin-red-700">{error}</p> : null}
    </SuperAdminModal>
  );
}

export function ResetPasswordModal({
  name,
  onClose,
  onConfirm,
}: {
  name: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleConfirm() {
    setBusy(true);
    setError("");
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset the password.");
      setBusy(false);
    }
  }

  return (
    <SuperAdminModal
      title="Reset Password"
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className={saBtnSecondary} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={saBtnPrimary} onClick={handleConfirm} disabled={busy}>
            {busy ? "Resetting…" : "Set temporary password"}
          </button>
        </>
      }
    >
      <p className="m-0 text-[14px] text-admin-ink-muted">
        Set a new temporary password for {name}? Share it with them so they can sign in.
      </p>
      {error ? <p className="text-[13.5px] font-medium text-admin-red-700">{error}</p> : null}
    </SuperAdminModal>
  );
}
