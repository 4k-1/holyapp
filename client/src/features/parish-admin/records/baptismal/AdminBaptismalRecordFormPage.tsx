import { useState, type FormEvent } from "react";
import { useLocation, useNavigate, useOutletContext, useParams } from "react-router-dom";
import {
  AdminField,
  AdminFormPage,
  AdminInput,
  AdminSelect,
  AdminTextarea,
} from "@/features/parish-admin/components/AdminForm";
import { RecordFormShell, RecordSection } from "@/features/parish-admin/records/RecordFormShell";
import { span } from "@/features/parish-admin/records/recordFormSpan";
import {
  createBaptismalRecord,
  getBaptismalRecord,
  updateBaptismalRecord,
} from "@/features/parish-admin/records/api/baptismalRecordsApi";
import { markRecordStatus } from "@/features/parish-admin/schedule/api/scheduleApi";
import { useAsync } from "@/hooks/useAsync";
import type { LegitimacyStatus } from "@/features/parish-admin/records/types";
import type { Parish } from "@/types";
import { PAGE_TITLE_CLASS } from "@/features/parish-admin/components/adminPageStyles";

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

  // Fill the form once the record being edited has loaded.
  const [loadedRecord, setLoadedRecord] = useState<typeof existing>(undefined);
  if (existing && existing !== loadedRecord) {
    setLoadedRecord(existing);
    setForm({
      firstName: existing.firstName,
      middleName: existing.middleName,
      lastName: existing.lastName,
      sex: existing.sex ?? "",
      dateOfBirth: existing.dateOfBirth,
      placeOfBirth: existing.placeOfBirth ?? "",
      dateOfBaptism: existing.dateOfBaptism,
      placeOfBaptism: existing.placeOfBaptism,
      legitimacyStatus:
        existing.legitimacyStatus === "Legitimate" || existing.legitimacyStatus === "Illegitimate"
          ? existing.legitimacyStatus
          : "",
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
  }

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
        <h1 className={`mb-1 ${PAGE_TITLE_CLASS}`}>Record not found</h1>
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
    <RecordFormShell
      title={`${mode === "edit" ? "Edit" : "Add"} Baptismal Record`}
      subtitle={
        mode === "edit"
          ? "Update the details of this record."
          : "Enter details exactly as they appear in the parish register."
      }
      notice={
        prefill && (
          <p className="mb-4 rounded-[8px] border border-admin-gold-600/30 bg-admin-gold-100/40 px-3 py-2 text-admin-support text-admin-gold-700">
            Linked from schedule: <span className="font-semibold">{prefill.subjectNameHint || "Untitled block"}</span>
            {prefill.date ? ` · ${prefill.date}` : ""}
          </p>
        )
      }
      submitting={submitting}
      submitLabel={mode === "edit" ? "Save changes" : "Confirm & add record"}
      onSubmit={handleSubmit}
    >
      <RecordSection title="Person baptized" note="As written in the register.">
        <AdminField label="First name" className={`mb-0 ${span.third}`}>
          <AdminInput placeholder="Juan" value={form.firstName} onChange={(e) => setField("firstName", e.target.value)} required />
        </AdminField>
        <AdminField label="Middle name" className={`mb-0 ${span.third}`}>
          <AdminInput placeholder="Santos" value={form.middleName} onChange={(e) => setField("middleName", e.target.value)} required />
        </AdminField>
        <AdminField label="Last name" className={`mb-0 ${span.third}`}>
          <AdminInput placeholder="Dela Cruz" value={form.lastName} onChange={(e) => setField("lastName", e.target.value)} required />
        </AdminField>
        <AdminField label="Date of birth" className={`mb-0 ${span.third}`}>
          <AdminInput type="date" value={form.dateOfBirth} onChange={(e) => setField("dateOfBirth", e.target.value)} required />
        </AdminField>
        <AdminField label="Sex" className={`mb-0 ${span.third}`}>
          <AdminSelect value={form.sex} onChange={(e) => setField("sex", e.target.value)}>
            <option value="">—</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </AdminSelect>
        </AdminField>
        <AdminField label="Legitimacy status" className={`mb-0 ${span.third}`}>
          <AdminSelect
            value={form.legitimacyStatus}
            onChange={(e) => setField("legitimacyStatus", e.target.value as LegitimacyStatus | "")}
          >
            <option value="">—</option>
            <option value="Legitimate">Legitimate</option>
            <option value="Illegitimate">Illegitimate</option>
          </AdminSelect>
        </AdminField>
        <AdminField label="Place of birth" className={`mb-0 ${span.half}`}>
          <AdminInput value={form.placeOfBirth} onChange={(e) => setField("placeOfBirth", e.target.value)} />
        </AdminField>
        <AdminField label="Address" className={`mb-0 ${span.full}`}>
          <AdminInput value={form.address} onChange={(e) => setField("address", e.target.value)} />
        </AdminField>
      </RecordSection>

      <RecordSection title="Baptism" note="Date, minister and church.">
        <AdminField label="Date of baptism" className={`mb-0 ${span.third}`}>
          <AdminInput type="date" value={form.dateOfBaptism} onChange={(e) => setField("dateOfBaptism", e.target.value)} required />
        </AdminField>
        <AdminField label="Minister" className={`mb-0 ${span.twoThirds}`}>
          <AdminInput placeholder="Rev. Fr." value={form.minister} onChange={(e) => setField("minister", e.target.value)} required />
        </AdminField>
        <AdminField label="Place of baptism" className={`mb-0 ${span.full}`}>
          <AdminInput value={form.placeOfBaptism} onChange={(e) => setField("placeOfBaptism", e.target.value)} required />
        </AdminField>
      </RecordSection>

      <RecordSection title="Register reference" note="Where this entry sits in the book.">
        <AdminField label="Book no." className={`mb-0 ${span.sixth}`}>
          <AdminInput placeholder="6" value={form.bookNumber} onChange={(e) => setField("bookNumber", e.target.value)} required />
        </AdminField>
        <AdminField label="Page no." className={`mb-0 ${span.sixth}`}>
          <AdminInput placeholder="21" value={form.pageNumber} onChange={(e) => setField("pageNumber", e.target.value)} required />
        </AdminField>
        <AdminField label="Entry no." className={`mb-0 ${span.sixth}`}>
          <AdminInput placeholder="04" value={form.entryNumber} onChange={(e) => setField("entryNumber", e.target.value)} required />
        </AdminField>
      </RecordSection>

      <RecordSection title="Parents">
        <AdminField label="Father's first name" className={`mb-0 ${span.half}`}>
          <AdminInput value={form.fatherFirstName} onChange={(e) => setField("fatherFirstName", e.target.value)} required />
        </AdminField>
        <AdminField label="Father's last name" className={`mb-0 ${span.half}`}>
          <AdminInput value={form.fatherLastName} onChange={(e) => setField("fatherLastName", e.target.value)} required />
        </AdminField>
        <AdminField label="Mother's first name" className={`mb-0 ${span.half}`}>
          <AdminInput value={form.motherFirstName} onChange={(e) => setField("motherFirstName", e.target.value)} required />
        </AdminField>
        <AdminField label="Mother's last name" className={`mb-0 ${span.half}`}>
          <AdminInput value={form.motherLastName} onChange={(e) => setField("motherLastName", e.target.value)} required />
        </AdminField>
      </RecordSection>

      <RecordSection title="Grandparents">
        <AdminField label="Paternal grandfather" className={`mb-0 ${span.half}`}>
          <AdminInput value={form.paternalGrandfather} onChange={(e) => setField("paternalGrandfather", e.target.value)} required />
        </AdminField>
        <AdminField label="Paternal grandmother" className={`mb-0 ${span.half}`}>
          <AdminInput value={form.paternalGrandmother} onChange={(e) => setField("paternalGrandmother", e.target.value)} required />
        </AdminField>
        <AdminField label="Maternal grandfather" className={`mb-0 ${span.half}`}>
          <AdminInput value={form.maternalGrandfather} onChange={(e) => setField("maternalGrandfather", e.target.value)} required />
        </AdminField>
        <AdminField label="Maternal grandmother" className={`mb-0 ${span.half}`}>
          <AdminInput value={form.maternalGrandmother} onChange={(e) => setField("maternalGrandmother", e.target.value)} required />
        </AdminField>
      </RecordSection>

      <RecordSection title="Documents and remarks" note="Copies on file, and anything else the register notes.">
        <div className="col-span-6 flex flex-wrap gap-x-6 gap-y-2">
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
        <AdminField label="Remarks" className={`mb-0 ${span.full}`}>
          <AdminTextarea
            value={form.remarks}
            onChange={(e) => setField("remarks", e.target.value)}
            placeholder="Optional notes from the register"
            className="min-h-[84px]"
          />
        </AdminField>
      </RecordSection>
    </RecordFormShell>
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

