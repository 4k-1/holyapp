// src/features/parish-admin/settings/components/ParishProfileSection.tsx
import { useEffect, useState } from "react";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { getParishProfile, updateParishProfile } from "../api/settingsApi";
import type { ParishProfile } from "../types";

const emptyProfile = (): ParishProfile => ({
  name: "",
  address: "",
  patron: "",
  diocese: "",
  phone: "",
  email: "",
});

export function ParishProfileSection() {
  const [saved, setSaved] = useState<ParishProfile>(emptyProfile);
  const [draft, setDraft] = useState<ParishProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    getParishProfile().then((p) => {
      setSaved(p);
      setDraft(p);
      setLoading(false);
    });
  }, []);

  function setField<K extends keyof ParishProfile>(key: K, value: ParishProfile[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function startEditing() {
    setDraft(saved);
    setJustSaved(false);
    setEditing(true);
  }

  function cancelEditing() {
    setDraft(saved);
    setEditing(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await updateParishProfile(draft);
      setSaved(result);
      setDraft(result);
      setEditing(false);
      setJustSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="text-[13.5px] text-admin-ink-muted">Loading…</p>;
  }

  return (
    <AdminCard className="p-5 px-[22px]">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-[19px] font-semibold text-admin-ink">Parish Profile</h2>
          <p className="mt-1 text-[12.5px] text-admin-ink-muted">
            Used across certificates, the public verification page, and correspondence.
          </p>
        </div>
        {!editing && (
          <div className="flex shrink-0 items-center gap-3">
            {justSaved && <span className="text-[12px] text-admin-green-700">Saved</span>}
            <AdminButton variant="secondary" size="sm" onClick={startEditing}>
              <EditIcon />
              Edit
            </AdminButton>
          </div>
        )}
      </div>

      {editing ? (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <AdminField label="Parish name">
                <AdminInput value={draft.name} onChange={(e) => setField("name", e.target.value)} />
              </AdminField>
              <AdminField label="Full address">
                <AdminInput value={draft.address} onChange={(e) => setField("address", e.target.value)} />
              </AdminField>
              <AdminField label="Patron saint">
                <AdminInput value={draft.patron} onChange={(e) => setField("patron", e.target.value)} />
              </AdminField>
              <AdminField label="Diocese / Archdiocese">
                <AdminInput value={draft.diocese} onChange={(e) => setField("diocese", e.target.value)} />
              </AdminField>
            </div>

            <div>
              <AdminField label="Phone number">
                <AdminInput value={draft.phone} onChange={(e) => setField("phone", e.target.value)} />
              </AdminField>
              <AdminField label="Email address">
                <AdminInput type="email" value={draft.email} onChange={(e) => setField("email", e.target.value)} />
              </AdminField>

              <AdminField label="Parish logo / seal">
                <div className="flex items-center gap-3.5 rounded-[9px] border border-dashed border-admin-border-strong p-3">
                  {draft.sealUrl ? (
                    <img src={draft.sealUrl} alt="" className="h-[34px] w-[34px] flex-shrink-0 rounded-full object-contain" />
                  ) : (
                    <div className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full border border-admin-border bg-white font-serif text-sm font-bold text-admin-green-900">
                      {draft.name.charAt(0) || "?"}
                    </div>
                  )}
                  <div>
                    {/* TODO: wire to real upload once file storage is in place */}
                    <AdminButton variant="secondary" size="sm" type="button" disabled>
                      Upload new seal
                    </AdminButton>
                    <p className="mt-1.5 text-[11.5px] text-admin-ink-faint">
                      Used on certificate templates and the public verification page. Upload coming soon.
                    </p>
                  </div>
                </div>
              </AdminField>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-end gap-2.5 border-t border-admin-border pt-4">
            <AdminButton variant="secondary" onClick={cancelEditing} disabled={saving}>
              Cancel
            </AdminButton>
            <AdminButton onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </AdminButton>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
          <ReadField label="Parish name" value={saved.name} />
          <ReadField label="Phone number" value={saved.phone} />
          <ReadField label="Full address" value={saved.address} />
          <ReadField label="Email address" value={saved.email} />
          <ReadField label="Patron saint" value={saved.patron} />
          <ReadField label="Diocese / Archdiocese" value={saved.diocese} />

          <div className="md:col-span-2">
            <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-[0.5px] text-admin-ink-muted">
              Parish logo / seal
            </p>
            <div className="flex items-center gap-3">
              {saved.sealUrl ? (
                <img src={saved.sealUrl} alt="" className="h-[36px] w-[36px] rounded-full object-contain" />
              ) : (
                <div className="flex h-[36px] w-[36px] items-center justify-center rounded-full border border-admin-border bg-white font-serif text-sm font-bold text-admin-green-900">
                  {saved.name.charAt(0) || "?"}
                </div>
              )}
              <span className="text-[13px] text-admin-ink-faint">{saved.sealUrl ? "Uploaded" : "No seal uploaded yet"}</span>
            </div>
          </div>
        </div>
      )}
    </AdminCard>
  );
}

function ReadField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-[11.5px] font-semibold uppercase tracking-[0.5px] text-admin-ink-muted">{label}</p>
      <p className="text-[14px] text-admin-ink">{value || <span className="text-admin-ink-faint">Not set</span>}</p>
    </div>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
      <path d="M12 20h9" strokeLinecap="round" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}