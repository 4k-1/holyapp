import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate, useOutletContext, useParams } from "react-router-dom";
import {
  AdminButton,
  AdminField,
  AdminFieldGroup,
  AdminFormPage,
  AdminFormSection,
  AdminInput,
  ChecklistIcon,
  FamilyIcon,
  NoteIcon,
  UserIcon,
} from "@/features/parish-admin/components/AdminForm";
import { DropletIcon } from "@/components/ui/icons/SacramentIcons";
import {
  createBaptismalRecord,
  getBaptismalRecord,
  updateBaptismalRecord,
} from "@/features/parish-admin/records/api/baptismalRecordsApi";
import { markRecordStatus } from "@/features/parish-admin/schedule/api/scheduleApi";
import { useAsync } from "@/hooks/useAsync";
import type { LegitimacyStatus } from "@/features/parish-admin/records/types";
import type { Parish } from "@/types";

interface FormState {
  firstName: string;
  middleName: string;
  lastName: string;
  sex: string;
  dateOfBirth: string;
  placeOfBirth: string;
  dateOfBaptism: string;
  placeOfBaptism: string;
  legitimacyStatus: LegitimacyStatus | "";
  address: string;
  minister: string;
  fatherLastName: string;
  fatherFirstName: string;
  motherLastName: string;
  motherFirstName: string;
  paternalGrandfather: string;
  paternalGrandmother: string;
  maternalGrandfather: string;
  maternalGrandmother: string;
  withMarriageCertificate: boolean;
  withBirthCertificate: boolean;
  bookNumber: string;
  pageNumber: string;
  entryNumber: string;
  remarks: string;
}

interface ScheduleLinkPrefill {
  subjectNameHint?: string;
  date?: string;
  priest?: string;
  scheduleBlockId?: string;
}

const emptyForm = (placeOfBaptism = ""): FormState => ({
  firstName: "",
  middleName: "",
  lastName: "",
  sex: "",
  dateOfBirth: "",
  placeOfBirth: "",
  dateOfBaptism: "",
  placeOfBaptism,
  legitimacyStatus: "",
  address: "",
  minister: "",
  fatherLastName: "",
  fatherFirstName: "",
  motherLastName: "",
  motherFirstName: "",
  paternalGrandfather: "",
  paternalGrandmother: "",
  maternalGrandfather: "",
  maternalGrandmother: "",
  withMarriageCertificate: false,
  withBirthCertificate: false,
  bookNumber: "",
  pageNumber: "",
  entryNumber: "",
  remarks: "",
});

const textareaClass =
  "min-h-[80px] w-full resize-y rounded-[7px] border border-admin-border-strong bg-white px-[11px] py-[9px] text-admin-body leading-relaxed text-admin-ink focus:border-admin-green-600 focus:outline-none focus:ring-2 focus:ring-admin-green-600/25";

const selectClass =
  "w-full rounded-[7px] border border-admin-border-strong bg-white px-[11px] py-[9px] text-admin-body text-admin-ink focus:border-admin-green-600 focus:outline-none focus:ring-2 focus:ring-admin-green-600/25";

export function AdminBaptismalRecordFormPage({ mode }: { mode: "create" | "edit" }) {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const { recordId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const id = decodeURIComponent(recordId);

  const prefill = mode === "create" ? (location.state as ScheduleLinkPrefill | null) : null;

  const { data: existing, loading: existingLoading } = useAsync(
    () => (mode === "edit" ? getBaptismalRecord(parish.id, id) : Promise.resolve(undefined)),
    [parish.id, id, mode]
  );

  const [form, setForm] = useState<FormState>(() => {
    const base = emptyForm(parish.name);
    if (prefill) {
      return {
        ...base,
        dateOfBaptism: prefill.date ?? base.dateOfBaptism,
        minister: prefill.priest ?? base.minister,
      };
    }
    return base;
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setForm({
      firstName: existing.firstName,
      middleName: existing.middleName,
      lastName: existing.lastName,
      sex: existing.sex ?? "",
      dateOfBirth: existing.dateOfBirth,
      placeOfBirth: existing.placeOfBirth ?? "",
      dateOfBaptism: existing.dateOfBaptism,
      placeOfBaptism: existing.placeOfBaptism,
      legitimacyStatus: existing.legitimacyStatus ?? "",
      address: existing.address ?? "",
      minister: existing.minister,
      fatherLastName: existing.fatherLastName,
      fatherFirstName: existing.fatherFirstName,
      motherLastName: existing.motherLastName,
      motherFirstName: existing.motherFirstName,
      paternalGrandfather: existing.paternalGrandfather,
      paternalGrandmother: existing.paternalGrandmother,
      maternalGrandfather: existing.maternalGrandfather,
      maternalGrandmother: existing.maternalGrandmother,
      withMarriageCertificate: existing.withMarriageCertificate,
      withBirthCertificate: existing.withBirthCertificate,
      bookNumber: existing.bookNumber,
      pageNumber: existing.pageNumber,
      entryNumber: existing.entryNumber,
      remarks: existing.remarks ?? "",
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const input = {
      firstName: form.firstName,
      middleName: form.middleName,
      lastName: form.lastName,
      sex: form.sex || undefined,
      dateOfBirth: form.dateOfBirth,
      placeOfBirth: form.placeOfBirth || undefined,
      dateOfBaptism: form.dateOfBaptism,
      placeOfBaptism: form.placeOfBaptism,
      legitimacyStatus: form.legitimacyStatus || undefined,
      address: form.address || undefined,
      minister: form.minister,
      fatherLastName: form.fatherLastName,
      fatherFirstName: form.fatherFirstName,
      motherLastName: form.motherLastName,
      motherFirstName: form.motherFirstName,
      paternalGrandfather: form.paternalGrandfather,
      paternalGrandmother: form.paternalGrandmother,
      maternalGrandfather: form.maternalGrandfather,
      maternalGrandmother: form.maternalGrandmother,
      withMarriageCertificate: form.withMarriageCertificate,
      withBirthCertificate: form.withBirthCertificate,
      bookNumber: form.bookNumber,
      pageNumber: form.pageNumber,
      entryNumber: form.entryNumber,
      remarks: form.remarks || undefined,
    };
    try {
      if (mode === "edit") {
        await updateBaptismalRecord(parish.id, id, input);
      } else {
        await createBaptismalRecord(parish.id, input);
      }
      if (prefill?.scheduleBlockId) {
        await markRecordStatus(prefill.scheduleBlockId, "Recorded");
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
          {mode === "edit" ? "Edit" : "Add"} Baptismal Record
        </h1>
        <p className="text-admin-body text-admin-ink-muted">
          {mode === "edit"
            ? "Update the details of this record."
            : "Enter details exactly as they appear in the parish register."}
        </p>
        {prefill && (
          <p className="mt-2 rounded-[8px] border border-admin-gold-600/30 bg-admin-gold-100/40 px-3 py-2 text-admin-support text-admin-gold-700">
            Linked from schedule: <span className="font-semibold">{prefill.subjectNameHint || "Untitled block"}</span>
            {prefill.date ? ` · ${prefill.date}` : ""}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <AdminFormSection
          tone="blue"
          icon={<UserIcon className="h-4.5 w-4.5" />}
          title="Personal information"
          description="Who was baptized, and where they were born."
        >
          <AdminFieldGroup title="Name of baptized">
            <AdminField label="First" className="mb-0 w-[130px]">
              <AdminInput
                placeholder="First"
                value={form.firstName}
                onChange={(e) => setField("firstName", e.target.value)}
                required
              />
            </AdminField>
            <AdminField label="Middle" className="mb-0 w-[130px]">
              <AdminInput
                placeholder="Middle"
                value={form.middleName}
                onChange={(e) => setField("middleName", e.target.value)}
                required
              />
            </AdminField>
            <AdminField label="Last" className="mb-0 w-[150px]">
              <AdminInput
                placeholder="Last"
                value={form.lastName}
                onChange={(e) => setField("lastName", e.target.value)}
                required
              />
            </AdminField>
          </AdminFieldGroup>

          <AdminFieldGroup title="Birth details">
            <AdminField label="Sex" className="mb-0 w-[120px]">
              <select className={selectClass} value={form.sex} onChange={(e) => setField("sex", e.target.value)}>
                <option value="">—</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </AdminField>
            <AdminField label="Date of birth" className="mb-0 w-[150px]">
              <AdminInput
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setField("dateOfBirth", e.target.value)}
                required
              />
            </AdminField>
            <AdminField label="Place of birth" className="mb-0 w-[200px]">
              <AdminInput value={form.placeOfBirth} onChange={(e) => setField("placeOfBirth", e.target.value)} />
            </AdminField>
          </AdminFieldGroup>

          <AdminField label="Address">
            <AdminInput value={form.address} onChange={(e) => setField("address", e.target.value)} />
          </AdminField>

          <AdminField label="Legitimacy status" className="mb-0">
            <select
              className={selectClass}
              value={form.legitimacyStatus}
              onChange={(e) => setField("legitimacyStatus", e.target.value as LegitimacyStatus | "")}
            >
              <option value="">—</option>
              <option value="Legitimate">Legitimate</option>
              <option value="Illegitimate">Illegitimate</option>
              <option value="Natural">Natural</option>
            </select>
          </AdminField>
        </AdminFormSection>

        <AdminFormSection
          tone="gold"
          icon={<DropletIcon className="h-4.5 w-4.5" />}
          title="Baptismal information"
          description="Minister, date, and register reference for this sacrament."
        >
          <AdminField label="Minister">
            <AdminInput
              placeholder="Rev. Fr."
              value={form.minister}
              onChange={(e) => setField("minister", e.target.value)}
              required
            />
          </AdminField>

          <AdminField label="Date of baptism">
            <AdminInput
              type="date"
              value={form.dateOfBaptism}
              onChange={(e) => setField("dateOfBaptism", e.target.value)}
              required
            />
          </AdminField>

          <AdminField label="Place of baptism">
            <AdminInput
              value={form.placeOfBaptism}
              onChange={(e) => setField("placeOfBaptism", e.target.value)}
              required
            />
          </AdminField>

          <AdminFieldGroup title="Register reference" className="mb-0">
            <AdminField label="Book no." className="mb-0">
              <AdminInput
                placeholder="6"
                value={form.bookNumber}
                onChange={(e) => setField("bookNumber", e.target.value)}
                className="max-w-[72px]"
                required
              />
            </AdminField>
            <AdminField label="Page no." className="mb-0">
              <AdminInput
                placeholder="21"
                value={form.pageNumber}
                onChange={(e) => setField("pageNumber", e.target.value)}
                className="max-w-[72px]"
                required
              />
            </AdminField>
            <AdminField label="Entry no." className="mb-0">
              <AdminInput
                placeholder="04"
                value={form.entryNumber}
                onChange={(e) => setField("entryNumber", e.target.value)}
                className="max-w-[72px]"
                required
              />
            </AdminField>
          </AdminFieldGroup>
        </AdminFormSection>

        <AdminFormSection
          tone="amber"
          icon={<FamilyIcon className="h-4.5 w-4.5" />}
          title="Parents"
          description="As recorded in the parish register."
        >
          <AdminFieldGroup title="Father">
            <AdminField label="Last" className="mb-0 w-[160px]">
              <AdminInput
                placeholder="Last"
                value={form.fatherLastName}
                onChange={(e) => setField("fatherLastName", e.target.value)}
                required
              />
            </AdminField>
            <AdminField label="First" className="mb-0 w-[140px]">
              <AdminInput
                placeholder="First"
                value={form.fatherFirstName}
                onChange={(e) => setField("fatherFirstName", e.target.value)}
                required
              />
            </AdminField>
          </AdminFieldGroup>

          <AdminFieldGroup title="Mother" className="mb-0">
            <AdminField label="Last" className="mb-0 w-[160px]">
              <AdminInput
                placeholder="Last"
                value={form.motherLastName}
                onChange={(e) => setField("motherLastName", e.target.value)}
                required
              />
            </AdminField>
            <AdminField label="First" className="mb-0 w-[140px]">
              <AdminInput
                placeholder="First"
                value={form.motherFirstName}
                onChange={(e) => setField("motherFirstName", e.target.value)}
                required
              />
            </AdminField>
          </AdminFieldGroup>
        </AdminFormSection>

        <AdminFormSection
          tone="green"
          icon={<FamilyIcon className="h-4.5 w-4.5" />}
          title="Grandparents"
        >
          <AdminFieldGroup title="Paternal">
            <AdminField label="Grandfather" className="mb-0 w-full">
              <AdminInput
                value={form.paternalGrandfather}
                onChange={(e) => setField("paternalGrandfather", e.target.value)}
                required
              />
            </AdminField>
            <AdminField label="Grandmother" className="mb-0 w-full">
              <AdminInput
                value={form.paternalGrandmother}
                onChange={(e) => setField("paternalGrandmother", e.target.value)}
                required
              />
            </AdminField>
          </AdminFieldGroup>

          <AdminFieldGroup title="Maternal" className="mb-0">
            <AdminField label="Grandfather" className="mb-0 w-full">
              <AdminInput
                value={form.maternalGrandfather}
                onChange={(e) => setField("maternalGrandfather", e.target.value)}
                required
              />
            </AdminField>
            <AdminField label="Grandmother" className="mb-0 w-full">
              <AdminInput
                value={form.maternalGrandmother}
                onChange={(e) => setField("maternalGrandmother", e.target.value)}
                required
              />
            </AdminField>
          </AdminFieldGroup>
        </AdminFormSection>

        <AdminFormSection
          tone="neutral"
          icon={<ChecklistIcon className="h-4.5 w-4.5" />}
          title="Supporting documents"
        >
          <div className="flex flex-wrap gap-6">
            <label className="flex cursor-pointer items-center gap-2 text-admin-body text-admin-ink">
              <input
                type="checkbox"
                checked={form.withMarriageCertificate}
                onChange={(e) => setField("withMarriageCertificate", e.target.checked)}
                className="h-4 w-4 rounded border-admin-border-strong"
              />
              Marriage certificate on file
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-admin-body text-admin-ink">
              <input
                type="checkbox"
                checked={form.withBirthCertificate}
                onChange={(e) => setField("withBirthCertificate", e.target.checked)}
                className="h-4 w-4 rounded border-admin-border-strong"
              />
              Birth certificate on file
            </label>
          </div>
        </AdminFormSection>

        <AdminFormSection tone="neutral" icon={<NoteIcon className="h-4.5 w-4.5" />} title="Remarks" className="mb-0">
          <textarea
            className={textareaClass}
            value={form.remarks}
            onChange={(e) => setField("remarks", e.target.value)}
            placeholder="Optional notes from the register"
          />
        </AdminFormSection>

        <div className="mt-5 flex justify-end gap-2.5">
          <AdminButton variant="secondary" type="button" onClick={() => navigate(-1)}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" disabled={submitting}>
            <CheckIcon />
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

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-3.5 w-3.5">
      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
