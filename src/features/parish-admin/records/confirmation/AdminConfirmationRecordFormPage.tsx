import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import {
  AdminButton,
  AdminField,
  AdminFieldGroup,
  AdminFormSection,
  AdminInput,
  NoteIcon,
  UserIcon,
} from "@/features/parish-admin/components/AdminForm";
import { DropletIcon, ShieldIcon } from "@/components/ui/icons/SacramentIcons";
import {
  createConfirmationRecord,
  getConfirmationRecord,
  updateConfirmationRecord,
} from "@/features/parish-admin/records/api/confirmationRecordsApi";
import { useAsync } from "@/hooks/useAsync";
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

const selectClass =
  "w-full rounded-[7px] border border-admin-border-strong bg-white px-[11px] py-[9px] text-[13.5px] text-admin-ink focus:border-admin-green-600 focus:outline-none focus:ring-2 focus:ring-admin-green-600/25";

const textareaClass =
  "min-h-[80px] w-full resize-y rounded-[7px] border border-admin-border-strong bg-white px-[11px] py-[9px] text-[13.5px] leading-relaxed text-admin-ink focus:border-admin-green-600 focus:outline-none focus:ring-2 focus:ring-admin-green-600/25";

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

  useEffect(() => {
    if (!existing) return;
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
    <div>
      <BackLink />

      <div className="mb-5">
        <h1 className="mb-1 text-[26px] font-semibold text-admin-ink">
          {mode === "edit" ? "Edit" : "Add"} Confirmation Record
        </h1>
        <p className="text-[13.5px] text-admin-ink-muted">
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
          <AdminFieldGroup title="Name of confirmed">
            <AdminField label="First" className="mb-0 w-[130px]">
              <AdminInput value={form.firstName} onChange={(e) => setField("firstName", e.target.value)} required />
            </AdminField>
            <AdminField label="Middle" className="mb-0 w-[130px]">
              <AdminInput value={form.middleName} onChange={(e) => setField("middleName", e.target.value)} required />
            </AdminField>
            <AdminField label="Last" className="mb-0 w-[150px]">
              <AdminInput value={form.lastName} onChange={(e) => setField("lastName", e.target.value)} required />
            </AdminField>
          </AdminFieldGroup>

          <AdminFieldGroup title="Birth & residence">
            <AdminField label="Sex" className="mb-0 w-[110px]">
              <select value={form.sex} onChange={(e) => setField("sex", e.target.value)} className={selectClass}>
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
              />
            </AdminField>
            <AdminField label="Address" className="mb-0 flex-1">
              <AdminInput
                value={form.address}
                onChange={(e) => setField("address", e.target.value)}
                placeholder="City / barangay"
              />
            </AdminField>
          </AdminFieldGroup>

          <AdminFieldGroup title="Father">
            <AdminField label="Last" className="mb-0 w-[140px]">
              <AdminInput value={form.fatherLastName} onChange={(e) => setField("fatherLastName", e.target.value)} />
            </AdminField>
            <AdminField label="First" className="mb-0 w-[160px]">
              <AdminInput value={form.fatherFirstName} onChange={(e) => setField("fatherFirstName", e.target.value)} />
            </AdminField>
          </AdminFieldGroup>

          <AdminFieldGroup title="Mother" className="mb-0">
            <AdminField label="Last" className="mb-0 w-[140px]">
              <AdminInput value={form.motherLastName} onChange={(e) => setField("motherLastName", e.target.value)} />
            </AdminField>
            <AdminField label="First" className="mb-0 w-[160px]">
              <AdminInput value={form.motherFirstName} onChange={(e) => setField("motherFirstName", e.target.value)} />
            </AdminField>
          </AdminFieldGroup>
        </AdminFormSection>

        <AdminFormSection
          tone="gold"
          icon={<ShieldIcon className="h-4.5 w-4.5" />}
          title="Confirmation details"
          description="Minister, date, and register reference for this sacrament."
        >
          <AdminField label="Date of confirmation">
            <AdminInput
              type="date"
              value={form.dateOfConfirmation}
              onChange={(e) => setField("dateOfConfirmation", e.target.value)}
              required
            />
          </AdminField>

          <AdminField label="Place of confirmation">
            <AdminInput
              placeholder="Church / parish"
              value={form.placeOfConfirmation}
              onChange={(e) => setField("placeOfConfirmation", e.target.value)}
              required
            />
          </AdminField>

          <AdminField label="Minister">
            <AdminInput
              placeholder="Most Rev. / Rev. Fr."
              value={form.minister}
              onChange={(e) => setField("minister", e.target.value)}
              required
            />
          </AdminField>

          <AdminFieldGroup title="Register reference">
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
          </AdminFieldGroup>

          <div className="flex flex-col gap-2.5">
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={form.isAdult}
                onChange={(e) => setField("isAdult", e.target.checked)}
                className="h-4 w-4 rounded border-admin-border-strong text-admin-green-700 focus:ring-admin-green-600/25"
              />
              <span className="text-[13px] text-admin-ink">Adult confirmation (RCIA / OCIA)</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={form.isPriorMarriage}
                onChange={(e) => setField("isPriorMarriage", e.target.checked)}
                className="h-4 w-4 rounded border-admin-border-strong text-admin-green-700 focus:ring-admin-green-600/25"
              />
              <span className="text-[13px] text-admin-ink">Prior marriage on record</span>
            </label>
          </div>
        </AdminFormSection>

        <AdminFormSection
          tone="green"
          icon={<DropletIcon className="h-4.5 w-4.5" />}
          title="Baptism reference"
          description="Optional — link back to the baptismal register."
        >
          <AdminField label="Baptismal record ID">
            <AdminInput
              placeholder="e.g. 6:21"
              value={form.baptismalRecordId}
              onChange={(e) => setField("baptismalRecordId", e.target.value)}
            />
          </AdminField>

          <AdminField label="Baptismal date">
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
            <CheckIcon />
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

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-3.5 w-3.5">
      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
