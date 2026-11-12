import { CandleIcon, DoveIcon, DropletIcon, HeartIcon } from "@/components/ui/icons/SacramentIcons";
import type { CurrentUser, DeliveryMethod, SacramentType } from "@/types";
import type { RequestFormState } from "@/features/parishioner/requests/types";
import { PURPOSES as SHARED_PURPOSES } from "@/lib/purposes";

/** The request as the parishioner fills it in; nothing is chosen for them up front. */
export interface RequestDraft {
  sacramentType: SacramentType | null;
  forWhom: "me" | "other" | null;
  relationship: string;
  sacramentDate: string;
  fields: Record<string, string>;
  documents: string[];
  purposeChoice: string;
  purposeOther: string;
  deliveryMethod: DeliveryMethod | null;
}

export const EMPTY_DRAFT: RequestDraft = {
  sacramentType: null,
  forWhom: null,
  relationship: "",
  sacramentDate: "",
  fields: {},
  documents: [],
  purposeChoice: "",
  purposeOther: "",
  deliveryMethod: null,
};

export type StepId = 1 | 2 | 3 | 4 | 5;

/** One thing per step, ending with a check of every answer before anything is sent. */
export const STEPS: { id: StepId; label: string; title: string; hint: string }[] = [
  {
    id: 1,
    label: "Certificate",
    title: "Which certificate do you need?",
    hint: "Choose the sacrament on the record. You can request another certificate afterwards.",
  },
  {
    id: 2,
    label: "Whose record",
    title: "Who is this certificate for?",
    hint: "The parish office asks so it knows who is requesting the record.",
  },
  {
    id: 3,
    label: "Record details",
    title: "Tell us about the record",
    hint: "Write names as they would appear in the parish register. The more you give, the faster staff can find it.",
  },
  {
    id: 4,
    label: "Purpose & delivery",
    title: "How will you use the certificate?",
    hint: "Choose why you need it and how you'd like to receive it.",
  },
  {
    id: 5,
    label: "Review",
    title: "Check your answers",
    hint: "Make sure everything is right before you send the request. You can change any answer.",
  },
];

export const SACRAMENT_OPTIONS: { type: SacramentType; label: string; description: string; Icon: typeof DropletIcon }[] = [
  { type: "baptism", label: "Baptism", description: "For school, First Communion, Confirmation or marriage", Icon: DropletIcon },
  { type: "confirmation", label: "Confirmation", description: "Often asked for before marriage or to be a sponsor", Icon: DoveIcon },
  { type: "marriage", label: "Marriage", description: "For civil records, travel or church proceedings", Icon: HeartIcon },
  { type: "death", label: "Death", description: "For burial records, estates or insurance", Icon: CandleIcon },
];

export const RELATIONSHIPS = ["Parent", "Child", "Spouse", "Sibling", "Grandchild", "Legal guardian", "Other relative", "Other"];

/** The shared list (lib/purposes.ts) plus "Other", which asks for a typed purpose. */
export const PURPOSES = [...SHARED_PURPOSES, "Other"];

export const DELIVERY_OPTIONS: { key: DeliveryMethod; label: string; description: string }[] = [
  { key: "digital", label: "Digital copy", description: "Sent to your Certificate Wallet once the parish releases it" },
  { key: "pickup", label: "Pick up at the office", description: "Printed and sealed by the parish. Bring a valid ID." },
];

export interface FieldConfig {
  key: string;
  label: string;
  type?: "text" | "date";
  optional?: boolean;
  hint?: string;
  autoComplete?: string;
}

export interface FieldGroup {
  title: string;
  /** Optional groups start folded away, since they only help staff find the record. */
  optional?: boolean;
  hint?: string;
  /** Who the fields describe, added to their labels on the review page, e.g. "First name (groom)". */
  reviewAs?: string;
  rows: FieldConfig[][];
}

/** The sacrament's own date is stored apart from the other fields; this key routes it there. */
export const SACRAMENT_DATE_KEY = "sacramentDate";

const DATE_HINT = "Leave it blank if you don't know it. A guess is fine too.";

const nameRow = (who = ""): FieldConfig[] => [
  { key: "firstName", label: `${who}First name`, autoComplete: "given-name" },
  { key: "middleName", label: "Middle name", optional: true, autoComplete: "additional-name" },
  { key: "lastName", label: "Last name", autoComplete: "family-name" },
];

export const RECORD_GROUPS: Record<SacramentType, FieldGroup[]> = {
  baptism: [
    {
      title: "The person baptized",
      reviewAs: "person baptized",
      rows: [nameRow(), [{ key: "birthdate", label: "Date of birth", type: "date" }, { key: "birthplace", label: "Place of birth" }]],
    },
    {
      title: "The baptism",
      rows: [
        [{ key: SACRAMENT_DATE_KEY, label: "Date of baptism", type: "date", hint: DATE_HINT, optional: true }],
        [
          { key: "parishOfBaptism", label: "Chapel, if not the parish church", optional: true },
          { key: "addressAtTime", label: "Family address at the time", optional: true },
        ],
      ],
    },
    {
      title: "Parents and godparents",
      optional: true,
      hint: "Helps staff find the right entry, especially for common names.",
      rows: [
        [{ key: "mothersName", label: "Mother's full name", optional: true }, { key: "fathersName", label: "Father's full name", optional: true }],
        [{ key: "godmothersName", label: "Godmother", optional: true }, { key: "godfathersName", label: "Godfather", optional: true }],
      ],
    },
  ],
  confirmation: [
    {
      title: "The person confirmed",
      reviewAs: "person confirmed",
      rows: [nameRow(), [{ key: "birthdate", label: "Date of birth", type: "date" }, { key: "birthplace", label: "Place of birth", optional: true }]],
    },
    {
      title: "The confirmation",
      rows: [
        [
          { key: SACRAMENT_DATE_KEY, label: "Date of confirmation", type: "date", hint: DATE_HINT, optional: true },
          { key: "parishOfConfirmation", label: "Chapel, if not the parish church", optional: true },
        ],
      ],
    },
    {
      title: "Sponsor",
      optional: true,
      hint: "Helps staff find the right entry.",
      rows: [[{ key: "sponsorName", label: "Sponsor's full name", optional: true }]],
    },
  ],
  marriage: [
    {
      title: "The groom",
      reviewAs: "groom",
      rows: [
        [
          { key: "groomFirstName", label: "First name" },
          { key: "groomMiddleName", label: "Middle name", optional: true },
          { key: "groomLastName", label: "Last name" },
        ],
      ],
    },
    {
      title: "The bride",
      reviewAs: "bride",
      rows: [
        [
          { key: "brideFirstName", label: "First name" },
          { key: "brideMiddleName", label: "Middle name", optional: true },
          { key: "brideMaidenLastName", label: "Maiden last name" },
        ],
      ],
    },
    {
      title: "The wedding",
      rows: [
        [{ key: SACRAMENT_DATE_KEY, label: "Date of the wedding", type: "date", hint: DATE_HINT, optional: true }],
        [
          { key: "parishOfMarriage", label: "Chapel, if not the parish church", optional: true },
          { key: "placeOfMarriage", label: "Town or city", optional: true },
        ],
      ],
    },
    {
      title: "Witnesses",
      optional: true,
      hint: "Helps staff find the right entry.",
      rows: [[{ key: "witness1", label: "First witness", optional: true }, { key: "witness2", label: "Second witness", optional: true }]],
    },
  ],
  death: [
    {
      title: "The person who died",
      reviewAs: "person who died",
      rows: [
        nameRow(),
        [{ key: "dateOfBirth", label: "Date of birth", type: "date", optional: true }, { key: "placeOfDeath", label: "Place of death", optional: true }],
      ],
    },
    {
      title: "The death and funeral",
      rows: [
        [
          { key: SACRAMENT_DATE_KEY, label: "Date of death", type: "date", hint: DATE_HINT, optional: true },
          { key: "parish", label: "Chapel of the funeral, if not the parish church", optional: true },
        ],
        [{ key: "nextOfKin", label: "Next of kin", optional: true }],
      ],
    },
  ],
};

export function sacramentLabel(type: SacramentType) {
  return SACRAMENT_OPTIONS.find((option) => option.type === type)?.label ?? type;
}

/** "2026-06-27" → "June 27, 2026", read as a calendar date so no time zone moves it a day. */
export function formatDay(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function todayStamp() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Every field value, the sacrament's date included, keyed as in RECORD_GROUPS. */
export function recordValues(draft: RequestDraft): Record<string, string> {
  return { ...draft.fields, [SACRAMENT_DATE_KEY]: draft.sacramentDate };
}

/** What's missing or wrong on a step, by field key. An empty object means the step is done. */
export function stepErrors(step: StepId, draft: RequestDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  if (step === 1 && !draft.sacramentType) errors.sacramentType = "Choose the certificate you need.";
  if (step === 2) {
    if (draft.sacramentType !== "death" && !draft.forWhom) errors.forWhom = "Choose who the certificate is for.";
    if ((draft.forWhom === "other" || draft.sacramentType === "death") && !draft.relationship) {
      errors.relationship = "Choose how you are related to them.";
    }
  }
  if (step === 3 && draft.sacramentType) {
    const values = recordValues(draft);
    const today = todayStamp();
    for (const group of RECORD_GROUPS[draft.sacramentType]) {
      for (const field of group.rows.flat()) {
        const value = (values[field.key] ?? "").trim();
        if (!value && !field.optional) {
          errors[field.key] = `Enter the ${field.label.toLowerCase()}.`;
        } else if (value && field.type === "date" && value > today) {
          errors[field.key] = "This date can't be in the future.";
        }
      }
    }
  }
  if (step === 4) {
    if (!draft.purposeChoice) errors.purpose = "Choose why you need the certificate.";
    else if (draft.purposeChoice === "Other" && !draft.purposeOther.trim()) errors.purposeOther = "Tell us what the certificate is for.";
    if (!draft.deliveryMethod) errors.deliveryMethod = "Choose how you'd like to receive it.";
  }
  return errors;
}

/** "Myself": the parishioner's own name and birthday, where the record has a place for them. */
export function prefillFromAccount(type: SacramentType, user: CurrentUser | null): Record<string, string> {
  if (!user) return {};
  const first = user.firstName ?? user.fullName.split(/\s+/)[0] ?? "";
  const last = user.lastName ?? (user.fullName.split(/\s+/).length > 1 ? user.fullName.split(/\s+/).slice(-1)[0] : "");
  const middle = user.middleName ?? "";
  if (type === "baptism" || type === "confirmation") {
    return { firstName: first, middleName: middle, lastName: last, birthdate: user.birthday?.slice(0, 10) ?? "" };
  }
  if (type === "marriage") {
    const gender = (user.gender ?? "").toLowerCase();
    if (gender.startsWith("m")) return { groomFirstName: first, groomMiddleName: middle, groomLastName: last };
    if (gender.startsWith("f")) return { brideFirstName: first, brideMiddleName: middle };
  }
  return {};
}

/** The draft as the API takes it, with blank fields left out. */
export function toRequestForm(draft: RequestDraft): RequestFormState {
  const fields = Object.fromEntries(
    Object.entries(draft.fields)
      .map(([key, value]) => [key, value.trim()] as const)
      .filter(([, value]) => value)
  );
  return {
    sacramentType: draft.sacramentType ?? "baptism",
    deliveryMethod: draft.deliveryMethod ?? "digital",
    purpose: draft.purposeChoice === "Other" ? draft.purposeOther.trim() : draft.purposeChoice,
    relationship: draft.forWhom === "me" ? "Myself" : draft.relationship,
    sacramentDate: draft.sacramentDate,
    fields,
    documents: draft.documents,
  };
}
