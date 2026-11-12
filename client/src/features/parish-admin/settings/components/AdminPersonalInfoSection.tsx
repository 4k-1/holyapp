import { useState } from "react";
import { AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { getCurrentUser, updateProfile } from "@/features/auth/api/authApi";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import type { CurrentUser } from "@/types";
import { notifyError } from "@/lib/notify";
import {
  SettingsAvatar,
  SettingsField,
  SettingsFieldGrid,
  SettingsFormActions,
  SettingsPanel,
  SettingsPillButton,
} from "./SettingsUI";

function dateInputValue(value: string | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

function formatBirthday(value: string | undefined) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

interface ProfileDraft {
  firstName: string;
  middleName: string;
  lastName: string;
  birthday: string;
  email: string;
  contactNumber: string;
  address: string;
}

function draftFrom(user: CurrentUser): ProfileDraft {
  return {
    firstName: user.firstName ?? "",
    middleName: user.middleName ?? "",
    lastName: user.lastName ?? "",
    birthday: dateInputValue(user.birthday),
    email: user.email,
    contactNumber: user.contactNumber ?? "",
    address: user.address ?? "",
  };
}

type Panel = "personal" | "contact";

export function AdminPersonalInfoSection() {
  const sessionUser = useCurrentUser();
  const [user, setUser] = useState<CurrentUser | null>(() => sessionUser ?? getCurrentUser());
  const [editing, setEditing] = useState<Panel | null>(null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<ProfileDraft | null>(() => (user ? draftFrom(user) : null));

  if (!user || !draft) {
    return <p className="text-admin-body text-admin-ink-muted">Not signed in.</p>;
  }

  function setField<K extends keyof ProfileDraft>(key: K, value: string) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function startEditing(panel: Panel) {
    if (user) setDraft(draftFrom(user));
    setEditing(panel);
  }

  function cancelEditing() {
    if (user) setDraft(draftFrom(user));
    setEditing(null);
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    try {
      const updated = await updateProfile({
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        middleName: draft.middleName.trim() || undefined,
        birthday: draft.birthday,
        email: draft.email.trim(),
        contactNumber: draft.contactNumber.trim(),
        address: draft.address.trim(),
      });
      setUser(updated);
      setDraft(draftFrom(updated));
      setEditing(null);
    } catch (err) {
      notifyError(err, "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  const roleLabel = user.role === "parish_admin" ? "Parish Admin" : "Parish Staff";
  const editButton = (panel: Panel) =>
    editing !== panel && (
      <SettingsPillButton onClick={() => startEditing(panel)} disabled={editing !== null}>
        Edit
      </SettingsPillButton>
    );

  return (
    <div className="space-y-4">
      <SettingsPanel>
        <div className="flex items-center gap-4">
          <SettingsAvatar name={user.fullName} />
          <div className="min-w-0">
            <p className="truncate text-[1.0625rem] font-semibold text-admin-ink">{user.fullName}</p>
            <p className="mt-0.5 text-admin-body text-admin-green-700">{roleLabel}</p>
            <p className="mt-0.5 truncate text-admin-support text-admin-ink-muted">{user.email}</p>
          </div>
        </div>
      </SettingsPanel>

      <SettingsPanel title="Personal information" action={editButton("personal")}>
        {editing === "personal" ? (
          <>
            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-3">
              <AdminField label="First name">
                <AdminInput value={draft.firstName} onChange={(e) => setField("firstName", e.target.value)} />
              </AdminField>
              <AdminField label="Middle name">
                <AdminInput value={draft.middleName} onChange={(e) => setField("middleName", e.target.value)} />
              </AdminField>
              <AdminField label="Last name">
                <AdminInput value={draft.lastName} onChange={(e) => setField("lastName", e.target.value)} />
              </AdminField>
            </div>
            <AdminField label="Birthday" className="sm:max-w-[16rem]">
              <AdminInput type="date" value={draft.birthday} onChange={(e) => setField("birthday", e.target.value)} />
            </AdminField>
            <SettingsFormActions saving={saving} onSave={handleSave} onCancel={cancelEditing} />
          </>
        ) : (
          <SettingsFieldGrid>
            <SettingsField label="First name" value={user.firstName} />
            <SettingsField label="Last name" value={user.lastName} />
            <SettingsField label="Middle name" value={user.middleName} />
            <SettingsField label="Birthday" value={formatBirthday(user.birthday)} />
          </SettingsFieldGrid>
        )}
      </SettingsPanel>

      <SettingsPanel title="Contact & address" action={editButton("contact")}>
        {editing === "contact" ? (
          <>
            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              <AdminField label="Email address">
                <AdminInput type="email" value={draft.email} onChange={(e) => setField("email", e.target.value)} />
              </AdminField>
              <AdminField label="Phone">
                <AdminInput
                  type="tel"
                  value={draft.contactNumber}
                  onChange={(e) => setField("contactNumber", e.target.value)}
                />
              </AdminField>
            </div>
            <AdminField label="Address">
              <AdminInput value={draft.address} onChange={(e) => setField("address", e.target.value)} />
            </AdminField>
            <SettingsFormActions saving={saving} onSave={handleSave} onCancel={cancelEditing} />
          </>
        ) : (
          <SettingsFieldGrid>
            <SettingsField label="Email address" value={user.email} />
            <SettingsField label="Phone" value={user.contactNumber} />
            <SettingsField label="Address" value={user.address} className="sm:col-span-2" />
          </SettingsFieldGrid>
        )}
      </SettingsPanel>
    </div>
  );
}
