import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import {
  createMarriageRecord,
  getMarriageRecord,
  updateMarriageRecord,
} from "@/features/parish-admin/records/api/marriageRecordsApi";
import { useAsync } from "@/hooks/useAsync";
import type { Parish } from "@/types";

interface FormState {
  groomFirstName: string;
  groomMiddleName: string;
  groomLastName: string;
  groomDateOfBirth: string;
  groomBaptismalRecordId: string;
  brideFirstName: string;
  brideMiddleName: string;
  brideLastName: string;
  brideDateOfBirth: string;
  brideBaptismalRecordId: string;
  dateOfMarriage: string;
  placeOfMarriage: string;
  minister: string;
  witnessOne: string;
  witnessTwo: string;
  bookNumber: string;
  pageNumber: string;
  entryNumber: string;
  remarks: string;
}

const emptyForm = (): FormState => ({
  groomFirstName: "",
  groomMiddleName: "",
  groomLastName: "",
  groomDateOfBirth: "",
  groomBaptismalRecordId: "",
  brideFirstName: "",
  brideMiddleName: "",
  brideLastName: "",
  brideDateOfBirth: "",
  brideBaptismalRecordId: "",
  dateOfMarriage: "",
  placeOfMarriage: "",
  minister: "",
  witnessOne: "",
  witnessTwo: "",
  bookNumber: "",
  pageNumber: "",
  entryNumber: "",
  remarks: "",
});

const textareaClass =
  "min-h-[80px] w-full resize-y rounded-[7px] border border-admin-border-strong bg-white px-[11px] py-[9px] text-[13.5px] leading-relaxed text-admin-ink focus:border-admin-green-600 focus:outline-none focus:ring-2 focus:ring-admin-green-600/25";

export function AdminMarriageRecordFormPage({ mode }: { mode: "create" | "edit" }) {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const { recordId = "" } = useParams();
  const navigate = useNavigate();
  const id = decodeURIComponent(recordId);

  const { data: existing, loading: existingLoading } = useAsync(
    () => (mode === "edit" ? getMarriageRecord(parish.id, id) : Promise.resolve(undefined)),
    [parish.id, id, mode]
  );

  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setForm({
      groomFirstName: existing.groomFirstName,
      groomMiddleName: existing.groomMiddleName,
      groomLastName: existing.groomLastName,
      groomDateOfBirth: existing.groomDateOfBirth,
      groomBaptismalRecordId: existing.groomBaptismalRecordId ?? "",
      brideFirstName: existing.brideFirstName,
      brideMiddleName: existing.brideMiddleName,
      brideLastName: existing.brideLastName,
      brideDateOfBirth: existing.brideDateOfBirth,
      brideBaptismalRecordId: existing.brideBaptismalRecordId ?? "",
      dateOfMarriage: existing.dateOfMarriage,
      placeOfMarriage: existing.placeOfMarriage,
      minister: existing.minister,
      witnessOne: existing.witnessOne,
      witnessTwo: existing.witnessTwo,
      bookNumber: existing.bookNumber,
      pageNumber: existing.pageNumber,
      entryNumber: existing.entryNumber,
      remarks: existing.remarks ?? "",
    });
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
      groomFirstName: form.groomFirstName,
      groomMiddleName: form.groomMiddleName,
      groomLastName: form.groomLastName,
      groomDateOfBirth: form.groomDateOfBirth,
      groomBaptismalRecordId: form.groomBaptismalRecordId || undefined,
      brideFirstName: form.brideFirstName,
      brideMiddleName: form.brideMiddleName,
      brideLastName: form.brideLastName,
      brideDateOfBirth: form.brideDateOfBirth,
      brideBaptismalRecordId: form.brideBaptismalRecordId || undefined,
      dateOfMarriage: form.dateOfMarriage,
      placeOfMarriage: form.placeOfMarriage,
      minister: form.minister,
      witnessOne: form.witnessOne,
      witnessTwo: form.witnessTwo,
      bookNumber: form.bookNumber,
      pageNumber: form.pageNumber,
      entryNumber: form.entryNumber,
      remarks: form.remarks || undefined,
    };
    try {
      if (mode === "edit") {
        await updateMarriageRecord(parish.id, id, input);
      } else {
        await createMarriageRecord(parish.id, input);
      }
      navigate(-1);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-6">
      <BackLink />

      <div className="mb-5">
        <h1 className="mb-1 text-[26px] font-semibold text-admin-ink">
          {mode === "edit" ? "Edit" : "Add"} Marriage Record
        </h1>
        <p className="text-[13.5px] text-admin-ink-muted">
          Enter details exactly as they appear in the parish marriage register.
        </p>
      </div>

      <AdminCard className="p-5 px-[22px]">
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
            <div>
              <h2 className="mb-3.5 font-sans text-[11.5px] font-semibold uppercase tracking-[0.6px] text-admin-ink-muted">
                Groom
              </h2>
              <div className="mb-4 flex flex-wrap gap-2.5">
                <AdminField label="First" className="mb-0 w-[130px]">
                  <AdminInput
                    value={form.groomFirstName}
                    onChange={(e) => setField("groomFirstName", e.target.value)}
                    required
                  />
                </AdminField>
                <AdminField label="Middle" className="mb-0 w-[130px]">
                  <AdminInput
                    value={form.groomMiddleName}
                    onChange={(e) => setField("groomMiddleName", e.target.value)}
                    required
                  />
                </AdminField>
                <AdminField label="Last" className="mb-0 w-[150px]">
                  <AdminInput
                    value={form.groomLastName}
                    onChange={(e) => setField("groomLastName", e.target.value)}
                    required
                  />
                </AdminField>
              </div>
              <AdminField label="Date of birth">
                <AdminInput
                  type="date"
                  value={form.groomDateOfBirth}
                  onChange={(e) => setField("groomDateOfBirth", e.target.value)}
                  required
                />
              </AdminField>
              <AdminField label="Baptismal record ID (optional)">
                <AdminInput
                  placeholder="e.g. 3:17"
                  value={form.groomBaptismalRecordId}
                  onChange={(e) => setField("groomBaptismalRecordId", e.target.value)}
                />
              </AdminField>
            </div>

            <div>
              <h2 className="mb-3.5 font-sans text-[11.5px] font-semibold uppercase tracking-[0.6px] text-admin-ink-muted">
                Bride
              </h2>
              <div className="mb-4 flex flex-wrap gap-2.5">
                <AdminField label="First" className="mb-0 w-[130px]">
                  <AdminInput
                    value={form.brideFirstName}
                    onChange={(e) => setField("brideFirstName", e.target.value)}
                    required
                  />
                </AdminField>
                <AdminField label="Middle" className="mb-0 w-[130px]">
                  <AdminInput
                    value={form.brideMiddleName}
                    onChange={(e) => setField("brideMiddleName", e.target.value)}
                    required
                  />
                </AdminField>
                <AdminField label="Last" className="mb-0 w-[150px]">
                  <AdminInput
                    value={form.brideLastName}
                    onChange={(e) => setField("brideLastName", e.target.value)}
                    required
                  />
                </AdminField>
              </div>
              <AdminField label="Date of birth">
                <AdminInput
                  type="date"
                  value={form.brideDateOfBirth}
                  onChange={(e) => setField("brideDateOfBirth", e.target.value)}
                  required
                />
              </AdminField>
              <AdminField label="Baptismal record ID (optional)">
                <AdminInput
                  placeholder="e.g. 2:44"
                  value={form.brideBaptismalRecordId}
                  onChange={(e) => setField("brideBaptismalRecordId", e.target.value)}
                />
              </AdminField>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-1 gap-7 md:grid-cols-2">
            <div>
              <h2 className="mb-3.5 font-sans text-[11.5px] font-semibold uppercase tracking-[0.6px] text-admin-ink-muted">
                Marriage details
              </h2>
              <AdminField label="Date of marriage">
                <AdminInput
                  type="date"
                  value={form.dateOfMarriage}
                  onChange={(e) => setField("dateOfMarriage", e.target.value)}
                  required
                />
              </AdminField>
              <AdminField label="Place of marriage">
                <AdminInput
                  placeholder="Church / location"
                  value={form.placeOfMarriage}
                  onChange={(e) => setField("placeOfMarriage", e.target.value)}
                  required
                />
              </AdminField>
              <AdminField label="Minister">
                <AdminInput
                  placeholder="Officiating minister / priest"
                  value={form.minister}
                  onChange={(e) => setField("minister", e.target.value)}
                  required
                />
              </AdminField>
            </div>

            <div>
              <h2 className="mb-3.5 font-sans text-[11.5px] font-semibold uppercase tracking-[0.6px] text-admin-ink-muted">
                Register & witnesses
              </h2>
              <div className="mb-4 grid grid-cols-3 gap-2.5">
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
              </div>
              <AdminField label="Witness one">
                <AdminInput
                  value={form.witnessOne}
                  onChange={(e) => setField("witnessOne", e.target.value)}
                  required
                />
              </AdminField>
              <AdminField label="Witness two">
                <AdminInput
                  value={form.witnessTwo}
                  onChange={(e) => setField("witnessTwo", e.target.value)}
                  required
                />
              </AdminField>
            </div>
          </div>

          <AdminField label="Remarks (optional)" className="mt-7 mb-0">
            <textarea
              value={form.remarks}
              onChange={(e) => setField("remarks", e.target.value)}
              placeholder="Additional notes about this entry"
              className={textareaClass}
            />
          </AdminField>

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

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-3.5 w-3.5">
      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
