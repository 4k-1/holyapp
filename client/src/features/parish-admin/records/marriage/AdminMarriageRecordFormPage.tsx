import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate, useOutletContext, useParams } from "react-router-dom";
import {
  AdminButton,
  AdminField,
  AdminFormPage,
  AdminInput,
  AdminSelect,
  AdminTextarea,
} from "@/features/parish-admin/components/AdminForm";
import { RecordFormShell, RecordSection } from "@/features/parish-admin/records/RecordFormShell";
import { span } from "@/features/parish-admin/records/recordFormSpan";
import {
  createMarriageRecord,
  getMarriageRecord,
  updateMarriageRecord,
  type MarriagePartyInput,
} from "@/features/parish-admin/records/api/marriageRecordsApi";
import { BaptismalRecordLinkField } from "@/features/parish-admin/records/BaptismalRecordLinkField";
import { getMarriageParty } from "@/features/parish-admin/records/marriageHelpers";
import { schedulePrefillOf } from "@/features/parish-admin/records/scheduleLink";
import { ScheduleLinkNotice } from "@/features/parish-admin/records/ScheduleLinkNotice";
import { getMarriageApplication } from "@/features/parish-admin/marriage-applications/api/marriageApplicationsApi";
import { useAsync } from "@/hooks/useAsync";
import type { BaptismalRecord, CivilStatus, MarriagePartyRole } from "@/features/parish-admin/records/types";
import type { Parish } from "@/types";
import { PAGE_TITLE_CLASS } from "@/features/parish-admin/components/adminPageStyles";
import { AdminBackLink } from "@/features/parish-admin/components/AdminBackLink";

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
  minister: string;
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
  minister: "",
  witnessOne: "",
  witnessTwo: "",
  bookNumber: "",
  pageNumber: "",
  entryNumber: "",
  remarks: "",
  groom: emptyParty(),
  bride: emptyParty(),
});

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
  const location = useLocation();
  const id = decodeURIComponent(recordId);
  // Opened from a wedding on the schedule (C11).
  const prefill = mode === "create" ? schedulePrefillOf(location.state) : null;

  const { data: existing, loading: existingLoading } = useAsync(
    () => (mode === "edit" ? getMarriageRecord(parish.id, id) : Promise.resolve(undefined)),
    [parish.id, id, mode]
  );

  const [form, setForm] = useState<FormState>(() =>
    prefill
      ? {
          ...emptyForm(parish.name),
          dateOfMarriage: prefill.date ?? "",
          timeOfMarriage: prefill.time ?? "",
          minister: prefill.priest ?? "",
        }
      : emptyForm(parish.name)
  );

  // A wedding booked through a marriage application brings the couple's names.
  const applicationId = prefill?.marriageApplicationId ?? null;
  useEffect(() => {
    if (!applicationId) return;
    let live = true;
    getMarriageApplication(applicationId)
      .then((app) => {
        if (!live) return;
        setForm((prev) => ({
          ...prev,
          groom: {
            ...prev.groom,
            firstName: prev.groom.firstName || app.groomFirstName,
            middleName: prev.groom.middleName || app.groomMiddleName,
            lastName: prev.groom.lastName || app.groomLastName,
          },
          bride: {
            ...prev.bride,
            firstName: prev.bride.firstName || app.brideFirstName,
            middleName: prev.bride.middleName || app.brideMiddleName,
            lastName: prev.bride.lastName || app.brideLastName,
          },
        }));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [applicationId]);
  const [submitting, setSubmitting] = useState(false);

  // Fill the form once the record being edited has loaded.
  const [loadedRecord, setLoadedRecord] = useState<typeof existing>(undefined);
  if (existing && existing !== loadedRecord) {
    setLoadedRecord(existing);
    setForm({
      placeOfMarriage: existing.placeOfMarriage,
      marriageAddress: existing.marriageAddress ?? "",
      dateOfMarriage: existing.dateOfMarriage,
      timeOfMarriage: existing.timeOfMarriage ?? "",
      minister: existing.minister,
      witnessOne: existing.witnessOne,
      witnessTwo: existing.witnessTwo,
      bookNumber: existing.bookNumber,
      pageNumber: existing.pageNumber,
      entryNumber: existing.entryNumber,
      remarks: existing.remarks ?? "",
      groom: partyToForm(getMarriageParty(existing, "Groom")),
      bride: partyToForm(getMarriageParty(existing, "Bride")),
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

  function applyPartyBaptismalLink(
    partyKey: "groom" | "bride",
    recordId: string,
    rec: BaptismalRecord | null
  ) {
    setForm((prev) => {
      const party = prev[partyKey];
      return {
        ...prev,
        [partyKey]: {
          ...party,
          baptismalRecordId: recordId,
          firstName: party.firstName || rec?.firstName || "",
          middleName: party.middleName || rec?.middleName || "",
          lastName: party.lastName || rec?.lastName || "",
          dateOfBirth: party.dateOfBirth || rec?.dateOfBirth || "",
          sex: party.sex || rec?.sex || "",
          address: party.address || rec?.address || "",
          fatherFirstName: party.fatherFirstName || rec?.fatherFirstName || "",
          fatherLastName: party.fatherLastName || rec?.fatherLastName || "",
          motherFirstName: party.motherFirstName || rec?.motherFirstName || "",
          motherLastName: party.motherLastName || rec?.motherLastName || "",
        },
      };
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const input = {
      placeOfMarriage: form.placeOfMarriage,
      marriageAddress: form.marriageAddress || undefined,
      dateOfMarriage: form.dateOfMarriage,
      timeOfMarriage: form.timeOfMarriage || undefined,
      minister: form.minister,
      witnessOne: form.witnessOne,
      witnessTwo: form.witnessTwo,
      bookNumber: form.bookNumber,
      pageNumber: form.pageNumber,
      entryNumber: form.entryNumber,
      remarks: form.remarks || undefined,
      parties: [partyFromForm("Groom", form.groom), partyFromForm("Bride", form.bride)],
      ...(prefill ? { scheduleEventId: prefill.scheduleBlockId } : {}),
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
    <RecordFormShell
      title={`${mode === "edit" ? "Edit" : "Add"} Marriage Record`}
      subtitle="Enter details exactly as they appear in the parish marriage register."
      notice={prefill && <ScheduleLinkNotice prefill={prefill} saved={[]} />}
      submitting={submitting}
      submitLabel={mode === "edit" ? "Save changes" : "Confirm & add record"}
      onSubmit={handleSubmit}
    >
      <RecordSection title="Marriage" note="Date, minister and church.">
        <AdminField label="Date of marriage" className={`mb-0 ${span.third}`}>
          <AdminInput
            type="date"
            value={form.dateOfMarriage}
            onChange={(e) => setMarriageField("dateOfMarriage", e.target.value)}
            required
          />
        </AdminField>
        <AdminField label="Time" className={`mb-0 ${span.third}`}>
          <AdminInput
            type="time"
            value={form.timeOfMarriage}
            onChange={(e) => setMarriageField("timeOfMarriage", e.target.value)}
          />
        </AdminField>
        <AdminField label="Minister" className={`mb-0 ${span.full}`}>
          <AdminInput
            placeholder="Rev. Fr."
            value={form.minister}
            onChange={(e) => setMarriageField("minister", e.target.value)}
            required
          />
        </AdminField>
        <AdminField label="Place of marriage" className={`mb-0 ${span.full}`}>
          <AdminInput
            value={form.placeOfMarriage}
            onChange={(e) => setMarriageField("placeOfMarriage", e.target.value)}
            required
          />
        </AdminField>
        <AdminField label="Marriage address" className={`mb-0 ${span.full}`}>
          <AdminInput
            placeholder="Street address, if recorded separately"
            value={form.marriageAddress}
            onChange={(e) => setMarriageField("marriageAddress", e.target.value)}
          />
        </AdminField>
      </RecordSection>

      <RecordSection title="Register and witnesses" note="Where this entry sits in the book, and the two witnesses.">
        <AdminField label="Book no." className={`mb-0 ${span.sixth}`}>
          <AdminInput
            value={form.bookNumber}
            onChange={(e) => setMarriageField("bookNumber", e.target.value)}
            required
          />
        </AdminField>
        <AdminField label="Page no." className={`mb-0 ${span.sixth}`}>
          <AdminInput
            value={form.pageNumber}
            onChange={(e) => setMarriageField("pageNumber", e.target.value)}
            required
          />
        </AdminField>
        <AdminField label="Entry no." className={`mb-0 ${span.sixth}`}>
          <AdminInput
            value={form.entryNumber}
            onChange={(e) => setMarriageField("entryNumber", e.target.value)}
            required
          />
        </AdminField>
        <AdminField label="First witness" className={`mb-0 ${span.half}`}>
          <AdminInput
            value={form.witnessOne}
            onChange={(e) => setMarriageField("witnessOne", e.target.value)}
            required
          />
        </AdminField>
        <AdminField label="Second witness" className={`mb-0 ${span.half}`}>
          <AdminInput
            value={form.witnessTwo}
            onChange={(e) => setMarriageField("witnessTwo", e.target.value)}
            required
          />
        </AdminField>
      </RecordSection>

      <PartySections
        title="Groom"
        parishId={parish.id}
        party={form.groom}
        onChange={(key, value) => setPartyField("groom", key, value)}
        onBaptismalLink={(recordId, rec) => applyPartyBaptismalLink("groom", recordId, rec)}
      />
      <PartySections
        title="Bride"
        parishId={parish.id}
        party={form.bride}
        onChange={(key, value) => setPartyField("bride", key, value)}
        onBaptismalLink={(recordId, rec) => applyPartyBaptismalLink("bride", recordId, rec)}
      />

      <RecordSection title="Remarks">
        <AdminField label="Remarks" className={`mb-0 ${span.full}`}>
          <AdminTextarea
            className="min-h-[84px]"
            value={form.remarks}
            onChange={(e) => setMarriageField("remarks", e.target.value)}
            placeholder="Additional notes about this entry"
          />
        </AdminField>
      </RecordSection>
    </RecordFormShell>
  );
}

function PartySections({
  title,
  parishId,
  party,
  onChange,
  onBaptismalLink,
}: {
  title: string;
  parishId: string;
  party: PartyFormState;
  onChange: (key: keyof PartyFormState, value: unknown) => void;
  onBaptismalLink: (recordId: string, rec: BaptismalRecord | null) => void;
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

  // First name, middle initial and last name: the narrow middle box lines up with "Middle name" above
  // and the last name reaches the right edge, so the rows stay on the same grid lines.
  return (
    <>
      <PartyBanner role={title === "Bride" ? "Bride" : "Groom"} />
      <RecordSection title={title} note="As written in the register.">
        <AdminField label="First name" className={`mb-0 ${span.third}`}>
          <AdminInput value={party.firstName} onChange={(e) => onChange("firstName", e.target.value)} required />
        </AdminField>
        <AdminField label="Middle name" className={`mb-0 ${span.third}`}>
          <AdminInput value={party.middleName} onChange={(e) => onChange("middleName", e.target.value)} />
        </AdminField>
        <AdminField label="Last name" className={`mb-0 ${span.third}`}>
          <AdminInput value={party.lastName} onChange={(e) => onChange("lastName", e.target.value)} required />
        </AdminField>
        <AdminField label="Date of birth" className={`mb-0 ${span.third}`}>
          <AdminInput
            type="date"
            value={party.dateOfBirth}
            onChange={(e) => onChange("dateOfBirth", e.target.value)}
            required
          />
        </AdminField>
        <AdminField label="Sex" className={`mb-0 ${span.third}`}>
          <AdminSelect value={party.sex} onChange={(e) => onChange("sex", e.target.value)}>
            <option value="">—</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </AdminSelect>
        </AdminField>
        <AdminField label="Civil status" className={`mb-0 ${span.third}`}>
          <AdminSelect value={party.civilStatus} onChange={(e) => onChange("civilStatus", e.target.value)}>
            <option value="">—</option>
            <option value="Single">Single</option>
            <option value="Widowed">Widowed</option>
            <option value="Divorced">Divorced</option>
            <option value="Annulled">Annulled</option>
          </AdminSelect>
        </AdminField>
        <AdminField label="Birthplace" className={`mb-0 ${span.third}`}>
          <AdminInput value={party.birthplace} onChange={(e) => onChange("birthplace", e.target.value)} />
        </AdminField>
        <AdminField label="Citizenship" className={`mb-0 ${span.third}`}>
          <AdminInput value={party.citizenship} onChange={(e) => onChange("citizenship", e.target.value)} />
        </AdminField>
        <AdminField label="Religion" className={`mb-0 ${span.third}`}>
          <AdminInput value={party.religion} onChange={(e) => onChange("religion", e.target.value)} />
        </AdminField>
        <AdminField label="Address" className={`mb-0 ${span.full}`}>
          <AdminInput value={party.address} onChange={(e) => onChange("address", e.target.value)} />
        </AdminField>
        <BaptismalRecordLinkField
          parishId={parishId}
          value={party.baptismalRecordId}
          initialQuery={[party.firstName, party.middleName, party.lastName].filter(Boolean).join(" ")}
          label="Baptismal record (optional)"
          onChange={onBaptismalLink}
          className={span.full}
        />
      </RecordSection>

      <RecordSection title={`${title}'s parents`}>
        <AdminField label="Father's first name" className={`mb-0 ${span.third}`}>
          <AdminInput value={party.fatherFirstName} onChange={(e) => onChange("fatherFirstName", e.target.value)} />
        </AdminField>
        <AdminField label="M.I." className={`mb-0 ${span.sixth}`}>
          <AdminInput
            value={party.fatherMiddleInitial}
            onChange={(e) => onChange("fatherMiddleInitial", e.target.value)}
          />
        </AdminField>
        <AdminField label="Father's last name" className={`mb-0 ${span.half}`}>
          <AdminInput value={party.fatherLastName} onChange={(e) => onChange("fatherLastName", e.target.value)} />
        </AdminField>
        <AdminField label="Mother's first name" className={`mb-0 ${span.third}`}>
          <AdminInput value={party.motherFirstName} onChange={(e) => onChange("motherFirstName", e.target.value)} />
        </AdminField>
        <AdminField label="M.I." className={`mb-0 ${span.sixth}`}>
          <AdminInput
            value={party.motherMiddleInitial}
            onChange={(e) => onChange("motherMiddleInitial", e.target.value)}
          />
        </AdminField>
        <AdminField label="Mother's last name" className={`mb-0 ${span.half}`}>
          <AdminInput value={party.motherLastName} onChange={(e) => onChange("motherLastName", e.target.value)} />
        </AdminField>
      </RecordSection>

      <RecordSection title={`${title}'s consent`} note="Parents or guardians who gave consent, if any.">
        {party.consentPersons.length === 0 && (
          <p className={`${span.full} text-admin-support text-admin-ink-faint`}>None recorded.</p>
        )}
        {party.consentPersons.map((c, i) => (
          <div key={i} className={`${span.full} grid grid-cols-6 gap-x-3 gap-y-5`}>
            <AdminField label="First name" className={`mb-0 ${span.third}`}>
              <AdminInput value={c.firstName} onChange={(e) => updateConsent(i, "firstName", e.target.value)} />
            </AdminField>
            <AdminField label="M.I." className={`mb-0 ${span.sixth}`}>
              <AdminInput
                value={c.middleInitial}
                onChange={(e) => updateConsent(i, "middleInitial", e.target.value)}
              />
            </AdminField>
            <AdminField label="Last name" className={`mb-0 ${span.half}`}>
              <AdminInput value={c.lastName} onChange={(e) => updateConsent(i, "lastName", e.target.value)} />
            </AdminField>
            <AdminField label="Relation" className={`mb-0 ${span.third}`}>
              <AdminInput value={c.relation} onChange={(e) => updateConsent(i, "relation", e.target.value)} />
            </AdminField>
            <AdminField label="Residence" className={`mb-0 ${span.half}`}>
              <AdminInput value={c.residence} onChange={(e) => updateConsent(i, "residence", e.target.value)} />
            </AdminField>
            <div className="col-span-6 flex items-center justify-end @min-[36rem]:col-span-1">
              <AdminButton variant="ghost" size="sm" type="button" onClick={() => removeConsent(i)}>
                Remove
              </AdminButton>
            </div>
          </div>
        ))}
        <div className={span.full}>
          <AdminButton variant="secondary" size="sm" type="button" onClick={addConsent}>
            Add consent person
          </AdminButton>
        </div>
      </RecordSection>
    </>
  );
}

const PARTY_BANNER = {
  Groom: {
    band: "border-[#C9DDF2] bg-[#EAF2FB]",
    badge: "bg-[#D6EAF8] text-[#2F6FA8] ring-[#2F6FA8]/20",
    rule: "bg-[#2F6FA8]",
  },
  Bride: {
    band: "border-[#F1CFDA] bg-[#FBEFF3]",
    badge: "bg-[#F8D6E0] text-[#B85A75] ring-[#B85A75]/20",
    rule: "bg-[#B85A75]",
  },
} as const;

/** Marks where one party's fields begin: same colours as the Groom and Bride cards on the record page. */
function PartyBanner({ role }: { role: "Groom" | "Bride" }) {
  const tone = PARTY_BANNER[role];
  return (
    <div
      className={`relative mb-1 mt-6 flex items-center gap-3 overflow-hidden rounded-xl border py-3 pl-5 pr-4 ${tone.band}`}
      role="presentation"
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${tone.rule}`} aria-hidden="true" />
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-serif text-[0.95rem] font-bold ring-1 ring-inset ${tone.badge}`}
        aria-hidden="true"
      >
        {role === "Groom" ? "G" : "B"}
      </span>
      <div className="min-w-0">
        <p className="font-serif text-admin-group font-semibold leading-tight text-admin-ink">
          {role === "Groom" ? "Groom's information" : "Bride's information"}
        </p>
        <p className="text-admin-support text-admin-ink-muted">Name and birth, parents, and consent</p>
      </div>
    </div>
  );
}

