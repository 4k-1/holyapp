import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import {
  AdminButton,
  AdminField,
  AdminFieldGroup,
  AdminFormPage,
  AdminFormSection,
  AdminInput,
  BookIcon,
  NoteIcon,
  UserIcon,
  type AdminSectionTone,
} from "@/features/parish-admin/components/AdminForm";
import { HeartIcon } from "@/components/ui/icons/SacramentIcons";
import {
  createMarriageRecord,
  getMarriageRecord,
  updateMarriageRecord,
  type MarriagePartyInput,
} from "@/features/parish-admin/records/api/marriageRecordsApi";
import { getMarriageParty } from "@/features/parish-admin/records/marriageHelpers";
import { useAsync } from "@/hooks/useAsync";
import type { CivilStatus, MarriagePartyRole } from "@/features/parish-admin/records/types";
import type { Parish } from "@/types";

interface ConsentFormState {
  lastName: string;
  firstName: string;
  middleInitial: string;
  relation: string;
  residence: string;
}

interface PartyFormState {
  lastName: string;
  firstName: string;
  middleName: string;
  dateOfBirth: string;
  birthplace: string;
  sex: string;
  citizenship: string;
  address: string;
  religion: string;
  civilStatus: CivilStatus | "";
  baptismalRecordId: string;
  fatherLastName: string;
  fatherFirstName: string;
  fatherMiddleInitial: string;
  fatherCitizenship: string;
  motherLastName: string;
  motherFirstName: string;
  motherMiddleInitial: string;
  motherCitizenship: string;
  consentPersons: ConsentFormState[];
}

interface FormState {
  placeOfMarriage: string;
  marriageAddress: string;
  dateOfMarriage: string;
  timeOfMarriage: string;
  witnessOne: string;
  witnessTwo: string;
  bookNumber: string;
  pageNumber: string;
  entryNumber: string;
  remarks: string;
  groom: PartyFormState;
  bride: PartyFormState;
}

const emptyConsent = (): ConsentFormState => ({
  lastName: "",
  firstName: "",
  middleInitial: "",
  relation: "",
  residence: "",
});

const emptyParty = (): PartyFormState => ({
  lastName: "",
  firstName: "",
  middleName: "",
  dateOfBirth: "",
  birthplace: "",
  sex: "",
  citizenship: "Filipino",
  address: "",
  religion: "Roman Catholic",
  civilStatus: "Single",
  baptismalRecordId: "",
  fatherLastName: "",
  fatherFirstName: "",
  fatherMiddleInitial: "",
  fatherCitizenship: "",
  motherLastName: "",
  motherFirstName: "",
  motherMiddleInitial: "",
  motherCitizenship: "",
  consentPersons: [],
});

const emptyForm = (placeOfMarriage = ""): FormState => ({
  placeOfMarriage,
  marriageAddress: "",
  dateOfMarriage: "",
  timeOfMarriage: "",
  witnessOne: "",
  witnessTwo: "",
  bookNumber: "",
  pageNumber: "",
  entryNumber: "",
  remarks: "",
  groom: emptyParty(),
  bride: emptyParty(),
});

const textareaClass =
  "min-h-[80px] w-full resize-y rounded-[7px] border border-admin-border-strong bg-white px-[11px] py-[9px] text-admin-body leading-relaxed text-admin-ink focus:border-admin-green-600 focus:outline-none focus:ring-2 focus:ring-admin-green-600/25";

const selectClass =
  "w-full rounded-[7px] border border-admin-border-strong bg-white px-[11px] py-[9px] text-admin-body text-admin-ink focus:border-admin-green-600 focus:outline-none focus:ring-2 focus:ring-admin-green-600/25";

function partyToForm(party: ReturnType<typeof getMarriageParty>): PartyFormState {
  if (!party) return emptyParty();
  return {
    lastName: party.lastName,
    firstName: party.firstName,
    middleName: party.middleName ?? "",
    dateOfBirth: party.dateOfBirth,
    birthplace: party.birthplace ?? "",
    sex: party.sex ?? "",
    citizenship: party.citizenship ?? "",
    address: party.address ?? "",
    religion: party.religion ?? "",
    civilStatus: party.civilStatus ?? "",
    baptismalRecordId: party.baptismalRecordId ?? "",
    fatherLastName: party.fatherLastName ?? "",
    fatherFirstName: party.fatherFirstName ?? "",
    fatherMiddleInitial: party.fatherMiddleInitial ?? "",
    fatherCitizenship: party.fatherCitizenship ?? "",
    motherLastName: party.motherLastName ?? "",
    motherFirstName: party.motherFirstName ?? "",
    motherMiddleInitial: party.motherMiddleInitial ?? "",
    motherCitizenship: party.motherCitizenship ?? "",
    consentPersons: party.consentPersons.map((c) => ({
      lastName: c.lastName ?? "",
      firstName: c.firstName ?? "",
      middleInitial: c.middleInitial ?? "",
      relation: c.relation ?? "",
      residence: c.residence ?? "",
    })),
  };
}

function partyFromForm(role: MarriagePartyRole, party: PartyFormState): MarriagePartyInput {
  return {
    role,
    lastName: party.lastName,
    firstName: party.firstName,
    middleName: party.middleName || undefined,
    dateOfBirth: party.dateOfBirth,
    birthplace: party.birthplace || undefined,
    sex: party.sex || undefined,
    citizenship: party.citizenship || undefined,
    address: party.address || undefined,
    religion: party.religion || undefined,
    civilStatus: party.civilStatus || undefined,
    baptismalRecordId: party.baptismalRecordId || undefined,
    fatherLastName: party.fatherLastName || undefined,
    fatherFirstName: party.fatherFirstName || undefined,
    fatherMiddleInitial: party.fatherMiddleInitial || undefined,
    fatherCitizenship: party.fatherCitizenship || undefined,
    motherLastName: party.motherLastName || undefined,
    motherFirstName: party.motherFirstName || undefined,
    motherMiddleInitial: party.motherMiddleInitial || undefined,
    motherCitizenship: party.motherCitizenship || undefined,
    consentPersons: party.consentPersons
      .filter((c) => c.firstName || c.lastName)
      .map((c) => ({
        lastName: c.lastName || undefined,
        firstName: c.firstName || undefined,
        middleInitial: c.middleInitial || undefined,
        relation: c.relation || undefined,
        residence: c.residence || undefined,
      })),
  };
}

export function AdminMarriageRecordFormPage({ mode }: { mode: "create" | "edit" }) {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const { recordId = "" } = useParams();
  const navigate = useNavigate();
  const id = decodeURIComponent(recordId);

  const { data: existing, loading: existingLoading } = useAsync(
    () => (mode === "edit" ? getMarriageRecord(parish.id, id) : Promise.resolve(undefined)),
    [parish.id, id, mode]
  );

  const [form, setForm] = useState<FormState>(() => emptyForm(parish.name));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setForm({
      placeOfMarriage: existing.placeOfMarriage,
      marriageAddress: existing.marriageAddress ?? "",
      dateOfMarriage: existing.dateOfMarriage,
      timeOfMarriage: existing.timeOfMarriage ?? "",
      witnessOne: existing.witnessOne,
      witnessTwo: existing.witnessTwo,
      bookNumber: existing.bookNumber,
      pageNumber: existing.pageNumber,
      entryNumber: existing.entryNumber,
      remarks: existing.remarks ?? "",
      groom: partyToForm(getMarriageParty(existing, "Groom")),
      bride: partyToForm(getMarriageParty(existing, "Bride")),
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

  function setMarriageField<K extends keyof Omit<FormState, "groom" | "bride">>(
    key: K,
    value: FormState[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setPartyField(partyKey: "groom" | "bride", key: keyof PartyFormState, value: unknown) {
    setForm((prev) => ({
      ...prev,
      [partyKey]: { ...prev[partyKey], [key]: value },
    }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const input = {
      placeOfMarriage: form.placeOfMarriage,
      marriageAddress: form.marriageAddress || undefined,
      dateOfMarriage: form.dateOfMarriage,
      timeOfMarriage: form.timeOfMarriage || undefined,
      witnessOne: form.witnessOne,
      witnessTwo: form.witnessTwo,
      bookNumber: form.bookNumber,
      pageNumber: form.pageNumber,
      entryNumber: form.entryNumber,
      remarks: form.remarks || undefined,
      parties: [partyFromForm("Groom", form.groom), partyFromForm("Bride", form.bride)],
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
    <AdminFormPage>
      <BackLink />

      <div className="mb-5">
        <h1 className="mb-1 text-admin-page font-semibold text-admin-ink">
          {mode === "edit" ? "Edit" : "Add"} Marriage Record
        </h1>
        <p className="text-admin-body text-admin-ink-muted">
          Enter details exactly as they appear in the parish marriage register.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <AdminFormSection
          tone="gold"
          icon={<HeartIcon className="h-4.5 w-4.5" />}
          title="Marriage details"
          description="Where and when the marriage took place."
        >
          <AdminField label="Place of marriage">
            <AdminInput
              value={form.placeOfMarriage}
              onChange={(e) => setMarriageField("placeOfMarriage", e.target.value)}
              required
            />
          </AdminField>
          <AdminField label="Marriage address">
            <AdminInput
              placeholder="Street address, if recorded separately"
              value={form.marriageAddress}
              onChange={(e) => setMarriageField("marriageAddress", e.target.value)}
            />
          </AdminField>
          <AdminFieldGroup title="Date & time" className="mb-0">
            <AdminField label="Date of marriage" className="mb-0 w-[160px]">
              <AdminInput
                type="date"
                value={form.dateOfMarriage}
                onChange={(e) => setMarriageField("dateOfMarriage", e.target.value)}
                required
              />
            </AdminField>
            <AdminField label="Time" className="mb-0 w-[130px]">
              <AdminInput
                type="time"
                value={form.timeOfMarriage}
                onChange={(e) => setMarriageField("timeOfMarriage", e.target.value)}
              />
            </AdminField>
          </AdminFieldGroup>
        </AdminFormSection>

        <AdminFormSection
          tone="green"
          icon={<BookIcon className="h-4.5 w-4.5" />}
          title="Register & witnesses"
          description="Book/page/entry reference and the two required witnesses."
        >
          <AdminFieldGroup title="Register reference">
            <AdminField label="Book no." className="mb-0">
              <AdminInput
                value={form.bookNumber}
                onChange={(e) => setMarriageField("bookNumber", e.target.value)}
                className="max-w-[72px]"
                required
              />
            </AdminField>
            <AdminField label="Page no." className="mb-0">
              <AdminInput
                value={form.pageNumber}
                onChange={(e) => setMarriageField("pageNumber", e.target.value)}
                className="max-w-[72px]"
                required
              />
            </AdminField>
            <AdminField label="Entry no." className="mb-0">
              <AdminInput
                value={form.entryNumber}
                onChange={(e) => setMarriageField("entryNumber", e.target.value)}
                className="max-w-[72px]"
                required
              />
            </AdminField>
          </AdminFieldGroup>

          <AdminFieldGroup title="Witnesses" className="mb-0">
            <AdminField label="Witness one" className="mb-0 flex-1">
              <AdminInput
                value={form.witnessOne}
                onChange={(e) => setMarriageField("witnessOne", e.target.value)}
                required
              />
            </AdminField>
            <AdminField label="Witness two" className="mb-0 flex-1">
              <AdminInput
                value={form.witnessTwo}
                onChange={(e) => setMarriageField("witnessTwo", e.target.value)}
                required
              />
            </AdminField>
          </AdminFieldGroup>
        </AdminFormSection>

        <PartyFormSection
          title="Groom"
          tone="blue"
          party={form.groom}
          onChange={(key, value) => setPartyField("groom", key, value)}
        />
        <PartyFormSection
          title="Bride"
          tone="rose"
          party={form.bride}
          onChange={(key, value) => setPartyField("bride", key, value)}
        />

        <AdminFormSection tone="neutral" icon={<NoteIcon className="h-4.5 w-4.5" />} title="Remarks" className="mb-0">
          <textarea
            value={form.remarks}
            onChange={(e) => setMarriageField("remarks", e.target.value)}
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
    </AdminFormPage>
  );
}

function PartyFormSection({
  title,
  tone,
  party,
  onChange,
}: {
  title: string;
  tone: AdminSectionTone;
  party: PartyFormState;
  onChange: (key: keyof PartyFormState, value: unknown) => void;
}) {
  function addConsent() {
    onChange("consentPersons", [...party.consentPersons, emptyConsent()]);
  }

  function updateConsent(index: number, key: keyof ConsentFormState, value: string) {
    const next = party.consentPersons.map((c, i) => (i === index ? { ...c, [key]: value } : c));
    onChange("consentPersons", next);
  }

  function removeConsent(index: number) {
    onChange(
      "consentPersons",
      party.consentPersons.filter((_, i) => i !== index)
    );
  }

  return (
    <AdminFormSection tone={tone} icon={<UserIcon className="h-4.5 w-4.5" />} title={title}>
      <AdminFieldGroup title="Full name">
        <AdminField label="First" className="mb-0 w-[120px]">
          <AdminInput value={party.firstName} onChange={(e) => onChange("firstName", e.target.value)} required />
        </AdminField>
        <AdminField label="Middle" className="mb-0 w-[110px]">
          <AdminInput value={party.middleName} onChange={(e) => onChange("middleName", e.target.value)} />
        </AdminField>
        <AdminField label="Last" className="mb-0 w-[130px]">
          <AdminInput value={party.lastName} onChange={(e) => onChange("lastName", e.target.value)} required />
        </AdminField>
      </AdminFieldGroup>

      <AdminFieldGroup title="Birth details">
        <AdminField label="Date of birth" className="mb-0 w-[150px]">
          <AdminInput
            type="date"
            value={party.dateOfBirth}
            onChange={(e) => onChange("dateOfBirth", e.target.value)}
            required
          />
        </AdminField>
        <AdminField label="Sex" className="mb-0 w-[110px]">
          <select className={selectClass} value={party.sex} onChange={(e) => onChange("sex", e.target.value)}>
            <option value="">—</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </AdminField>
        <AdminField label="Birthplace" className="mb-0 flex-1">
          <AdminInput value={party.birthplace} onChange={(e) => onChange("birthplace", e.target.value)} />
        </AdminField>
      </AdminFieldGroup>

      <AdminField label="Citizenship">
        <AdminInput value={party.citizenship} onChange={(e) => onChange("citizenship", e.target.value)} />
      </AdminField>
      <AdminField label="Address">
        <AdminInput value={party.address} onChange={(e) => onChange("address", e.target.value)} />
      </AdminField>
      <AdminField label="Religion">
        <AdminInput value={party.religion} onChange={(e) => onChange("religion", e.target.value)} />
      </AdminField>
      <AdminField label="Civil status">
        <select
          className={selectClass}
          value={party.civilStatus}
          onChange={(e) => onChange("civilStatus", e.target.value)}
        >
          <option value="">—</option>
          <option value="Single">Single</option>
          <option value="Widowed">Widowed</option>
          <option value="Divorced">Divorced</option>
          <option value="Annulled">Annulled</option>
        </select>
      </AdminField>
      <AdminField label="Baptismal record ID (optional)" className="mb-0">
        <AdminInput
          placeholder="e.g. bap-002"
          value={party.baptismalRecordId}
          onChange={(e) => onChange("baptismalRecordId", e.target.value)}
        />
      </AdminField>

      <AdminFieldGroup title="Father" className="mt-4">
        <AdminField label="First" className="mb-0 w-[120px]">
          <AdminInput value={party.fatherFirstName} onChange={(e) => onChange("fatherFirstName", e.target.value)} />
        </AdminField>
        <AdminField label="M.I." className="mb-0 w-[60px]">
          <AdminInput
            value={party.fatherMiddleInitial}
            onChange={(e) => onChange("fatherMiddleInitial", e.target.value)}
            maxLength={5}
          />
        </AdminField>
        <AdminField label="Last" className="mb-0 w-[130px]">
          <AdminInput value={party.fatherLastName} onChange={(e) => onChange("fatherLastName", e.target.value)} />
        </AdminField>
      </AdminFieldGroup>

      <AdminFieldGroup title="Mother" className="mb-0">
        <AdminField label="First" className="mb-0 w-[120px]">
          <AdminInput value={party.motherFirstName} onChange={(e) => onChange("motherFirstName", e.target.value)} />
        </AdminField>
        <AdminField label="M.I." className="mb-0 w-[60px]">
          <AdminInput
            value={party.motherMiddleInitial}
            onChange={(e) => onChange("motherMiddleInitial", e.target.value)}
            maxLength={5}
          />
        </AdminField>
        <AdminField label="Last" className="mb-0 w-[130px]">
          <AdminInput value={party.motherLastName} onChange={(e) => onChange("motherLastName", e.target.value)} />
        </AdminField>
      </AdminFieldGroup>

      <div className="mt-4 border-t border-dashed border-admin-border pt-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-admin-label font-bold uppercase tracking-admin-label text-admin-gold-700">
            Consent persons
          </p>
          <AdminButton variant="secondary" size="sm" type="button" onClick={addConsent}>
            Add consent
          </AdminButton>
        </div>
        {party.consentPersons.length === 0 ? (
          <p className="text-admin-label text-admin-ink-faint">None recorded.</p>
        ) : (
          party.consentPersons.map((c, i) => (
            <div key={i} className="mb-3 rounded-[8px] border border-admin-border bg-admin-surface-alt p-3">
              <div className="mb-2 flex flex-wrap gap-2">
                <AdminField label="First" className="mb-0 w-[100px]">
                  <AdminInput
                    value={c.firstName}
                    onChange={(e) => updateConsent(i, "firstName", e.target.value)}
                  />
                </AdminField>
                <AdminField label="M.I." className="mb-0 w-[50px]">
                  <AdminInput
                    value={c.middleInitial}
                    onChange={(e) => updateConsent(i, "middleInitial", e.target.value)}
                    maxLength={5}
                  />
                </AdminField>
                <AdminField label="Last" className="mb-0 w-[110px]">
                  <AdminInput value={c.lastName} onChange={(e) => updateConsent(i, "lastName", e.target.value)} />
                </AdminField>
              </div>
              <AdminField label="Relation" className="mb-2">
                <AdminInput value={c.relation} onChange={(e) => updateConsent(i, "relation", e.target.value)} />
              </AdminField>
              <AdminField label="Residence" className="mb-2">
                <AdminInput value={c.residence} onChange={(e) => updateConsent(i, "residence", e.target.value)} />
              </AdminField>
              <AdminButton variant="ghost" size="sm" type="button" onClick={() => removeConsent(i)}>
                Remove
              </AdminButton>
            </div>
          ))
        )}
      </div>
    </AdminFormSection>
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
