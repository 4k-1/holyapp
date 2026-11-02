// src/features/parish-admin/settings/components/ParishProfileSection.tsx
import { useEffect, useState } from "react";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { getParishProfile, updateParishProfile } from "../api/settingsApi";
import type { ParishProfile } from "../types";
import { notifyError } from "@/lib/notify";
import { SkeletonList } from "@/components/ui/Skeleton";
import {
  SettingsAvatar,
  SettingsField,
  SettingsFieldGrid,
  SettingsFormActions,
  SettingsPanel,
  SettingsPillButton,
} from "./SettingsUI";

const emptyProfile = (): ParishProfile => ({
  name: "",
  address: "",
  patron: "",
  diocese: "",
  phone: "",
  email: "",
});

type Panel = "identity" | "contact";

export function ParishProfileSection() {
  const [saved, setSaved] = useState<ParishProfile>(emptyProfile);
  const [draft, setDraft] = useState<ParishProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Panel | null>(null);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    getParishProfile()
      .then((p) => {
        setSaved(p);
        setDraft(p);
      })
      .catch((err: unknown) => {
        notifyError(err, "Could not load parish profile.");
      })
      .finally(() => setLoading(false));
  }, []);

  function setField<K extends keyof ParishProfile>(key: K, value: ParishProfile[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function startEditing(panel: Panel) {
    setDraft(saved);
    setJustSaved(false);
    setEditing(panel);
  }

  function cancelEditing() {
    setDraft(saved);
    setEditing(null);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await updateParishProfile(draft);
      setSaved(result);
      setDraft(result);
      setEditing(null);
      setJustSaved(true);
    } catch (err) {
      notifyError(err, "Could not save parish profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <SkeletonList rows={4} className="px-0" />;
  }

  const editButton = (panel: Panel) =>
    editing !== panel && (
      <SettingsPillButton onClick={() => startEditing(panel)} disabled={editing !== null}>
        Edit
      </SettingsPillButton>
    );

  return (
    <div className="space-y-4">
      {justSaved && (
        <p className="rounded-xl bg-admin-green-100 px-4 py-2.5 text-admin-support font-semibold text-admin-green-800" role="status">
          Parish profile saved.
        </p>
      )}

      <SettingsPanel>
        {editing === "identity" ? (
          <>
            <AdminField label="Parish name">
              <AdminInput value={draft.name} onChange={(e) => setField("name", e.target.value)} />
            </AdminField>
            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              <AdminField label="Patron saint">
                <AdminInput value={draft.patron} onChange={(e) => setField("patron", e.target.value)} />
              </AdminField>
              <AdminField label="Diocese / Archdiocese">
                <AdminInput value={draft.diocese} onChange={(e) => setField("diocese", e.target.value)} />
              </AdminField>
            </div>
            <SettingsFormActions saving={saving} onSave={handleSave} onCancel={cancelEditing} />
          </>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <SettingsAvatar text={saved.name.charAt(0) || "?"} imageUrl={saved.sealUrl} />
            <div className="min-w-0 flex-1">
              <p className="text-[1.0625rem] font-semibold text-admin-ink">{saved.name || "Unnamed parish"}</p>
              <p className="mt-0.5 text-admin-body text-admin-green-700">
                {saved.patron || <span className="text-admin-ink-faint">No patron saint set</span>}
              </p>
              <p className="mt-0.5 text-admin-support text-admin-ink-muted">{saved.diocese || "No diocese set"}</p>
            </div>
            {editButton("identity")}
          </div>
        )}
      </SettingsPanel>

      <SettingsPanel title="Contact details" action={editButton("contact")}>
        {editing === "contact" ? (
          <>
            <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
              <AdminField label="Phone number">
                <AdminInput value={draft.phone} onChange={(e) => setField("phone", e.target.value)} />
              </AdminField>
              <AdminField label="Email address">
                <AdminInput type="email" value={draft.email} onChange={(e) => setField("email", e.target.value)} />
              </AdminField>
            </div>
            <AdminField label="Full address">
              <AdminInput value={draft.address} onChange={(e) => setField("address", e.target.value)} />
            </AdminField>
            <SettingsFormActions saving={saving} onSave={handleSave} onCancel={cancelEditing} />
          </>
        ) : (
          <SettingsFieldGrid>
            <SettingsField label="Phone number" value={saved.phone} />
            <SettingsField label="Email address" value={saved.email} />
            <SettingsField label="Full address" value={saved.address} className="sm:col-span-2" />
          </SettingsFieldGrid>
        )}
      </SettingsPanel>

      <SettingsPanel
        title="Parish logo / seal"
        description="Printed on certificate templates and shown on the public verification page."
      >
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-admin-border-strong p-4">
          {saved.sealUrl ? (
            <img src={saved.sealUrl} alt="" className="h-12 w-12 rounded-full object-contain" />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-admin-border bg-admin-surface-alt font-serif text-lg font-bold text-admin-green-800">
              {saved.name.charAt(0) || "?"}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-admin-body font-medium text-admin-ink">
              {saved.sealUrl ? "Seal uploaded" : "No seal uploaded yet"}
            </p>
            <p className="text-admin-support text-admin-ink-faint">Uploading a seal is coming soon.</p>
          </div>
          {/* TODO: wire to real upload once file storage is in place */}
          <AdminButton variant="secondary" size="sm" type="button" disabled>
            Upload new seal
          </AdminButton>
        </div>
      </SettingsPanel>
    </div>
  );
}
