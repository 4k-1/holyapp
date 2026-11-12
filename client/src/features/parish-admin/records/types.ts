export const ANNOTATION_CATEGORIES = ["Confirmation", "Marriage", "Death", "Other"] as const;
export type AnnotationCategory = (typeof ANNOTATION_CATEGORIES)[number];
export type LinkableAnnotationCategory = Exclude<AnnotationCategory, "Other">;
export const LINKABLE_ANNOTATION_CATEGORIES: LinkableAnnotationCategory[] = [
  "Confirmation",
  "Marriage",
  "Death",
];

export type RecordStatus = "Active" | "Archived";

export type IssuedCertificateStatus = "Valid" | "Superseded" | "Invalid" | "Spoiled";

export interface RecordAnnotation {
  id: string;
  category: AnnotationCategory;
  date: string;
  note: string;
  by: string;
  source?: "auto" | "manual";
  linked?: {
    category: LinkableAnnotationCategory;
    book: string;
    page: string;
    line?: string;
    recordId?: string;
  };
}

export interface IssuedRecordCertificate {
  id?: string;
  type: string;
  date: string;
  by: string;
  status: IssuedCertificateStatus;
  code: string;
  /** Where the copy's QR code points; sent by the server for each issued copy. */
  verifyUrl?: string;
  /** How many times this copy has been reprinted. */
  reprints?: number;
  /** Someone checked the printout and said it printed correctly (digital copies: always). */
  printConfirmed?: boolean;
  /** The paid receipt this copy was issued against, if any. */
  receiptNumber?: string;
}

export type LegitimacyStatus = "Legitimate" | "Illegitimate";

/** Sacraments that record sponsors/godparents — matches the DB's sacrament_sponsor_assignment.sacrament_type. */
export type SponsorSacramentType = "baptism" | "confirmation" | "marriage";

/** Mirrors the `sponsor` table — a person, reusable across sacraments (a ninong can sponsor many baptisms). */
export interface Sponsor {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  sex?: string;
  dateOfBirth?: string;
  contactNumber?: string;
  address?: string;
}

/** Mirrors `sacrament_sponsor_assignment` — links one sponsor to one sacrament record. */
export interface SacramentSponsorAssignment {
  id: string;
  sponsorId: string;
  sacramentType: SponsorSacramentType;
  sacramentRecordId: string;
  /** e.g. Ninong, Ninang, Principal Sponsor */
  role?: string;
  relationshipToRecipient?: string;
  isPrimary: boolean;
  isSigned: boolean;
}

export interface BaptismalRecord {
  /** The schedule event it was recorded from (C11). */
  scheduleEventId?: string | null;
  id: string;
  parishId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  sex?: string;
  dateOfBirth: string;
  placeOfBirth?: string;
  dateOfBaptism: string;
  placeOfBaptism: string;
  legitimacyStatus?: LegitimacyStatus;
  address?: string;
  minister: string;
  fatherLastName: string;
  fatherFirstName: string;
  fatherMiddleName?: string;
  motherLastName: string;
  motherFirstName: string;
  motherMiddleName?: string;
  paternalGrandfather: string;
  paternalGrandmother: string;
  maternalGrandfather: string;
  maternalGrandmother: string;
  withMarriageCertificate: boolean;
  withBirthCertificate: boolean;
  bookNumber: string;
  pageNumber: string;
  entryNumber: string;
  remarks?: string;
  encodedBy: string;
  /** The encoder's name, sent with a single record. */
  encodedByName?: string;
  createdAt: string;
  updatedAt: string;
  status: RecordStatus;
  certificates: IssuedRecordCertificate[];
  annotations: RecordAnnotation[];
  /** Godparents (stored in the sponsor tables), primary first. At most two (can. 873). */
  godparents?: Godparent[];
  /** The scanned register page and row this record was made from (when it was). */
  ledgerPageId?: string;
  ledgerRow?: number;
  /** Sent with a single record: that page's book and number, for a link to it. */
  ledgerSource?: { pageId: string; bookId: string; bookTitle: string; pageNumber: number; row: number };
}

export interface Godparent {
  firstName: string;
  middleName?: string;
  lastName: string;
  role?: "Godfather" | "Godmother";
}

export interface BaptismalSearchCriteria {
  name: string;
  birthdate: string;
  placeOfBirth: string;
  mother: string;
  father: string;
  minister: string;
}

export interface ConfirmationRecord {
  /** The schedule event it was recorded from (C11). */
  scheduleEventId?: string | null;
  id: string;
  parishId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  sex?: string;
  dateOfBirth?: string;
  address?: string;
  fatherLastName?: string;
  fatherFirstName?: string;
  fatherMiddleName?: string;
  motherLastName?: string;
  motherFirstName?: string;
  motherMiddleName?: string;
  dateOfConfirmation: string;
  placeOfConfirmation: string;
  minister: string;
  baptismalRecordId?: string;
  baptismDate?: string;
  baptismPlace?: string;
  isPriorMarriage: boolean;
  isAdult: boolean;
  bookNumber: string;
  pageNumber: string;
  entryNumber: string;
  remarks?: string;
  encodedBy: string;
  createdAt: string;
  updatedAt: string;
  status: RecordStatus;
  certificates: IssuedRecordCertificate[];
}

export interface ConfirmationSearchCriteria {
  name: string;
  birthdate: string;
  address: string;
  mother: string;
  father: string;
  minister: string;
}

export type MarriagePartyRole = "Groom" | "Bride";

export type CivilStatus = "Single" | "Widowed" | "Divorced" | "Annulled";

export interface MarriageConsentPerson {
  id: string;
  lastName?: string;
  firstName?: string;
  middleInitial?: string;
  relation?: string;
  residence?: string;
}

export interface MarriageParty {
  id: string;
  role: MarriagePartyRole;
  lastName: string;
  firstName: string;
  middleName?: string;
  dateOfBirth: string;
  birthplace?: string;
  sex?: string;
  citizenship?: string;
  address?: string;
  religion?: string;
  civilStatus?: CivilStatus;
  baptismalRecordId?: string;
  fatherLastName?: string;
  fatherFirstName?: string;
  fatherMiddleInitial?: string;
  fatherCitizenship?: string;
  motherLastName?: string;
  motherFirstName?: string;
  motherMiddleInitial?: string;
  motherCitizenship?: string;
  consentPersons: MarriageConsentPerson[];
}

export interface MarriageRecord {
  /** The schedule event it was recorded from (C11). */
  scheduleEventId?: string | null;
  id: string;
  parishId: string;
  placeOfMarriage: string;
  marriageAddress?: string;
  dateOfMarriage: string;
  timeOfMarriage?: string;
  minister: string;
  witnessOne: string;
  witnessTwo: string;
  bookNumber: string;
  pageNumber: string;
  entryNumber: string;
  remarks?: string;
  encodedBy: string;
  createdAt: string;
  updatedAt: string;
  parties: MarriageParty[];
  status: RecordStatus;
  certificates: IssuedRecordCertificate[];
}

export interface MarriageSearchCriteria {
  groom: string;
  bride: string;
  marriageDate: string;
  minister: string;
  witness: string;
}

export type DeathSacramentName = "last_rites" | "burial_mass" | "confession" | "communion";

export interface DeathKin {
  id: string;
  relationToDeceased: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
}

export interface DeathSacramentReceived {
  id: string;
  sacramentName: DeathSacramentName;
}

export interface DeathRecord {
  /** The schedule event it was recorded from (C11). */
  scheduleEventId?: string | null;
  id: string;
  parishId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  residence?: string;
  age?: number;
  ageMonths?: number;
  ageDays?: number;
  deceasedStatus?: string;
  dateOfDeath: string;
  dateOfBurial: string;
  placeOfBurial: string;
  nicheNumber?: string;
  nicheType?: string;
  minister: string;
  causeOfDeath?: string;
  bookNumber: string;
  pageNumber: string;
  entryNumber: string;
  remarks?: string;
  /** Optional link back to the parish baptismal register */
  baptismalRecordId?: string;
  encodedBy: string;
  createdAt: string;
  updatedAt: string;
  kin: DeathKin[];
  sacramentsReceived: DeathSacramentReceived[];
  status: RecordStatus;
  certificates: IssuedRecordCertificate[];
}

export interface DeathSearchCriteria {
  name: string;
  dateOfDeath: string;
  dateOfBurial: string;
  minister: string;
  residence: string;
}
