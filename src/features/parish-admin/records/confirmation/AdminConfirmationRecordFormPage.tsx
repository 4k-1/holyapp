import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
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
  birthdate: string;
  birthplace: string;
  motherFirstName: string;
  motherLastName: string;
  fatherFirstName: string;
  fatherLastName: string;
  priest: string;
  confirmationDate: string;
  baptismDate: string;
  baptismParish: string;
  book: string;
  page: string;
  line: string;
  sponsor: string;
  sponsor2: string;
}

const emptyForm = (): FormState => ({
  firstName: "",
  middleName: "",
  lastName: "",
  birthdate: "",
  birthplace: "",
  motherFirstName: "",
  motherLastName: "",
  fatherFirstName: "",
  fatherLastName: "",
  priest: "",
  confirmationDate: "",
  baptismDate: "",
  baptismParish: "",
  book: "",
  page: "",
  line: "",
  sponsor: "",
  sponsor2: "",
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
  const [showSponsor2, setShowSponsor2] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setForm({
      firstName: existing.firstName,
      middleName: existing.middleName,
      lastName: existing.lastName,
      birthdate: "",
      birthplace: existing.birthplace,
      motherFirstName: existing.motherFirstName,
      motherLastName: existing.motherLastName,
      fatherFirstName: existing.fatherFirstName,
      fatherLastName: existing.fatherLastName,
      priest: existing.priest,
      confirmationDate: "",
      baptismDate: existing.baptismDate ?? "",
      baptismParish: existing.baptismParish ?? "",
      book: existing.book,
      page: existing.page,
      line: existing.line,
      sponsor: existing.sponsor,
      sponsor2: existing.sponsor2 ?? "",
    });
    setShowSponsor2(Boolean(existing.sponsor2));
  }, [existing]);

  if (mode === "edit" && existingLoading) {
    return (
      <div className="p-6">
        <BackLink />
        <p className="text-[13.5px] text-admin-ink-muted">Loading record…</p>
      </div>
    );
  }

  if (mode === "edit" && !existing) {
    return (
      <div className="p-6">
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
      dob: form.birthdate,
      birthplace: form.birthplace,
      confirmationDate: form.confirmationDate,
      priest: form.priest,
      sponsor: form.sponsor,
      sponsor2: form.sponsor2 || undefined,
      baptismDate: form.baptismDate || undefined,
      baptismParish: form.baptismParish || undefined,
      motherFirstName: form.motherFirstName,
      motherLastName: form.motherLastName,
      fatherFirstName: form.fatherFirstName,
      fatherLastName: form.fatherLastName,
      book: form.book,
      page: form.page,
      line: form.line,
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
          {mode === "edit"
            ? "Update the details of this record."
            : "Enter details exactly as they appear in the parish register."}
        </p>
      </div>

      <AdminCard className="p-5 px-[22px]">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
            <div>
              <h2 className="mb-3.5 font-sans text-[11.5px] font-semibold uppercase tracking-[0.6px] text-admin-ink-muted">
                Personal information
              </h2>

              <div className="mb-4">
                <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.6px] text-admin-gold-700">
                  Name of confirmed
                </p>
                <div className="flex flex-wrap gap-2.5">
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
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-2.5">
                <AdminField label="Birthdate" className="mb-0 w-[150px]">
                  <AdminInput
                    type="date"
                    value={form.birthdate}
                    onChange={(e) => setField("birthdate", e.target.value)}
                  />
                </AdminField>
                <AdminField label="Birthplace" className="mb-0 w-[200px]">
                  <AdminInput
                    value={form.birthplace}
                    onChange={(e) => setField("birthplace", e.target.value)}
                  />
                </AdminField>
              </div>

              <div className="mb-4">
                <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.6px] text-admin-gold-700">
                  Mother
                </p>
                <div className="flex flex-wrap gap-2.5">
                  <AdminField label="First" className="mb-0 w-[140px]">
                    <AdminInput
                      placeholder="First"
                      value={form.motherFirstName}
                      onChange={(e) => setField("motherFirstName", e.target.value)}
                    />
                  </AdminField>
                  <AdminField label="Last" className="mb-0 w-[160px]">
                    <AdminInput
                      placeholder="Last"
                      value={form.motherLastName}
                      onChange={(e) => setField("motherLastName", e.target.value)}
                    />
                  </AdminField>
                </div>
              </div>

              <div className="mb-4">
                <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.6px] text-admin-gold-700">
                  Father
                </p>
                <div className="flex flex-wrap gap-2.5">
                  <AdminField label="First" className="mb-0 w-[140px]">
                    <AdminInput
                      placeholder="First"
                      value={form.fatherFirstName}
                      onChange={(e) => setField("fatherFirstName", e.target.value)}
                    />
                  </AdminField>
                  <AdminField label="Last" className="mb-0 w-[160px]">
                    <AdminInput
                      placeholder="Last"
                      value={form.fatherLastName}
                      onChange={(e) => setField("fatherLastName", e.target.value)}
                    />
                  </AdminField>
                </div>
              </div>
            </div>

            <div>
              <h2 className="mb-3.5 font-sans text-[11.5px] font-semibold uppercase tracking-[0.6px] text-admin-ink-muted">
                Confirmation information
              </h2>

              <AdminField label="Minister (bishop or priest)">
                <AdminInput
                  placeholder="Most Rev. / Rev. Fr."
                  value={form.priest}
                  onChange={(e) => setField("priest", e.target.value)}
                />
              </AdminField>

              <AdminField label="Confirmation date">
                <AdminInput
                  type="date"
                  value={form.confirmationDate}
                  onChange={(e) => setField("confirmationDate", e.target.value)}
                />
              </AdminField>

              <div className="mb-4 grid grid-cols-3 gap-2.5">
                <AdminField label="Book no." className="mb-0">
                  <AdminInput
                    placeholder="2"
                    value={form.book}
                    onChange={(e) => setField("book", e.target.value)}
                    className="max-w-[72px]"
                  />
                </AdminField>
                <AdminField label="Page no." className="mb-0">
                  <AdminInput
                    placeholder="08"
                    value={form.page}
                    onChange={(e) => setField("page", e.target.value)}
                    className="max-w-[72px]"
                  />
                </AdminField>
                <AdminField label="Line no." className="mb-0">
                  <AdminInput
                    placeholder="14"
                    value={form.line}
                    onChange={(e) => setField("line", e.target.value)}
                    className="max-w-[72px]"
                  />
                </AdminField>
              </div>

              <AdminField label="Sponsors">
                {mode === "edit" && existing && (
                  <p className="mb-1.5 text-[11.5px] text-admin-ink-faint">
                    {existing.sponsor}
                    {existing.sponsor2 ? `, ${existing.sponsor2}` : ""}
                  </p>
                )}
                <AdminInput
                  placeholder="Sponsor"
                  value={form.sponsor}
                  onChange={(e) => setField("sponsor", e.target.value)}
                  className="mb-2.5"
                />
                {showSponsor2 ? (
                  <AdminInput
                    placeholder="Sponsor 2"
                    value={form.sponsor2}
                    onChange={(e) => setField("sponsor2", e.target.value)}
                  />
                ) : (
                  <AdminButton
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={() => setShowSponsor2(true)}
                  >
                    <PlusIcon />
                    Add sponsor
                  </AdminButton>
                )}
              </AdminField>

              <h2 className="mb-3.5 mt-5 font-sans text-[11.5px] font-semibold uppercase tracking-[0.6px] text-admin-ink-muted">
                Baptism reference (optional)
              </h2>

              <AdminField label="Baptismal date">
                <AdminInput
                  type="date"
                  value={form.baptismDate}
                  onChange={(e) => setField("baptismDate", e.target.value)}
                />
              </AdminField>

              <AdminField label="Parish of baptism">
                <AdminInput
                  placeholder="Leave blank if this parish"
                  value={form.baptismParish}
                  onChange={(e) => setField("baptismParish", e.target.value)}
                />
              </AdminField>
            </div>
          </div>

          <div className="mt-2.5 flex justify-end gap-2.5">
            <AdminButton variant="secondary" type="button" onClick={() => navigate(-1)}>
              Cancel
            </AdminButton>
            <AdminButton type="submit" disabled={submitting}>
              <CheckIcon />
              {submitting ? "Saving…" : mode === "edit" ? "Save changes" : "Confirm & add record"}
            </AdminButton>
          </div>
        </form>
      </AdminCard>
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

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
      <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" />
      <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-3.5 w-3.5">
      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
