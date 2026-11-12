// src/features/parish-admin/settings/components/ParishProfileSection.tsx
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { getParishProfile, updateParishProfile } from "../api/settingsApi";
import type { LocalFeast, ParishProfile } from "../types";
import type { Parish } from "@/types";
import { formatMonthDay } from "../monthDay";
import { MonthDayInput } from "./MonthDayInput";
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
  fiestaDate: "",
  localFeasts: [],
});

type Panel = "identity" | "contact" | "dates";

export function ParishProfileSection() {
  const { parish } = useOutletContext<{ parish: Parish }>();
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

  function setFeast(index: number, patch: Partial<LocalFeast>) {
    setField(
      "localFeasts",
      draft.localFeasts.map((feast, i) => (i === index ? { ...feast, ...patch } : feast))
    );
  }

  const datesInvalid = draft.localFeasts.some((feast) => !feast.name.trim() || !feast.date);

  async function handleSave() {
    if (editing === "dates" && datesInvalid) return;
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

  // The saved logo, or the one the rest of the portal already shows for this parish.
  const logoUrl = saved.sealUrl || parish.sealUrl;

  return (
    <div className="space-y-4">
      {justSaved && (
        <p className="rounded-lg bg-admin-green-100 px-4 py-2.5 text-admin-support font-semibold text-admin-green-800" role="status">
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
            <SettingsAvatar text={saved.name.charAt(0) || "?"} imageUrl={logoUrl} />
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
        title="Parish dates"
        description="Shown on the Schedule calendar. Bookings on these days get a reminder that the church may be busy."
        action={editButton("dates")}
      >
        {editing === "dates" ? (
          <>
            <AdminField label="Parish fiesta">
              <MonthDayInput
                value={draft.fiestaDate}
                onChange={(value) => setField("fiestaDate", value)}
                label="Parish fiesta"
                allowEmpty
              />
            </AdminField>
            <p className="mb-2 text-admin-label font-semibold text-admin-ink-muted">Other local feasts</p>
            {draft.localFeasts.length === 0 && (
              <p className="mb-2 text-admin-support text-admin-ink-faint">None yet, e.g. a chapel's feast day.</p>
            )}
            <div className="space-y-2">
              {draft.localFeasts.map((feast, index) => (
                <div key={index} className="flex flex-wrap items-center gap-2">
                  <AdminInput
                    value={feast.name}
                    onChange={(e) => setFeast(index, { name: e.target.value })}
                    placeholder="e.g. San Isidro chapel fiesta"
                    aria-label="Name of the local feast"
                    className="min-w-[12rem] flex-1"
                  />
                  <MonthDayInput
                    value={feast.date}
                    onChange={(value) => setFeast(index, { date: value })}
                    label={feast.name || "Local feast"}
                  />
                  <button
                    type="button"
                    onClick={() => setField("localFeasts", draft.localFeasts.filter((_, i) => i !== index))}
                    className="rounded-lg px-2 py-1.5 text-admin-support font-semibold text-admin-red-700 hover:bg-admin-red-100"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
            <AdminButton
              type="button"
              variant="secondary"
              size="sm"
              className="mt-2"
              onClick={() => setField("localFeasts", [...draft.localFeasts, { name: "", date: "" }])}
            >
              + Add a local feast
            </AdminButton>
            {datesInvalid && (
              <p className="mt-2 text-admin-support text-red-700">Give each local feast a name and a date.</p>
            )}
            <SettingsFormActions saving={saving} onSave={handleSave} onCancel={cancelEditing} />
          </>
        ) : (
          <SettingsFieldGrid>
            <SettingsField
              label="Parish fiesta"
              value={
                saved.fiestaDate
                  ? `${formatMonthDay(saved.fiestaDate)}${saved.patron ? ` (${saved.patron})` : ""}`
                  : "Not set"
              }
            />
            <SettingsField
              label="Other local feasts"
              value={
                saved.localFeasts.length > 0
                  ? saved.localFeasts.map((f) => `${f.name}, ${formatMonthDay(f.date)}`).join(" · ")
                  : "None"
              }
            />
          </SettingsFieldGrid>
        )}
      </SettingsPanel>

      <SettingsPanel
        title="Parish logo / seal"
        description="Printed on certificate templates and shown on the public verification page."
      >
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-dashed border-admin-border-strong p-4">
          {logoUrl ? (
            <img src={logoUrl} alt={`${saved.name || parish.name} logo`} className="h-16 w-16 rounded-full bg-white object-contain" />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-admin-border bg-admin-surface-alt font-serif text-lg font-bold text-admin-green-800">
              {saved.name.charAt(0) || "?"}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-admin-body font-medium text-admin-ink">
              {logoUrl ? "Current logo" : "No logo yet"}
            </p>
            <p className="text-admin-support text-admin-ink-faint">
              {logoUrl
                ? "Shown in the portal and printed on certificates. Changing it is coming soon."
                : "Uploading a logo is coming soon."}
            </p>
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
