import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import {
  AdminButton,
  AdminField,
  AdminFieldGroup,
  AdminFormPage,
  AdminFormSection,
  AdminInput,
  AdminTextarea,
  BookIcon,
  FamilyIcon,
  NoteIcon,
  UserIcon,
} from "@/features/parish-admin/components/AdminForm";
import { CandleIcon, DropletIcon, ShieldIcon } from "@/components/ui/icons/SacramentIcons";
import {
  createDeathRecord,
  getDeathRecord,
  updateDeathRecord,
} from "@/features/parish-admin/records/api/deathRecordsApi";
import { BaptismalRecordLinkField } from "@/features/parish-admin/records/BaptismalRecordLinkField";
import {
  DEATH_SACRAMENT_LABELS,
  DEATH_SACRAMENT_OPTIONS,
} from "@/features/parish-admin/records/deathHelpers";
import { useAsync } from "@/hooks/useAsync";
import type { BaptismalRecord, DeathSacramentName } from "@/features/parish-admin/records/types";
import type { Parish } from "@/types";

interface KinFormState {
  relationToDeceased: string;
  firstName: string;
  middleName: string;
  lastName: string;
}

interface FormState {
  firstName: string;
  middleName: string;
  lastName: string;
  residence: string;
  age: string;
  ageMonths: string;
  ageDays: string;
  deceasedStatus: string;
  dateOfDeath: string;
  dateOfBurial: string;
  placeOfBurial: string;
  nicheNumber: string;
  nicheType: string;
  minister: string;
  causeOfDeath: string;
  bookNumber: string;
  pageNumber: string;
  entryNumber: string;
  remarks: string;
  baptismalRecordId: string;
  kin: KinFormState[];
  sacramentsReceived: DeathSacramentName[];
}

const emptyKin = (): KinFormState => ({
  relationToDeceased: "",
  firstName: "",
  middleName: "",
  lastName: "",
});

const emptyForm = (): FormState => ({
  firstName: "",
  middleName: "",
  lastName: "",
  residence: "",
  age: "",
  ageMonths: "",
  ageDays: "",
  deceasedStatus: "",
  dateOfDeath: "",
  dateOfBurial: "",
  placeOfBurial: "",
  nicheNumber: "",
  nicheType: "",
  minister: "",
  causeOfDeath: "",
  bookNumber: "",
  pageNumber: "",
  entryNumber: "",
  remarks: "",
  baptismalRecordId: "",
  kin: [],
  sacramentsReceived: [],
});

function parseOptionalInt(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isNaN(n) ? undefined : n;
}

export function AdminDeathRecordFormPage({ mode }: { mode: "create" | "edit" }) {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const { recordId = "" } = useParams();
  const navigate = useNavigate();
  const id = decodeURIComponent(recordId);

  const { data: existing, loading: existingLoading } = useAsync(
    () => (mode === "edit" ? getDeathRecord(parish.id, id) : Promise.resolve(undefined)),
    [parish.id, id, mode]
  );

  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setForm({
      firstName: existing.firstName,
      middleName: existing.middleName ?? "",
      lastName: existing.lastName,
      residence: existing.residence ?? "",
      age: existing.age != null ? String(existing.age) : "",
      ageMonths: existing.ageMonths != null ? String(existing.ageMonths) : "",
      ageDays: existing.ageDays != null ? String(existing.ageDays) : "",
      deceasedStatus: existing.deceasedStatus ?? "",
      dateOfDeath: existing.dateOfDeath,
      dateOfBurial: existing.dateOfBurial,
      placeOfBurial: existing.placeOfBurial,
      nicheNumber: existing.nicheNumber ?? "",
      nicheType: existing.nicheType ?? "",
      minister: existing.minister,
      causeOfDeath: existing.causeOfDeath ?? "",
      bookNumber: existing.bookNumber,
      pageNumber: existing.pageNumber,
      entryNumber: existing.entryNumber,
      remarks: existing.remarks ?? "",
      baptismalRecordId: existing.baptismalRecordId ?? "",
      kin: existing.kin.map((k) => ({
        relationToDeceased: k.relationToDeceased,
        firstName: k.firstName ?? "",
        middleName: k.middleName ?? "",
        lastName: k.lastName ?? "",
      })),
      sacramentsReceived: existing.sacramentsReceived.map((s) => s.sacramentName),
    });
  }, [existing]);

  if (mode === "edit" && existingLoading) {
    return (
      <AdminFormPage>
        <BackLink />
        <p className="text-admin-body text-admin-ink-muted">Loading record…</p>
      </AdminFormPage>
    );
  }

  if (mode === "edit" && !existing) {
    return (
      <AdminFormPage>
        <BackLink />
        <h1 className="mb-1 text-admin-page font-semibold text-admin-ink">Record not found</h1>
      </AdminFormPage>
    );
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function applyBaptismalLink(recordId: string, rec: BaptismalRecord | null) {
    setForm((prev) => ({
      ...prev,
      baptismalRecordId: recordId,
      firstName: prev.firstName || rec?.firstName || "",
      middleName: prev.middleName || rec?.middleName || "",
      lastName: prev.lastName || rec?.lastName || "",
      residence: prev.residence || rec?.address || "",
    }));
  }

  function toggleSacrament(name: DeathSacramentName) {
    setForm((prev) => ({
      ...prev,
      sacramentsReceived: prev.sacramentsReceived.includes(name)
        ? prev.sacramentsReceived.filter((s) => s !== name)
        : [...prev.sacramentsReceived, name],
    }));
  }

  function addKin() {
    setForm((prev) => ({ ...prev, kin: [...prev.kin, emptyKin()] }));
  }

  function updateKin(index: number, key: keyof KinFormState, value: string) {
    setForm((prev) => ({
      ...prev,
      kin: prev.kin.map((k, i) => (i === index ? { ...k, [key]: value } : k)),
    }));
  }

  function removeKin(index: number) {
    setForm((prev) => ({ ...prev, kin: prev.kin.filter((_, i) => i !== index) }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const input = {
      firstName: form.firstName,
      middleName: form.middleName || undefined,
      lastName: form.lastName,
      residence: form.residence || undefined,
      age: parseOptionalInt(form.age),
      ageMonths: parseOptionalInt(form.ageMonths),
      ageDays: parseOptionalInt(form.ageDays),
      deceasedStatus: form.deceasedStatus || undefined,
      dateOfDeath: form.dateOfDeath,
      dateOfBurial: form.dateOfBurial,
      placeOfBurial: form.placeOfBurial,
      nicheNumber: form.nicheNumber || undefined,
      nicheType: form.nicheType || undefined,
      minister: form.minister,
      causeOfDeath: form.causeOfDeath || undefined,
      bookNumber: form.bookNumber,
      pageNumber: form.pageNumber,
      entryNumber: form.entryNumber,
      remarks: form.remarks || undefined,
      baptismalRecordId: form.baptismalRecordId || undefined,
      kin: form.kin
        .filter((k) => k.relationToDeceased.trim())
        .map((k) => ({
          relationToDeceased: k.relationToDeceased,
          firstName: k.firstName || undefined,
          middleName: k.middleName || undefined,
          lastName: k.lastName || undefined,
        })),
      sacramentsReceived: form.sacramentsReceived.map((sacramentName) => ({ sacramentName })),
    };
    try {
      if (mode === "edit") {
        await updateDeathRecord(parish.id, id, input);
      } else {
        await createDeathRecord(parish.id, input);
      }
      navigate(-1);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminFormPage>
      <BackLink />

      <div className="mb-5">
        <h1 className="mb-1 text-admin-page font-semibold text-admin-ink">
          {mode === "edit" ? "Edit" : "Add"} Death Record
        </h1>
        <p className="text-admin-body text-admin-ink-muted">
          Enter details exactly as they appear in the parish death register.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <AdminFormSection
          tone="blue"
          icon={<UserIcon className="h-4.5 w-4.5" />}
          title="Personal information"
          description="Who the deceased was, and their standing."
        >
          <AdminFieldGroup cols={3}>
            <AdminField label="First name" className="mb-0">
              <AdminInput
                value={form.firstName}
                onChange={(e) => setField("firstName", e.target.value)}
                required
              />
            </AdminField>
            <AdminField label="Middle name" className="mb-0">
              <AdminInput value={form.middleName} onChange={(e) => setField("middleName", e.target.value)} />
            </AdminField>
            <AdminField label="Last name" className="mb-0">
              <AdminInput
                value={form.lastName}
                onChange={(e) => setField("lastName", e.target.value)}
                required
              />
            </AdminField>
          </AdminFieldGroup>

          <AdminFieldGroup cols={2}>
            <AdminField label="Residence" className="mb-0 sm:col-span-2">
              <AdminInput value={form.residence} onChange={(e) => setField("residence", e.target.value)} />
            </AdminField>
            <AdminField label="Status" className="mb-0">
              <AdminInput
                placeholder="e.g. Single, Married, Widowed"
                value={form.deceasedStatus}
                onChange={(e) => setField("deceasedStatus", e.target.value)}
              />
            </AdminField>
          </AdminFieldGroup>

          <AdminFieldGroup cols={3} title="Age at death" className="mb-0">
            <AdminField label="Years" className="mb-0">
              <AdminInput
                type="number"
                min={0}
                value={form.age}
                onChange={(e) => setField("age", e.target.value)}
              />
            </AdminField>
            <AdminField label="Months" className="mb-0">
              <AdminInput
                type="number"
                min={0}
                max={11}
                value={form.ageMonths}
                onChange={(e) => setField("ageMonths", e.target.value)}
              />
            </AdminField>
            <AdminField label="Days" className="mb-0">
              <AdminInput
                type="number"
                min={0}
                max={30}
                value={form.ageDays}
                onChange={(e) => setField("ageDays", e.target.value)}
              />
            </AdminField>
          </AdminFieldGroup>
        </AdminFormSection>

        <AdminFormSection
          tone="gold"
          icon={<CandleIcon className="h-4.5 w-4.5" />}
          title="Death & burial"
          description="Dates, place of burial, and officiating minister."
        >
          <AdminFieldGroup cols={2}>
            <AdminField label="Date of death" className="mb-0">
              <AdminInput
                type="date"
                value={form.dateOfDeath}
                onChange={(e) => setField("dateOfDeath", e.target.value)}
                required
              />
            </AdminField>
            <AdminField label="Date of burial" className="mb-0">
              <AdminInput
                type="date"
                value={form.dateOfBurial}
                onChange={(e) => setField("dateOfBurial", e.target.value)}
                required
              />
            </AdminField>
            <AdminField label="Place of burial" className="mb-0 sm:col-span-2">
              <AdminInput
                value={form.placeOfBurial}
                onChange={(e) => setField("placeOfBurial", e.target.value)}
                required
              />
            </AdminField>
            <AdminField label="Niche no." className="mb-0">
              <AdminInput value={form.nicheNumber} onChange={(e) => setField("nicheNumber", e.target.value)} />
            </AdminField>
            <AdminField label="Niche type" className="mb-0">
              <AdminInput
                placeholder="e.g. Columbarium, Lawn"
                value={form.nicheType}
                onChange={(e) => setField("nicheType", e.target.value)}
              />
            </AdminField>
            <AdminField label="Minister" className="mb-0">
              <AdminInput
                placeholder="Rev. Fr."
                value={form.minister}
                onChange={(e) => setField("minister", e.target.value)}
                required
              />
            </AdminField>
            <AdminField label="Cause of death" className="mb-0">
              <AdminInput value={form.causeOfDeath} onChange={(e) => setField("causeOfDeath", e.target.value)} />
            </AdminField>
          </AdminFieldGroup>
        </AdminFormSection>

        <AdminFormSection
          tone="green"
          icon={<DropletIcon className="h-4.5 w-4.5" />}
          title="Baptism reference"
          description="Optional — search and link the baptismal register entry."
        >
          <BaptismalRecordLinkField
            parishId={parish.id}
            value={form.baptismalRecordId}
            initialQuery={[form.firstName, form.middleName, form.lastName].filter(Boolean).join(" ")}
            onChange={applyBaptismalLink}
            className="mb-0"
          />
        </AdminFormSection>

        <AdminFormSection
          tone="green"
          icon={<BookIcon className="h-4.5 w-4.5" />}
          title="Register reference"
        >
          <AdminFieldGroup cols={3} className="mb-0">
            <AdminField label="Book no." className="mb-0">
              <AdminInput
                value={form.bookNumber}
                onChange={(e) => setField("bookNumber", e.target.value)}
                required
              />
            </AdminField>
            <AdminField label="Page no." className="mb-0">
              <AdminInput
                value={form.pageNumber}
                onChange={(e) => setField("pageNumber", e.target.value)}
                required
              />
            </AdminField>
            <AdminField label="Entry no." className="mb-0">
              <AdminInput
                value={form.entryNumber}
                onChange={(e) => setField("entryNumber", e.target.value)}
                required
              />
            </AdminField>
          </AdminFieldGroup>
        </AdminFormSection>

        <AdminFormSection
          tone="amber"
          icon={<ShieldIcon className="h-4.5 w-4.5" />}
          title="Sacraments received"
        >
          <div className="flex flex-wrap gap-4">
            {DEATH_SACRAMENT_OPTIONS.map((name) => (
              <label key={name} className="flex cursor-pointer items-center gap-2 text-admin-body text-admin-ink">
                <input
                  type="checkbox"
                  checked={form.sacramentsReceived.includes(name)}
                  onChange={() => toggleSacrament(name)}
                  className="h-4 w-4 rounded border-admin-border-strong"
                />
                {DEATH_SACRAMENT_LABELS[name]}
              </label>
            ))}
          </div>
        </AdminFormSection>

        <AdminFormSection
          tone="rose"
          icon={<FamilyIcon className="h-4.5 w-4.5" />}
          title="Next of kin"
          right={
            <AdminButton variant="secondary" size="sm" type="button" onClick={addKin}>
              Add kin
            </AdminButton>
          }
        >
          {form.kin.length === 0 ? (
            <p className="text-admin-support text-admin-ink-faint">No next of kin recorded.</p>
          ) : (
            form.kin.map((k, i) => (
              <div
                key={i}
                className="mb-3 rounded-[8px] border border-admin-border bg-admin-surface-alt p-4 last:mb-0"
              >
                <AdminFieldGroup cols={2} className="mb-3">
                  <AdminField label="Relation" className="mb-0">
                    <AdminInput
                      placeholder="e.g. Spouse, Father"
                      value={k.relationToDeceased}
                      onChange={(e) => updateKin(i, "relationToDeceased", e.target.value)}
                      required
                    />
                  </AdminField>
                  <AdminField label="First name" className="mb-0">
                    <AdminInput value={k.firstName} onChange={(e) => updateKin(i, "firstName", e.target.value)} />
                  </AdminField>
                  <AdminField label="Middle name" className="mb-0">
                    <AdminInput value={k.middleName} onChange={(e) => updateKin(i, "middleName", e.target.value)} />
                  </AdminField>
                  <AdminField label="Last name" className="mb-0">
                    <AdminInput value={k.lastName} onChange={(e) => updateKin(i, "lastName", e.target.value)} />
                  </AdminField>
                </AdminFieldGroup>
                <AdminButton variant="ghost" size="sm" type="button" onClick={() => removeKin(i)}>
                  Remove
                </AdminButton>
              </div>
            ))
          )}
        </AdminFormSection>

        <AdminFormSection tone="neutral" icon={<NoteIcon className="h-4.5 w-4.5" />} title="Remarks" className="mb-0">
          <AdminTextarea
            value={form.remarks}
            onChange={(e) => setField("remarks", e.target.value)}
            placeholder="Additional notes about this entry"
          />
        </AdminFormSection>

        <div className="mt-5 flex justify-end gap-2.5">
          <AdminButton variant="secondary" type="button" onClick={() => navigate(-1)}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" disabled={submitting}>
            {submitting ? "Saving…" : mode === "edit" ? "Save changes" : "Confirm & add record"}
          </AdminButton>
        </div>
      </form>
    </AdminFormPage>
  );
}

function BackLink() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className="mb-3.5 inline-flex items-center gap-1.5 text-admin-body text-admin-ink-muted hover:text-admin-green-700"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
        <polyline points="15 18 9 12 15 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Back
    </button>
  );
}
