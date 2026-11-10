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
  assigneeId?: string | null;
  guest?: boolean;
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
  /** A couple marrying in another parish who have their banns announced here (5b). */
  weddingElsewhere: boolean;
  /** Where they marry, for a wedding elsewhere. */
  weddingParish: string;
  banns: BannsPlan;
  /** At least one of them lives here, so the banns are read here. */
  bannsAnnouncedHere: boolean;
  bannsComplete: boolean;
  /** The next three Sundays before the wedding. */
  bannsSuggestedSundays: string[];
}

/** 5b: the banns. An empty parish means that person lives in this parish. */
export interface BannsPlan {
  groomParish: string;
  brideParish: string;
  /** The three Sundays they are announced here (ISO dates). */
  sundays: string[];
  /** Sundays already announced. */
  announced: string[];
  /** Certificate of Banns back from the other parish. */
  received: { groom: boolean; bride: boolean };
  /** The bishop waived the banns. */
  dispensed: boolean;
  /** Optional, printed on the Certificate of Banns and the banns poster. */
  parents: BannsParents;
  /** Barangay and city only, for the banns poster. */
  groomAddress: string;
  brideAddress: string;
  /** The couple agreed to have their banns poster shared online. */
  onlineConsent: boolean;
}

export interface BannsParents {
  groomFather: string;
  groomMother: string;
  brideFather: string;
  brideMother: string;
}

/** A couple on one Sunday's banns list, with the time of asking. */
export interface BannsListCouple extends MarriageApplication {
  asking: number;
  announced: boolean;
}

export interface BannsListResponse {
  date: string;
  parish: BannsParishHeading;
  couples: BannsListCouple[];
  /** Weddings here with no Sundays planned yet. */
  unplanned: MarriageApplication[];
}

/** The parish heading and signatory for printed banns papers. */
export interface BannsParishHeading {
  name: string;
  address: string;
  patron: string;
  diocese: string;
  /** The parish office phone and email, for anyone who knows of an impediment. */
  contact: string;
  email: string;
  signatoryName: string;
  signatoryTitle: string;
}

export interface CreateBannsElsewhereInput {
  groomFirstName: string;
  groomMiddleName?: string;
  groomLastName: string;
  brideFirstName: string;
  brideMiddleName?: string;
  brideLastName: string;
  weddingParish: string;
  weddingDate?: string;
  /** Empty when the groom lives here. */
  groomParish: string;
  /** Empty when the bride lives here. */
  brideParish: string;
  parents?: BannsParents;
  groomAddress?: string;
  brideAddress?: string;
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
