import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { updateProfile } from "@/features/auth/api/authApi";
import { AccountSection } from "@/features/parishioner/account/components/AccountSection";
import type { CurrentUser } from "@/types";
import { notify, notifyError } from "@/lib/notify";

interface PersonalInfoPanelProps {
  user: CurrentUser;
  onUpdated: (user: CurrentUser) => void;
}

/** "1998-04-12" → "April 12, 1998", read as a calendar date so no time zone moves it a day. */
function formatBirthday(value?: string) {
  if (!value) return "—";
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function PersonalInfoPanel({ user, onUpdated }: PersonalInfoPanelProps) {
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user.firstName ?? "");
  const [lastName, setLastName] = useState(user.lastName ?? "");
  const [middleName, setMiddleName] = useState(user.middleName ?? "");
  const [birthday, setBirthday] = useState(user.birthday ?? "");
  const [email, setEmail] = useState(user.email);
  const [contactNumber, setContactNumber] = useState(user.contactNumber ?? "");
  const [address, setAddress] = useState(user.address ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateProfile({ firstName, lastName, middleName, birthday, email, contactNumber, address });
      onUpdated(updated);
      setEditing(false);
      notify("Your details are saved.");
    } catch (err) {
      notifyError(err, "Could not save your details.");
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
    setContactNumber(user.contactNumber ?? "");
    setAddress(user.address ?? "");
    setEditing(false);
  }

  if (!editing) {
    return (
      <AccountSection
        title="Personal details"
        action={
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Edit
          </Button>
        }
      >
        <dl className="divide-y divide-border">
          <DetailRow label="Full name" value={user.fullName} />
          <DetailRow label="Birthday" value={formatBirthday(user.birthday)} />
          <DetailRow label="Email" value={user.email} />
          <DetailRow label="Contact number" value={user.contactNumber || "—"} />
          <DetailRow label="Address" value={user.address || "—"} />
        </dl>
      </AccountSection>
    );
  }

  return (
    <AccountSection title="Personal details">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Input id="acct-first" label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <Input
            id="acct-middle"
            label="Middle name (optional)"
            value={middleName}
            onChange={(e) => setMiddleName(e.target.value)}
          />
          <Input id="acct-last" label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <Input id="acct-birthday" type="date" label="Birthday" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
        <div>
          <Input id="acct-email" type="email" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <p className="mt-1 text-xs text-ink-muted">You sign in with this email. A change takes effect as soon as you save.</p>
        </div>
        <Input
          id="acct-contact"
          type="tel"
          label="Contact number (optional)"
          value={contactNumber}
          onChange={(e) => setContactNumber(e.target.value)}
        />
        <Input id="acct-address" label="Address (optional)" value={address} onChange={(e) => setAddress(e.target.value)} />
        <div className="mt-1 flex justify-end gap-2.5">
          <Button variant="ghost" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </AccountSection>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-ink sm:text-right">{value}</dd>
    </div>
  );
}
