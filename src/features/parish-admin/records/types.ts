export type AnnotationCategory = "Confirmation" | "Marriage" | "Death" | "Other";

export type RecordStatus = "Active" | "Archived";

export type IssuedCertificateStatus = "Valid" | "Superseded" | "Invalid";

export interface RecordAnnotation {
  id: string;
  category: AnnotationCategory;
  date: string;
  note: string;
  by: string;
  linked?: {
    category: string;
    book: string;
    page: string;
    line?: string;
  };
}

export interface IssuedRecordCertificate {
  type: string;
  date: string;
  by: string;
  status: IssuedCertificateStatus;
  code: string;
}

export type LegitimacyStatus = "Legitimate" | "Illegitimate" | "Natural";

export interface BaptismalRecord {
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
  motherLastName: string;
  motherFirstName: string;
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
  createdAt: string;
  updatedAt: string;
  status: RecordStatus;
  certificates: IssuedRecordCertificate[];
  annotations: RecordAnnotation[];
}

export interface BaptismalSearchCriteria {
  name: string;
  birthdate: string;
  placeOfBirth: string;
  mother: string;
  father: string;
  minister: string;
  placeOfBaptism: string;
}

export interface ConfirmationRecord {
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
  motherLastName?: string;
  motherFirstName?: string;
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
  place: string;
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
  id: string;
  parishId: string;
  placeOfMarriage: string;
  marriageAddress?: string;
  dateOfMarriage: string;
  timeOfMarriage?: string;
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
  place: string;
  witness: string;
}

export type DeathSacramentName = "last_rites" | "burial_mass" | "confession" | "communion";

export interface DeathKin {
  id: string;
  relationToDeceased: string;
  lastName?: string;
  firstName?: string;
}

export interface DeathSacramentReceived {
  id: string;
  sacramentName: DeathSacramentName;
}

export interface DeathRecord {
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
  placeOfBurial: string;
  minister: string;
  residence: string;
}
