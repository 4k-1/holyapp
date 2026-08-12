import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import {
  AdminButton,
  AdminField,
  AdminFieldGroup,
  AdminFormSection,
  AdminInput,
  BookIcon,
  FamilyIcon,
  NoteIcon,
  UserIcon,
} from "@/features/parish-admin/components/AdminForm";
import { CandleIcon, ShieldIcon } from "@/components/ui/icons/SacramentIcons";
import {
  createDeathRecord,
  getDeathRecord,
  updateDeathRecord,
} from "@/features/parish-admin/records/api/deathRecordsApi";
import {
  DEATH_SACRAMENT_LABELS,
  DEATH_SACRAMENT_OPTIONS,
} from "@/features/parish-admin/records/deathHelpers";
import { useAsync } from "@/hooks/useAsync";
import type { DeathSacramentName } from "@/features/parish-admin/records/types";
import type { Parish } from "@/types";

interface KinFormState {
  relationToDeceased: string;
  firstName: string;
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
  kin: KinFormState[];
  sacramentsReceived: DeathSacramentName[];
}

const emptyKin = (): KinFormState => ({
  relationToDeceased: "",
  firstName: "",
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
  kin: [],
  sacramentsReceived: [],
});

const textareaClass =
  "min-h-[80px] w-full resize-y rounded-[7px] border border-admin-border-strong bg-white px-[11px] py-[9px] text-[13.5px] leading-relaxed text-admin-ink focus:border-admin-green-600 focus:outline-none focus:ring-2 focus:ring-admin-green-600/25";

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
      kin: existing.kin.map((k) => ({
        relationToDeceased: k.relationToDeceased,
        firstName: k.firstName ?? "",
        lastName: k.lastName ?? "",
      })),
      sacramentsReceived: existing.sacramentsReceived.map((s) => s.sacramentName),
    });
  }, [existing]);

  if (mode === "edit" && existingLoading) {
    return (
      <div>
        <BackLink />
        <p className="text-[13.5px] text-admin-ink-muted">Loading record…</p>
      </div>
    );
  }

  if (mode === "edit" && !existing) {
    return (
      <div>
        <BackLink />
        <h1 className="mb-1 text-[26px] font-semibold text-admin-ink">Record not found</h1>
      </div>
    );
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
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
      kin: form.kin
        .filter((k) => k.relationToDeceased.trim())
        .map((k) => ({
          relationToDeceased: k.relationToDeceased,
          firstName: k.firstName || undefined,
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
    <div>
      <BackLink />

      <div className="mb-5">
        <h1 className="mb-1 text-[26px] font-semibold text-admin-ink">
          {mode === "edit" ? "Edit" : "Add"} Death Record
        </h1>
        <p className="text-[13.5px] text-admin-ink-muted">
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
          <AdminFieldGroup title="Full name">
            <AdminField label="First" className="mb-0 w-[130px]">
              <AdminInput
                value={form.firstName}
                onChange={(e) => setField("firstName", e.target.value)}
                required
              />
            </AdminField>
            <AdminField label="Middle" className="mb-0 w-[130px]">
              <AdminInput value={form.middleName} onChange={(e) => setField("middleName", e.target.value)} />
            </AdminField>
            <AdminField label="Last" className="mb-0 w-[150px]">
              <AdminInput
                value={form.lastName}
                onChange={(e) => setField("lastName", e.target.value)}
                required
              />
            </AdminField>
          </AdminFieldGroup>

          <AdminField label="Residence">
            <AdminInput value={form.residence} onChange={(e) => setField("residence", e.target.value)} />
          </AdminField>

          <AdminFieldGroup title="Age at death">
            <AdminField label="Years" className="mb-0 w-[100px]">
              <AdminInput
                type="number"
                min={0}
                value={form.age}
                onChange={(e) => setField("age", e.target.value)}
              />
            </AdminField>
            <AdminField label="Months" className="mb-0 w-[90px]">
              <AdminInput
                type="number"
                min={0}
                max={11}
                value={form.ageMonths}
                onChange={(e) => setField("ageMonths", e.target.value)}
              />
            </AdminField>
            <AdminField label="Days" className="mb-0 w-[90px]">
              <AdminInput
                type="number"
                min={0}
                max={30}
                value={form.ageDays}
                onChange={(e) => setField("ageDays", e.target.value)}
              />
            </AdminField>
          </AdminFieldGroup>

          <AdminField label="Status" className="mb-0">
            <AdminInput
              placeholder="e.g. Single, Married, Widowed"
              value={form.deceasedStatus}
              onChange={(e) => setField("deceasedStatus", e.target.value)}
            />
          </AdminField>
        </AdminFormSection>

        <AdminFormSection
          tone="gold"
          icon={<CandleIcon className="h-4.5 w-4.5" />}
          title="Death & burial"
          description="Dates, place of burial, and officiating minister."
        >
          <AdminField label="Date of death">
            <AdminInput
              type="date"
              value={form.dateOfDeath}
              onChange={(e) => setField("dateOfDeath", e.target.value)}
              required
            />
          </AdminField>
          <AdminField label="Date of burial">
            <AdminInput
              type="date"
              value={form.dateOfBurial}
              onChange={(e) => setField("dateOfBurial", e.target.value)}
              required
            />
          </AdminField>
          <AdminField label="Place of burial">
            <AdminInput
              value={form.placeOfBurial}
              onChange={(e) => setField("placeOfBurial", e.target.value)}
              required
            />
          </AdminField>
          <AdminFieldGroup title="Niche">
            <AdminField label="Niche no." className="mb-0 w-[120px]">
              <AdminInput value={form.nicheNumber} onChange={(e) => setField("nicheNumber", e.target.value)} />
            </AdminField>
            <AdminField label="Niche type" className="mb-0 flex-1">
              <AdminInput
                placeholder="e.g. Columbarium, Lawn"
                value={form.nicheType}
                onChange={(e) => setField("nicheType", e.target.value)}
              />
            </AdminField>
          </AdminFieldGroup>
          <AdminField label="Minister">
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
        </AdminFormSection>

        <AdminFormSection
          tone="green"
          icon={<BookIcon className="h-4.5 w-4.5" />}
          title="Register reference"
        >
          <AdminField label="Book no." className="mb-0">
            <AdminInput
              value={form.bookNumber}
              onChange={(e) => setField("bookNumber", e.target.value)}
              className="max-w-[72px]"
              required
            />
          </AdminField>
          <AdminField label="Page no." className="mb-0">
            <AdminInput
              value={form.pageNumber}
              onChange={(e) => setField("pageNumber", e.target.value)}
              className="max-w-[72px]"
              required
            />
          </AdminField>
          <AdminField label="Entry no." className="mb-0">
            <AdminInput
              value={form.entryNumber}
              onChange={(e) => setField("entryNumber", e.target.value)}
              className="max-w-[72px]"
              required
            />
          </AdminField>
        </AdminFormSection>

        <AdminFormSection
          tone="amber"
          icon={<ShieldIcon className="h-4.5 w-4.5" />}
          title="Sacraments received"
        >
          <div className="flex flex-wrap gap-4">
            {DEATH_SACRAMENT_OPTIONS.map((name) => (
              <label key={name} className="flex cursor-pointer items-center gap-2 text-[13.5px] text-admin-ink">
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
            <p className="text-[11.5px] text-admin-ink-faint">No next of kin recorded.</p>
          ) : (
            form.kin.map((k, i) => (
              <div
                key={i}
                className="mb-3 rounded-[8px] border border-admin-border bg-admin-surface-alt p-3 last:mb-0"
              >
                <div className="mb-2 flex flex-wrap gap-2">
                  <AdminField label="Relation" className="mb-0 w-[140px]">
                    <AdminInput
                      placeholder="e.g. Spouse, Father"
                      value={k.relationToDeceased}
                      onChange={(e) => updateKin(i, "relationToDeceased", e.target.value)}
                      required
                    />
                  </AdminField>
                  <AdminField label="First" className="mb-0 w-[120px]">
                    <AdminInput value={k.firstName} onChange={(e) => updateKin(i, "firstName", e.target.value)} />
                  </AdminField>
                  <AdminField label="Last" className="mb-0 w-[130px]">
                    <AdminInput value={k.lastName} onChange={(e) => updateKin(i, "lastName", e.target.value)} />
                  </AdminField>
                </div>
                <AdminButton variant="ghost" size="sm" type="button" onClick={() => removeKin(i)}>
                  Remove
                </AdminButton>
              </div>
            ))
          )}
        </AdminFormSection>

        <AdminFormSection tone="neutral" icon={<NoteIcon className="h-4.5 w-4.5" />} title="Remarks" className="mb-0">
          <textarea
            value={form.remarks}
            onChange={(e) => setField("remarks", e.target.value)}
            placeholder="Additional notes about this entry"
            className={textareaClass}
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
    </div>
  );
}

function BackLink() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className="mb-3.5 inline-flex items-center gap-1.5 text-[13px] text-admin-ink-muted hover:text-admin-green-700"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
        <polyline points="15 18 9 12 15 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Back
    </button>
  );
}
