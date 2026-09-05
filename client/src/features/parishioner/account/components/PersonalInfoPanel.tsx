import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { updateProfile } from "@/features/auth/api/authApi";
import type { CurrentUser } from "@/types";

interface PersonalInfoPanelProps {
  user: CurrentUser;
  onUpdated: (user: CurrentUser) => void;
}

export function PersonalInfoPanel({ user, onUpdated }: PersonalInfoPanelProps) {
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user.firstName ?? "");
  const [lastName, setLastName] = useState(user.lastName ?? "");
  const [middleName, setMiddleName] = useState(user.middleName ?? "");
  const [birthday, setBirthday] = useState(user.birthday ?? "");
  const [email, setEmail] = useState(user.email);
  const [address, setAddress] = useState(user.address ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateProfile({ firstName, lastName, middleName, birthday, email, address });
      onUpdated(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
    setMiddleName(user.middleName ?? "");
    setBirthday(user.birthday ?? "");
    setEmail(user.email);
    setAddress(user.address ?? "");
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="flex flex-col gap-3">
        <DetailRow label="Full Name" value={user.fullName} />
        <DetailRow
          label="Birthday"
          value={
            user.birthday
              ? new Date(user.birthday).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
              : "—"
          }
        />
        <DetailRow label="Email Address" value={user.email} />
        <DetailRow label="Address" value={user.address ?? "—"} />
        <div className="mt-2">
          <Button variant="ghost" onClick={() => setEditing(true)}>
            Edit Account Details
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Input label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        <Input label="Middle name (optional)" value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
        <Input label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
      </div>
      <Input type="date" label="Birthday" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
      <div>
        <Input type="email" label="Email address" value={email} onChange={(e) => setEmail(e.target.value)} />
        <p className="mt-1 text-xs text-ink-muted">
          We'll send a confirmation link to your new address if you change it.
        </p>
      </div>
      <Input label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
      <div className="mt-1 flex gap-2.5">
        <Button variant="ghost" onClick={handleCancel} disabled={saving}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-b-0 last:pb-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</span>
      <span className="text-right text-sm text-ink">{value}</span>
    </div>
  );
}