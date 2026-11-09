export type MarriageApplicationStatus =
  | "pending"
  | "checking_requirements"
  | "approved"
  | "rejected"
  | "completed";

export type DispensationStatus = "none" | "pending" | "granted" | "denied";

export type WeddingDateStatus = "none" | "reserved" | "confirmed";

/** The couple's yes/no answers (item 5a). Mirrors server/src/constants/marriageRequirements.js. */
export const CIRCUMSTANCES = [
  { key: "widowed", question: "Was either party widowed?" },
  { key: "previously_married", question: "Was either party married before (annulled or declared null)?" },
  { key: "mixed_religion", question: "Is one party not Catholic?" },
  { key: "foreign_party", question: "Is one party a foreign national?" },
  { key: "cohabiting_5yrs", question: "Have they lived together as husband and wife for 5 years or more?" },
  { key: "outside_home_parish", question: "Is the wedding outside their home parish?" },
] as const;

export type CircumstanceKey = (typeof CIRCUMSTANCES)[number]["key"];

export type Circumstances = Record<CircumstanceKey, boolean>;

export interface MarriageRequirement {
  id: string;
  typeId: string;
  /** Built-in items keep this key when renamed, e.g. "cenomar_bride". Null for the parish's own items. */
  key: string | null;
  name: string;
  /** A short note for the couple. */
  note: string;
  /** "always", or the answer that adds it. */
  condition: string;
  required: boolean;
  /** Documents that expire: how long they are accepted. */
  validForDays: number | null;
  submitted: boolean;
  /** The date printed on the document (ISO). */
  documentDate: string | null;
  /** Last day it is accepted (ISO). */
  expiresOn: string | null;
  expired: boolean;
  /** Still good today, but not on the wedding day. */
  expiresBeforeWedding: boolean;
  verifiedBy: string | null;
  verifiedAt: string | null;
  /** Name of the staff member who marked it received. */
  verifiedByName?: string | null;
}

export interface MarriageWeddingEvent {
  id: string;
  date: string;
  start: string;
  end: string;
  title: string;
  assignee: string;
}

export interface MarriageApplication {
  id: string;
  /** Short reference people read and search for, e.g. MA-2026-00003. */
  referenceNo: string;
  parishId: string;
  parishionerId: string | null;
  groomFirstName: string;
  groomMiddleName: string;
  groomLastName: string;
  brideFirstName: string;
  brideMiddleName: string;
  brideLastName: string;
  groomName: string;
  brideName: string;
  status: MarriageApplicationStatus;
  remarks: string;
  dispensationNeeded: boolean;
  dispensationStatus: DispensationStatus;
  dispensationNotes: string;
  preferredWeddingDate: string;
  preferredWeddingStart: string;
  preferredWeddingEnd: string;
  weddingEventId: string | null;
  weddingDateStatus: WeddingDateStatus;
  weddingEvent: MarriageWeddingEvent | null;
  circumstances: Circumstances;
  requirements: MarriageRequirement[];
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateMarriageApplicationInput {
  groomFirstName: string;
  groomMiddleName?: string;
  groomLastName: string;
  brideFirstName: string;
  brideMiddleName?: string;
  brideLastName: string;
  parishionerEmail?: string;
  remarks?: string;
  dispensationNeeded?: boolean;
  dispensationNotes?: string;
}
