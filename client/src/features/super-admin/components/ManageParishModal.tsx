import { useState } from "react";
import { Link } from "react-router-dom";
import { updatePlatformParish, type SuperAdminParishOverview } from "@/features/super-admin/api/superAdminApi";
import {
  SaField,
  SuperAdminModal,
  saBtnPrimary,
  saBtnSecondary,
  saInputClass,
} from "./SuperAdminModal";

export function ManageParishModal({
  row,
  onClose,
  onSaved,
}: {
  row: SuperAdminParishOverview;
  onClose: () => void;
  onSaved: (name: string) => void;
}) {
  const [name, setName] = useState(row.parish.name);
  const [address, setAddress] = useState(row.parish.address);
  const [contact, setContact] = useState(row.parish.contact);
  const [email, setEmail] = useState(row.parish.email);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    if (!name.trim() || !address.trim()) {
      setError("Parish name and location are required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await updatePlatformParish(row.parish.id, { name, address, contact, email });
      onSaved(name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the parish.");
      setBusy(false);
    }
  }

  return (
    <SuperAdminModal
      title="Manage Parish"
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <button type="button" className={saBtnSecondary} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={saBtnPrimary} onClick={handleSave} disabled={busy}>
            {busy ? "Saving…" : "Save Changes"}
          </button>
        </>
      }
    >
      <SaField label="Parish name">
        <input className={saInputClass} value={name} onChange={(e) => setName(e.target.value)} aria-label="Parish name" />
      </SaField>
      <SaField label="Location">
        <input className={saInputClass} value={address} onChange={(e) => setAddress(e.target.value)} aria-label="Location" />
      </SaField>
      <SaField label="Contact">
        <input
          className={saInputClass}
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Office phone"
          aria-label="Contact"
        />
      </SaField>
      <SaField label="Parish email">
        <input
          className={saInputClass}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="office@parish.ph"
          aria-label="Parish email"
        />
      </SaField>

      <div>
        <p className="mb-[5px] text-[13px] font-bold text-admin-ink-muted">Assigned Admins</p>
        {row.admins.length === 0 ? (
          <p className="text-[13px] text-admin-ink-faint">
            No parish admin yet — this parish is pending setup.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {row.admins.map((admin) => (
              <span
                key={admin.id}
                className="rounded-full bg-admin-green-100 px-3 py-1 text-[13px] font-semibold text-admin-green-900"
              >
                {admin.fullName}
              </span>
            ))}
          </div>
        )}
        <Link
          to={`/super-admin/accounts/${row.parish.id}`}
          onClick={onClose}
          className="mt-2 inline-block text-[13px] font-bold text-admin-green-700 hover:text-admin-green-900"
        >
          View accounts
        </Link>
      </div>
      {error ? <p className="text-[13.5px] font-medium text-admin-red-700">{error}</p> : null}
    </SuperAdminModal>
  );
}
