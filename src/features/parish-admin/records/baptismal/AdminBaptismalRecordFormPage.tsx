import { useState, type FormEvent } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { MOCK_BAPTISMAL_RECORDS } from "@/services/mocks/baptismalRecords.mock";
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
  baptismDate: string;
  book: string;
  page: string;
  line: string;
  sponsor1: string;
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
  baptismDate: "",
  book: "",
  page: "",
  line: "",
  sponsor1: "",
  sponsor2: "",
});

export function AdminBaptismalRecordFormPage({ mode }: { mode: "create" | "edit" }) {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const { recordId = "" } = useParams();
  const navigate = useNavigate();
  const id = decodeURIComponent(recordId);
  const existing =
    mode === "edit"
      ? MOCK_BAPTISMAL_RECORDS.find((r) => r.id === id && r.parishId === parish.id)
      : undefined;

  const [form, setForm] = useState<FormState>(() => {
    if (!existing) return emptyForm();
    return {
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
      baptismDate: "",
      book: existing.book,
      page: existing.page,
      line: existing.line,
      sponsor1: existing.sponsor1,
      sponsor2: existing.sponsor2,
    };
  });

  const [showGodparent2, setShowGodparent2] = useState(Boolean(existing?.sponsor2));

  if (mode === "edit" && !existing) {
    return (
      <div className="p-6">
        <BackLink to=".." />
        <h1 className="mb-1 text-[26px] font-semibold text-admin-ink">Record not found</h1>
      </div>
    );
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    console.info(`[mock] ${mode === "edit" ? "update" : "create"} baptismal record`, form);
    navigate("..");
  }

  const backTo = "..";

  return (
    <div className="p-6">
      <BackLink to={backTo} label="Back" />

      <div className="mb-5">
        <h1 className="mb-1 text-[26px] font-semibold text-admin-ink">
          {mode === "edit" ? "Edit" : "Add"} Baptismal Record
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
                  Name of baptized
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
                Baptismal information
              </h2>

              <AdminField label="Officiating priest">
                <AdminInput
                  placeholder="Rev. Fr."
                  value={form.priest}
                  onChange={(e) => setField("priest", e.target.value)}
                />
              </AdminField>

              <AdminField label="Baptismal date">
                <AdminInput
                  type="date"
                  value={form.baptismDate}
                  onChange={(e) => setField("baptismDate", e.target.value)}
                />
              </AdminField>

              <div className="mb-4 grid grid-cols-3 gap-2.5">
                <AdminField label="Book no." className="mb-0">
                  <AdminInput
                    placeholder="6"
                    value={form.book}
                    onChange={(e) => setField("book", e.target.value)}
                    className="max-w-[72px]"
                  />
                </AdminField>
                <AdminField label="Page no." className="mb-0">
                  <AdminInput
                    placeholder="21"
                    value={form.page}
                    onChange={(e) => setField("page", e.target.value)}
                    className="max-w-[72px]"
                  />
                </AdminField>
                <AdminField label="Line no." className="mb-0">
                  <AdminInput
                    placeholder="04"
                    value={form.line}
                    onChange={(e) => setField("line", e.target.value)}
                    className="max-w-[72px]"
                  />
                </AdminField>
              </div>

              <AdminField label="Godparents">
                {mode === "edit" && existing && (
                  <p className="mb-1.5 text-[11.5px] text-admin-ink-faint">
                    {existing.sponsor1}
                    {existing.sponsor2 ? `, ${existing.sponsor2}` : ""}
                  </p>
                )}
                <AdminInput
                  placeholder="Godparent 1"
                  value={form.sponsor1}
                  onChange={(e) => setField("sponsor1", e.target.value)}
                  className="mb-2.5"
                />
                {showGodparent2 ? (
                  <AdminInput
                    placeholder="Godparent 2"
                    value={form.sponsor2}
                    onChange={(e) => setField("sponsor2", e.target.value)}
                  />
                ) : (
                  <AdminButton
                    variant="secondary"
                    size="sm"
                    type="button"
                    onClick={() => setShowGodparent2(true)}
                  >
                    <PlusIcon />
                    Add godparent
                  </AdminButton>
                )}
              </AdminField>
            </div>
          </div>

          <div className="mt-2.5 flex justify-end gap-2.5">
            <AdminButton variant="secondary" type="button" onClick={() => navigate(backTo)}>
              Cancel
            </AdminButton>
            <AdminButton type="submit">
              <CheckIcon />
              {mode === "edit" ? "Save changes" : "Confirm & add record"}
            </AdminButton>
          </div>
        </form>
      </AdminCard>
    </div>
  );
}

function BackLink({ to, label = "Back to Baptismal Records" }: { to: string; label?: string }) {
  return (
    <Link
      to={to}
      className="mb-3.5 inline-flex items-center gap-1.5 text-[13px] text-admin-ink-muted hover:text-admin-green-700"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
        <polyline points="15 18 9 12 15 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </Link>
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
