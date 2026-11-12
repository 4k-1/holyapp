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
import { savedWithNext, schedulePrefillOf } from "@/features/parish-admin/records/scheduleLink";
import { ScheduleLinkNotice } from "@/features/parish-admin/records/ScheduleLinkNotice";
import { useAsync } from "@/hooks/useAsync";
import type { Godparent, LegitimacyStatus } from "@/features/parish-admin/records/types";
import type { Parish } from "@/types";
import { PAGE_TITLE_CLASS } from "@/features/parish-admin/components/adminPageStyles";
import { LedgerSourcePanel } from "@/features/parish-admin/ledgers/LedgerSourcePanel";
import {
  draftFromLedgerRow,
  godparentsOf,
  isLedgerHandoff,
  type GodparentRole,
} from "@/features/parish-admin/ledgers/ledgerToRecord";
import { AdminBackLink } from "@/features/parish-admin/components/AdminBackLink";

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
  fatherMiddleName: string;
  motherLastName: string;
  motherFirstName: string;
  motherMiddleName: string;
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
  godparent1First: string;
  godparent1Middle: string;
  godparent1Last: string;
  godparent1Role: GodparentRole | "";
  godparent2First: string;
  godparent2Middle: string;
  godparent2Last: string;
  godparent2Role: GodparentRole | "";
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
  fatherMiddleName: "",
  motherLastName: "",
  motherFirstName: "",
  motherMiddleName: "",
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
  godparent1First: "",
  godparent1Middle: "",
  godparent1Last: "",
  godparent1Role: "",
  godparent2First: "",
  godparent2Middle: "",
  godparent2Last: "",
  godparent2Role: "",
});

/** A saved record's godparents as the two form rows. */
function godparentFields(list: Godparent[] = []) {
  const at = (i: number) => list[i];
  return {
    godparent1First: at(0)?.firstName ?? "",
    godparent1Middle: at(0)?.middleName ?? "",
    godparent1Last: at(0)?.lastName ?? "",
    godparent1Role: at(0)?.role ?? "",
    godparent2First: at(1)?.firstName ?? "",
    godparent2Middle: at(1)?.middleName ?? "",
    godparent2Last: at(1)?.lastName ?? "",
    godparent2Role: at(1)?.role ?? "",
  } satisfies Partial<FormState>;
}

export function AdminBaptismalRecordFormPage({ mode }: { mode: "create" | "edit" }) {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const { recordId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const id = decodeURIComponent(recordId);

  // Opened from the register check screen with a ledger row, or from the schedule.
  const ledger = mode === "create" && isLedgerHandoff(location.state) ? location.state : null;
  const [ledgerDraft] = useState(() => (ledger ? draftFromLedgerRow(ledger) : null));
  const prefill = mode === "create" && !ledger ? schedulePrefillOf(location.state) : null;
  // Children already saved from this baptism session.
  const [saved, setSaved] = useState<string[]>([]);

  const { data: existing, loading: existingLoading } = useAsync(
    () => (mode === "edit" ? getBaptismalRecord(parish.id, id) : Promise.resolve(undefined)),
    [parish.id, id, mode]
  );

  const [form, setForm] = useState<FormState>(() => {
    const base = emptyForm(parish.name);
    if (ledgerDraft) return { ...base, ...ledgerDraft.draft };
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
      fatherMiddleName: existing.fatherMiddleName ?? "",
      motherLastName: existing.motherLastName,
      motherFirstName: existing.motherFirstName,
      motherMiddleName: existing.motherMiddleName ?? "",
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
      ...godparentFields(existing.godparents),
    });
  }

  if (mode === "edit" && existingLoading) {
    return (
      <AdminFormPage>
        <AdminBackLink />
        <p className="text-admin-body text-admin-ink-muted">Loading record…</p>
      </AdminFormPage>
    );
  }

  if (mode === "edit" && !existing) {
    return (
      <AdminFormPage>
        <AdminBackLink />
        <h1 className={`mb-1 ${PAGE_TITLE_CLASS}`}>Record not found</h1>
      </AdminFormPage>
    );
  }

  // With no parent recorded (e.g. a foundling), the register should say why.
  const noParents = !form.fatherLastName.trim() && !form.motherLastName.trim();

  // A godparent row with any name in it needs both a first and a last name.
  const hasGodparent = (n: 1 | 2) =>
    Boolean((form[`godparent${n}First`] + form[`godparent${n}Middle`] + form[`godparent${n}Last`]).trim());

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
      fatherMiddleName: form.fatherMiddleName,
      motherLastName: form.motherLastName,
      motherFirstName: form.motherFirstName,
      motherMiddleName: form.motherMiddleName,
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
      godparents: godparentsOf(form),
      // Made from a scanned register row: link the record to that page and row.
      ...(ledger?.ledgerPageId ? { ledgerPageId: ledger.ledgerPageId, ledgerRow: ledger.row } : {}),
      // Opened from the schedule: link the entry to that baptism session.
      ...(prefill ? { scheduleEventId: prefill.scheduleBlockId } : {}),
    };
    const next = savedWithNext(e);
    try {
      if (mode === "edit") {
        await updateBaptismalRecord(parish.id, id, input);
      } else {
        await createBaptismalRecord(parish.id, input);
      }
      if (next) {
        // Same session: keep the date, place, minister and book; clear the child.
        setSaved((prev) => [...prev, [form.firstName, form.lastName].filter(Boolean).join(" ")]);
        setForm({
          ...emptyForm(parish.name),
          dateOfBaptism: form.dateOfBaptism,
          placeOfBaptism: form.placeOfBaptism,
          minister: form.minister,
          bookNumber: form.bookNumber,
          pageNumber: form.pageNumber,
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
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
        ledger && ledgerDraft ? (
          <LedgerSourcePanel handoff={ledger} notes={ledgerDraft.notes} />
        ) : (
          prefill && <ScheduleLinkNotice prefill={prefill} saved={saved} person="child" />
        )
      }
      submitting={submitting}
      submitLabel={mode === "edit" ? "Save changes" : "Confirm & add record"}
      nextLabel={prefill?.batch ? "Save and add the next" : undefined}
      onSubmit={handleSubmit}
    >
      <RecordSection title="Person baptized" note="As written in the register.">
        <AdminField label="First name" className={`mb-0 ${span.third}`}>
          <AdminInput placeholder="Juan" value={form.firstName} onChange={(e) => setField("firstName", e.target.value)} required />
        </AdminField>
        <AdminField label="Middle name" className={`mb-0 ${span.third}`}>
          <AdminInput placeholder="If recorded" value={form.middleName} onChange={(e) => setField("middleName", e.target.value)} />
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

      <RecordSection
        title="Parents"
        note="Only as the register names them. A child of an unmarried mother may have no father recorded, and a foundling no parents."
      >
        <AdminField label="Father's first name" className={`mb-0 ${span.third}`}>
          <AdminInput value={form.fatherFirstName} onChange={(e) => setField("fatherFirstName", e.target.value)} />
        </AdminField>
        <AdminField label="Father's middle name" className={`mb-0 ${span.third}`}>
          <AdminInput value={form.fatherMiddleName} onChange={(e) => setField("fatherMiddleName", e.target.value)} />
        </AdminField>
        <AdminField label="Father's last name" className={`mb-0 ${span.third}`}>
          <AdminInput
            value={form.fatherLastName}
            onChange={(e) => setField("fatherLastName", e.target.value)}
            required={Boolean(form.fatherFirstName.trim() || form.fatherMiddleName.trim())}
          />
        </AdminField>
        <AdminField label="Mother's first name" className={`mb-0 ${span.third}`}>
          <AdminInput value={form.motherFirstName} onChange={(e) => setField("motherFirstName", e.target.value)} />
        </AdminField>
        <AdminField label="Mother's middle name" className={`mb-0 ${span.third}`}>
          <AdminInput value={form.motherMiddleName} onChange={(e) => setField("motherMiddleName", e.target.value)} />
        </AdminField>
        <AdminField label="Mother's last name" className={`mb-0 ${span.third}`}>
          <AdminInput
            value={form.motherLastName}
            onChange={(e) => setField("motherLastName", e.target.value)}
            required={Boolean(form.motherFirstName.trim() || form.motherMiddleName.trim())}
          />
        </AdminField>
      </RecordSection>

      <RecordSection
        title="Godparents"
        note="The register's sponsors. One godfather, one godmother, or one of each (can. 873)."
      >
        <AdminField label="Godparent 1: first name" className={`mb-0 ${span.third}`}>
          <AdminInput
            value={form.godparent1First}
            onChange={(e) => setField("godparent1First", e.target.value)}
            required={hasGodparent(1)}
          />
        </AdminField>
        <AdminField label="Middle name" className={`mb-0 ${span.third}`}>
          <AdminInput value={form.godparent1Middle} onChange={(e) => setField("godparent1Middle", e.target.value)} />
        </AdminField>
        <AdminField label="Last name" className={`mb-0 ${span.third}`}>
          <AdminInput
            value={form.godparent1Last}
            onChange={(e) => setField("godparent1Last", e.target.value)}
            required={hasGodparent(1)}
          />
        </AdminField>
        <AdminField label="Role" className={`mb-0 ${span.third}`}>
          <AdminSelect
            value={form.godparent1Role}
            onChange={(e) => setField("godparent1Role", e.target.value as GodparentRole | "")}
          >
            <option value="">—</option>
            <option value="Godfather" disabled={form.godparent2Role === "Godfather"}>
              Godfather
            </option>
            <option value="Godmother" disabled={form.godparent2Role === "Godmother"}>
              Godmother
            </option>
          </AdminSelect>
        </AdminField>
        <div className={`hidden @min-[36rem]:block ${span.twoThirds}`} />
        <AdminField label="Godparent 2: first name" className={`mb-0 ${span.third}`}>
          <AdminInput
            value={form.godparent2First}
            onChange={(e) => setField("godparent2First", e.target.value)}
            required={hasGodparent(2)}
          />
        </AdminField>
        <AdminField label="Middle name" className={`mb-0 ${span.third}`}>
          <AdminInput value={form.godparent2Middle} onChange={(e) => setField("godparent2Middle", e.target.value)} />
        </AdminField>
        <AdminField label="Last name" className={`mb-0 ${span.third}`}>
          <AdminInput
            value={form.godparent2Last}
            onChange={(e) => setField("godparent2Last", e.target.value)}
            required={hasGodparent(2)}
          />
        </AdminField>
        <AdminField label="Role" className={`mb-0 ${span.third}`}>
          <AdminSelect
            value={form.godparent2Role}
            onChange={(e) => setField("godparent2Role", e.target.value as GodparentRole | "")}
          >
            <option value="">—</option>
            <option value="Godfather" disabled={form.godparent1Role === "Godfather"}>
              Godfather
            </option>
            <option value="Godmother" disabled={form.godparent1Role === "Godmother"}>
              Godmother
            </option>
          </AdminSelect>
        </AdminField>
        <div className={`hidden @min-[36rem]:block ${span.twoThirds}`} />
      </RecordSection>

      <RecordSection title="Grandparents" note="Optional. Only if the register lists them.">
        <AdminField label="Paternal grandfather" className={`mb-0 ${span.half}`}>
          <AdminInput value={form.paternalGrandfather} onChange={(e) => setField("paternalGrandfather", e.target.value)} />
        </AdminField>
        <AdminField label="Paternal grandmother" className={`mb-0 ${span.half}`}>
          <AdminInput value={form.paternalGrandmother} onChange={(e) => setField("paternalGrandmother", e.target.value)} />
        </AdminField>
        <AdminField label="Maternal grandfather" className={`mb-0 ${span.half}`}>
          <AdminInput value={form.maternalGrandfather} onChange={(e) => setField("maternalGrandfather", e.target.value)} />
        </AdminField>
        <AdminField label="Maternal grandmother" className={`mb-0 ${span.half}`}>
          <AdminInput value={form.maternalGrandmother} onChange={(e) => setField("maternalGrandmother", e.target.value)} />
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
            placeholder={
              noParents
                ? "Required when no parent is recorded. For a foundling: when, where and by whom the child was found."
                : "Optional notes from the register"
            }
            required={noParents}
            className="min-h-[84px]"
          />
        </AdminField>
      </RecordSection>
    </RecordFormShell>
  );
}


