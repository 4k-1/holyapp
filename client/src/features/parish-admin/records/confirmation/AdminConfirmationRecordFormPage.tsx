import { useState, type FormEvent } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import {
  AdminButton,
  AdminField,
  AdminFieldGroup,
  AdminFormPage,
  AdminFormSection,
  AdminInput,
  AdminSelect,
  AdminTextarea,
  NoteIcon,
  UserIcon,
} from "@/features/parish-admin/components/AdminForm";
import { DropletIcon, ShieldIcon } from "@/components/ui/icons/SacramentIcons";
import {
  createConfirmationRecord,
  getConfirmationRecord,
  updateConfirmationRecord,
} from "@/features/parish-admin/records/api/confirmationRecordsApi";
import { BaptismalRecordLinkField } from "@/features/parish-admin/records/BaptismalRecordLinkField";
import { useAsync } from "@/hooks/useAsync";
import type { BaptismalRecord } from "@/features/parish-admin/records/types";
import type { Parish } from "@/types";

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
    <AdminFormPage>
      <BackLink />

      <div className="mb-5">
        <h1 className="mb-1 text-admin-page font-semibold text-admin-ink">
          {mode === "edit" ? "Edit" : "Add"} Confirmation Record
        </h1>
        <p className="text-admin-body text-admin-ink-muted">
          Enter details exactly as they appear in the parish confirmation register.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <AdminFormSection
          tone="blue"
          icon={<UserIcon className="h-4.5 w-4.5" />}
          title="Personal information"
          description="Who was confirmed, and their family details."
        >
          <AdminFieldGroup cols={3}>
            <AdminField label="First name" className="mb-0">
              <AdminInput value={form.firstName} onChange={(e) => setField("firstName", e.target.value)} required />
            </AdminField>
            <AdminField label="Middle name" className="mb-0">
              <AdminInput value={form.middleName} onChange={(e) => setField("middleName", e.target.value)} required />
            </AdminField>
            <AdminField label="Last name" className="mb-0">
              <AdminInput value={form.lastName} onChange={(e) => setField("lastName", e.target.value)} required />
            </AdminField>
          </AdminFieldGroup>

          <AdminFieldGroup cols={3} title="Birth & residence">
            <AdminField label="Sex" className="mb-0">
              <AdminSelect value={form.sex} onChange={(e) => setField("sex", e.target.value)}>
                <option value="">—</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </AdminSelect>
            </AdminField>
            <AdminField label="Date of birth" className="mb-0 sm:col-span-2">
              <AdminInput
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setField("dateOfBirth", e.target.value)}
              />
            </AdminField>
            <AdminField label="Address" className="mb-0 sm:col-span-3">
              <AdminInput
                value={form.address}
                onChange={(e) => setField("address", e.target.value)}
                placeholder="City / barangay"
              />
            </AdminField>
          </AdminFieldGroup>

          <AdminFieldGroup cols={2} title="Father">
            <AdminField label="First name" className="mb-0">
              <AdminInput value={form.fatherFirstName} onChange={(e) => setField("fatherFirstName", e.target.value)} />
            </AdminField>
            <AdminField label="Last name" className="mb-0">
              <AdminInput value={form.fatherLastName} onChange={(e) => setField("fatherLastName", e.target.value)} />
            </AdminField>
          </AdminFieldGroup>

          <AdminFieldGroup cols={2} title="Mother" className="mb-0">
            <AdminField label="First name" className="mb-0">
              <AdminInput value={form.motherFirstName} onChange={(e) => setField("motherFirstName", e.target.value)} />
            </AdminField>
            <AdminField label="Last name" className="mb-0">
              <AdminInput value={form.motherLastName} onChange={(e) => setField("motherLastName", e.target.value)} />
            </AdminField>
          </AdminFieldGroup>
        </AdminFormSection>

        <AdminFormSection
          tone="gold"
          icon={<ShieldIcon className="h-4.5 w-4.5" />}
          title="Confirmation details"
          description="Minister, date, and register reference for this sacrament."
        >
          <AdminFieldGroup cols={2}>
            <AdminField label="Date of confirmation" className="mb-0">
              <AdminInput
                type="date"
                value={form.dateOfConfirmation}
                onChange={(e) => setField("dateOfConfirmation", e.target.value)}
                required
              />
            </AdminField>
            <AdminField label="Minister" className="mb-0">
              <AdminInput
                placeholder="Most Rev. / Rev. Fr."
                value={form.minister}
                onChange={(e) => setField("minister", e.target.value)}
                required
              />
            </AdminField>
            <AdminField label="Place of confirmation" className="mb-0 sm:col-span-2">
              <AdminInput
                placeholder="Church / parish"
                value={form.placeOfConfirmation}
                onChange={(e) => setField("placeOfConfirmation", e.target.value)}
                required
              />
            </AdminField>
          </AdminFieldGroup>

          <AdminFieldGroup cols={3} title="Register reference">
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

          <div className="flex flex-col gap-2.5">
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={form.isAdult}
                onChange={(e) => setField("isAdult", e.target.checked)}
                className="h-4 w-4 rounded border-admin-border-strong text-admin-green-700 focus:ring-admin-green-700/20"
              />
              <span className="text-admin-body text-admin-ink">Adult confirmation (RCIA / OCIA)</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={form.isPriorMarriage}
                onChange={(e) => setField("isPriorMarriage", e.target.checked)}
                className="h-4 w-4 rounded border-admin-border-strong text-admin-green-700 focus:ring-admin-green-700/20"
              />
              <span className="text-admin-body text-admin-ink">Prior marriage on record</span>
            </label>
          </div>
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
            onChange={(recordId, rec) => applyBaptismalLink(recordId, rec)}
            className="mb-4"
          />

          <AdminFieldGroup cols={2} className="mb-0">
            <AdminField label="Baptismal date" className="mb-0">
              <AdminInput
                type="date"
                value={form.baptismDate}
                onChange={(e) => setField("baptismDate", e.target.value)}
              />
            </AdminField>
            <AdminField label="Place of baptism" className="mb-0">
              <AdminInput
                placeholder="Parish / city"
                value={form.baptismPlace}
                onChange={(e) => setField("baptismPlace", e.target.value)}
              />
            </AdminField>
          </AdminFieldGroup>
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
