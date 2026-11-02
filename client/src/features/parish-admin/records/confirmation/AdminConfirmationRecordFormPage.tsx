import { useState, type FormEvent } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
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
  createConfirmationRecord,
  getConfirmationRecord,
  updateConfirmationRecord,
} from "@/features/parish-admin/records/api/confirmationRecordsApi";
import { BaptismalRecordLinkField } from "@/features/parish-admin/records/BaptismalRecordLinkField";
import { useAsync } from "@/hooks/useAsync";
import type { BaptismalRecord } from "@/features/parish-admin/records/types";
import type { Parish } from "@/types";
import { PAGE_TITLE_CLASS } from "@/features/parish-admin/components/adminPageStyles";

interface FormState {
  firstName: string;
  middleName: string;
  lastName: string;
  sex: string;
  dateOfBirth: string;
  address: string;
  fatherLastName: string;
  fatherFirstName: string;
  motherLastName: string;
  motherFirstName: string;
  dateOfConfirmation: string;
  placeOfConfirmation: string;
  minister: string;
  baptismalRecordId: string;
  baptismDate: string;
  baptismPlace: string;
  isPriorMarriage: boolean;
  isAdult: boolean;
  bookNumber: string;
  pageNumber: string;
  entryNumber: string;
  remarks: string;
}

const emptyForm = (): FormState => ({
  firstName: "",
  middleName: "",
  lastName: "",
  sex: "",
  dateOfBirth: "",
  address: "",
  fatherLastName: "",
  fatherFirstName: "",
  motherLastName: "",
  motherFirstName: "",
  dateOfConfirmation: "",
  placeOfConfirmation: "",
  minister: "",
  baptismalRecordId: "",
  baptismDate: "",
  baptismPlace: "",
  isPriorMarriage: false,
  isAdult: false,
  bookNumber: "",
  pageNumber: "",
  entryNumber: "",
  remarks: "",
});

export function AdminConfirmationRecordFormPage({ mode }: { mode: "create" | "edit" }) {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const { recordId = "" } = useParams();
  const navigate = useNavigate();
  const id = decodeURIComponent(recordId);

  const { data: existing, loading: existingLoading } = useAsync(
    () => (mode === "edit" ? getConfirmationRecord(parish.id, id) : Promise.resolve(undefined)),
    [parish.id, id, mode]
  );

  const [form, setForm] = useState<FormState>(emptyForm);
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
      dateOfBirth: existing.dateOfBirth ?? "",
      address: existing.address ?? "",
      fatherLastName: existing.fatherLastName ?? "",
      fatherFirstName: existing.fatherFirstName ?? "",
      motherLastName: existing.motherLastName ?? "",
      motherFirstName: existing.motherFirstName ?? "",
      dateOfConfirmation: existing.dateOfConfirmation,
      placeOfConfirmation: existing.placeOfConfirmation,
      minister: existing.minister,
      baptismalRecordId: existing.baptismalRecordId ?? "",
      baptismDate: existing.baptismDate ?? "",
      baptismPlace: existing.baptismPlace ?? "",
      isPriorMarriage: existing.isPriorMarriage,
      isAdult: existing.isAdult,
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

  function applyBaptismalLink(recordId: string, rec: BaptismalRecord | null) {
    setForm((prev) => ({
      ...prev,
      baptismalRecordId: recordId,
      baptismDate: rec?.dateOfBaptism ?? (recordId ? prev.baptismDate : ""),
      baptismPlace: rec?.placeOfBaptism ?? (recordId ? prev.baptismPlace : ""),
      // Prefill blank identity fields from the baptismal entry when linking.
      firstName: prev.firstName || rec?.firstName || "",
      middleName: prev.middleName || rec?.middleName || "",
      lastName: prev.lastName || rec?.lastName || "",
      sex: prev.sex || rec?.sex || "",
      dateOfBirth: prev.dateOfBirth || rec?.dateOfBirth || "",
      address: prev.address || rec?.address || "",
      fatherFirstName: prev.fatherFirstName || rec?.fatherFirstName || "",
      fatherLastName: prev.fatherLastName || rec?.fatherLastName || "",
      motherFirstName: prev.motherFirstName || rec?.motherFirstName || "",
      motherLastName: prev.motherLastName || rec?.motherLastName || "",
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const input = {
      firstName: form.firstName,
      middleName: form.middleName,
      lastName: form.lastName,
      sex: form.sex || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      address: form.address || undefined,
      fatherLastName: form.fatherLastName || undefined,
      fatherFirstName: form.fatherFirstName || undefined,
      motherLastName: form.motherLastName || undefined,
      motherFirstName: form.motherFirstName || undefined,
      dateOfConfirmation: form.dateOfConfirmation,
      placeOfConfirmation: form.placeOfConfirmation,
      minister: form.minister,
      baptismalRecordId: form.baptismalRecordId || undefined,
      baptismDate: form.baptismDate || undefined,
      baptismPlace: form.baptismPlace || undefined,
      isPriorMarriage: form.isPriorMarriage,
      isAdult: form.isAdult,
      bookNumber: form.bookNumber,
      pageNumber: form.pageNumber,
      entryNumber: form.entryNumber,
      remarks: form.remarks || undefined,
    };
    try {
      if (mode === "edit") {
        await updateConfirmationRecord(parish.id, id, input);
      } else {
        await createConfirmationRecord(parish.id, input);
      }
      navigate(-1);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <RecordFormShell
      title={`${mode === "edit" ? "Edit" : "Add"} Confirmation Record`}
      subtitle="Enter details exactly as they appear in the parish confirmation register."
      submitting={submitting}
      submitLabel={mode === "edit" ? "Save changes" : "Confirm & add record"}
      onSubmit={handleSubmit}
    >
      <RecordSection title="Person confirmed" note="As written in the register.">
        <AdminField label="First name" className={`mb-0 ${span.third}`}>
          <AdminInput value={form.firstName} onChange={(e) => setField("firstName", e.target.value)} required />
        </AdminField>
        <AdminField label="Middle name" className={`mb-0 ${span.third}`}>
          <AdminInput value={form.middleName} onChange={(e) => setField("middleName", e.target.value)} required />
        </AdminField>
        <AdminField label="Last name" className={`mb-0 ${span.third}`}>
          <AdminInput value={form.lastName} onChange={(e) => setField("lastName", e.target.value)} required />
        </AdminField>
        <AdminField label="Date of birth" className={`mb-0 ${span.third}`}>
          <AdminInput type="date" value={form.dateOfBirth} onChange={(e) => setField("dateOfBirth", e.target.value)} />
        </AdminField>
        <AdminField label="Sex" className={`mb-0 ${span.third}`}>
          <AdminSelect value={form.sex} onChange={(e) => setField("sex", e.target.value)}>
            <option value="">—</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </AdminSelect>
        </AdminField>
        <AdminField label="Address" className={`mb-0 ${span.full}`}>
          <AdminInput
            value={form.address}
            onChange={(e) => setField("address", e.target.value)}
            placeholder="City / barangay"
          />
        </AdminField>
      </RecordSection>

      <RecordSection title="Parents">
        <AdminField label="Father's first name" className={`mb-0 ${span.half}`}>
          <AdminInput value={form.fatherFirstName} onChange={(e) => setField("fatherFirstName", e.target.value)} />
        </AdminField>
        <AdminField label="Father's last name" className={`mb-0 ${span.half}`}>
          <AdminInput value={form.fatherLastName} onChange={(e) => setField("fatherLastName", e.target.value)} />
        </AdminField>
        <AdminField label="Mother's first name" className={`mb-0 ${span.half}`}>
          <AdminInput value={form.motherFirstName} onChange={(e) => setField("motherFirstName", e.target.value)} />
        </AdminField>
        <AdminField label="Mother's last name" className={`mb-0 ${span.half}`}>
          <AdminInput value={form.motherLastName} onChange={(e) => setField("motherLastName", e.target.value)} />
        </AdminField>
      </RecordSection>

      <RecordSection title="Confirmation" note="Date, minister and church.">
        <AdminField label="Date of confirmation" className={`mb-0 ${span.third}`}>
          <AdminInput
            type="date"
            value={form.dateOfConfirmation}
            onChange={(e) => setField("dateOfConfirmation", e.target.value)}
            required
          />
        </AdminField>
        <AdminField label="Minister" className={`mb-0 ${span.twoThirds}`}>
          <AdminInput
            placeholder="Most Rev. / Rev. Fr."
            value={form.minister}
            onChange={(e) => setField("minister", e.target.value)}
            required
          />
        </AdminField>
        <AdminField label="Place of confirmation" className={`mb-0 ${span.full}`}>
          <AdminInput
            placeholder="Church / parish"
            value={form.placeOfConfirmation}
            onChange={(e) => setField("placeOfConfirmation", e.target.value)}
            required
          />
        </AdminField>
        <div className={`${span.full} flex flex-wrap gap-x-6 gap-y-2`}>
          <label className="flex cursor-pointer items-center gap-2 text-admin-body text-admin-ink">
            <input
              type="checkbox"
              checked={form.isAdult}
              onChange={(e) => setField("isAdult", e.target.checked)}
              className="h-4 w-4 rounded border-admin-border-strong"
            />
            Adult confirmation (RCIA / OCIA)
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-admin-body text-admin-ink">
            <input
              type="checkbox"
              checked={form.isPriorMarriage}
              onChange={(e) => setField("isPriorMarriage", e.target.checked)}
              className="h-4 w-4 rounded border-admin-border-strong"
            />
            Prior marriage on record
          </label>
        </div>
      </RecordSection>

      <RecordSection title="Register reference" note="Where this entry sits in the book.">
        <AdminField label="Book no." className={`mb-0 ${span.sixth}`}>
          <AdminInput value={form.bookNumber} onChange={(e) => setField("bookNumber", e.target.value)} required />
        </AdminField>
        <AdminField label="Page no." className={`mb-0 ${span.sixth}`}>
          <AdminInput value={form.pageNumber} onChange={(e) => setField("pageNumber", e.target.value)} required />
        </AdminField>
        <AdminField label="Entry no." className={`mb-0 ${span.sixth}`}>
          <AdminInput value={form.entryNumber} onChange={(e) => setField("entryNumber", e.target.value)} required />
        </AdminField>
      </RecordSection>

      <RecordSection title="Baptism" note="Optional. Link the baptismal register entry to fill these in.">
        <BaptismalRecordLinkField
          parishId={parish.id}
          value={form.baptismalRecordId}
          initialQuery={[form.firstName, form.middleName, form.lastName].filter(Boolean).join(" ")}
          onChange={(recordId, rec) => applyBaptismalLink(recordId, rec)}
          className={span.full}
        />
        <AdminField label="Date of baptism" className={`mb-0 ${span.third}`}>
          <AdminInput type="date" value={form.baptismDate} onChange={(e) => setField("baptismDate", e.target.value)} />
        </AdminField>
        <AdminField label="Place of baptism" className={`mb-0 ${span.twoThirds}`}>
          <AdminInput
            placeholder="Parish / city"
            value={form.baptismPlace}
            onChange={(e) => setField("baptismPlace", e.target.value)}
          />
        </AdminField>
      </RecordSection>

      <RecordSection title="Remarks">
        <AdminField label="Remarks" className={`mb-0 ${span.full}`}>
          <AdminTextarea
            className="min-h-[84px]"
            value={form.remarks}
            onChange={(e) => setField("remarks", e.target.value)}
            placeholder="Additional notes about this entry"
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

