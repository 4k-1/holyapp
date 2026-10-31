import { useState } from "react";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { getCurrentUser, updateProfile } from "@/features/auth/api/authApi";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import type { CurrentUser } from "@/types";
import { notifyError } from "@/lib/notify";

function dateInputValue(value: string | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

function formatBirthday(value: string | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function AdminPersonalInfoSection() {
  const sessionUser = useCurrentUser();
  const [user, setUser] = useState<CurrentUser | null>(() => sessionUser ?? getCurrentUser());
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [middleName, setMiddleName] = useState(user?.middleName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [birthday, setBirthday] = useState(dateInputValue(user?.birthday));
  const [email, setEmail] = useState(user?.email ?? "");
  const [address, setAddress] = useState(user?.address ?? "");

  if (!user) {
    return <p className="text-admin-body text-admin-ink-muted">Not signed in.</p>;
  }

  function fillFrom(next: CurrentUser) {
    setFirstName(next.firstName ?? "");
    setMiddleName(next.middleName ?? "");
    setLastName(next.lastName ?? "");
    setBirthday(dateInputValue(next.birthday));
    setEmail(next.email);
    setAddress(next.address ?? "");
  }

  function startEditing() {
    if (user) fillFrom(user);
    setEditing(true);
  }

  function cancelEditing() {
    if (user) fillFrom(user);
    setEditing(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        middleName: middleName.trim() || undefined,
        birthday,
        email: email.trim(),
        address: address.trim(),
      });
      setUser(updated);
      fillFrom(updated);
      setEditing(false);
    } catch (err) {
      notifyError(err, "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminCard className="p-5 px-[22px]">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-admin-section font-semibold text-admin-ink">My Profile</h2>
          <p className="mt-1 text-admin-support text-admin-ink-muted">
            Your personal details on this account. This does not change parish settings.
          </p>
        </div>
        {!editing && (
          <AdminButton variant="secondary" onClick={startEditing}>
            Edit
          </AdminButton>
        )}
      </div>

      {editing ? (
        <div>
          <div className="grid grid-cols-1 gap-x-4 md:grid-cols-3">
            <AdminField label="First name">
              <AdminInput value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </AdminField>
            <AdminField label="Middle name">
              <AdminInput value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
            </AdminField>
            <AdminField label="Last name">
              <AdminInput value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </AdminField>
          </div>
          <AdminField label="Birthday">
            <AdminInput type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
          </AdminField>
          <AdminField label="Email">
            <AdminInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </AdminField>
          <AdminField label="Address">
            <AdminInput value={address} onChange={(e) => setAddress(e.target.value)} />
          </AdminField>
          <div className="mt-2 flex gap-2">
            <AdminButton onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </AdminButton>
            <AdminButton variant="secondary" onClick={cancelEditing} disabled={saving}>
              Cancel
            </AdminButton>
          </div>
        </div>
      ) : (
        <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
          <InfoRow label="Full name" value={user.fullName} />
          <InfoRow label="Birthday" value={formatBirthday(user.birthday)} />
          <InfoRow label="Email" value={user.email} />
          <InfoRow label="Address" value={user.address || "—"} />
        </dl>
      )}
    </AdminCard>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-admin-body text-admin-ink">{value}</dd>
    </div>
  );
}
