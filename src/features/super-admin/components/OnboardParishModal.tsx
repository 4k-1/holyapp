import { useState } from "react";
import { createPlatformParish } from "@/features/super-admin/api/superAdminApi";
import { generateTempPassword } from "@/services/mocks/superAdmin.mock";
import {
  SaField,
  SuperAdminModal,
  saBtnPrimary,
  saBtnSecondary,
  saInputClass,
} from "./SuperAdminModal";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function OnboardParishModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (result: { parishName: string; credentials?: { email: string; password: string } }) => void;
}) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [password, setPassword] = useState(generateTempPassword);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    if (!name.trim() || !address.trim()) {
      setError("Parish name and location are required.");
      return;
    }
    if (adminName.trim() && !adminEmail.trim()) {
      setError("Add an email for the admin account, or leave the admin name blank.");
      return;
    }
    if (adminEmail.trim() && !EMAIL_RE.test(adminEmail.trim())) {
      setError("Enter a valid admin email.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await createPlatformParish({
        name,
        address,
        adminName,
        adminEmail,
        adminPassword: password,
      });
      onCreated({ parishName: result.parish.name, credentials: result.credentials });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the parish.");
      setBusy(false);
    }
  }

  return (
    <SuperAdminModal
      title="Create New Parish"
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className={saBtnSecondary} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={saBtnPrimary} onClick={handleCreate} disabled={busy}>
            {busy ? "Creating…" : "Create Parish"}
          </button>
        </>
      }
    >
      <SaField label="Parish name">
        <input
          className={saInputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Sacred Heart Parish"
          aria-label="Parish name"
          autoFocus
        />
      </SaField>
      <SaField label="Location">
        <input
          className={saInputClass}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="e.g. Cebu City"
          aria-label="Location"
        />
      </SaField>
      <SaField label="Initial admin name (optional — more can be added later)">
        <input
          className={saInputClass}
          value={adminName}
          onChange={(e) => setAdminName(e.target.value)}
          placeholder="e.g. Fr. Juan Dela Cruz"
          aria-label="Initial admin name"
        />
      </SaField>
      <SaField label="Admin email (for account creation)">
        <input
          className={saInputClass}
          type="email"
          value={adminEmail}
          onChange={(e) => setAdminEmail(e.target.value)}
          placeholder="e.g. juan.delacruz@parish.ph"
          aria-label="Admin email"
        />
      </SaField>
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
      {error ? <p className="text-[12.5px] font-medium text-admin-red-700">{error}</p> : null}
    </SuperAdminModal>
  );
}

export function CredentialsModal({
  email,
  password,
  onClose,
  audience = "the Parish Admin",
}: {
  email: string;
  password: string;
  onClose: () => void;
  audience?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyDetails() {
    try {
      await navigator.clipboard.writeText(`Email: ${email}\nTemporary password: ${password}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <SuperAdminModal
      title="Account Created"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={saBtnSecondary} onClick={onClose}>
            Close
          </button>
          <button type="button" className={saBtnPrimary} onClick={copyDetails}>
            {copied ? "Copied" : "Copy Details"}
          </button>
        </>
      }
    >
      <p className="text-[12.5px] text-admin-ink-muted">
        Share these sign-in details with {audience}. They will use the parish portal, not this
        platform sign-in.
      </p>
      <SaField label="Email">
        <input className={saInputClass} value={email} readOnly />
      </SaField>
      <SaField label="Temporary Password">
        <input className={`${saInputClass} font-mono tracking-[0.03em]`} value={password} readOnly />
      </SaField>
    </SuperAdminModal>
  );
}
