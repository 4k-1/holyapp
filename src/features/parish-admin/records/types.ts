export type AnnotationCategory = "Confirmation" | "Marriage" | "Death" | "Other";

export type RecordStatus = "Active" | "Archived";

export type IssuedCertificateStatus = "Valid" | "Superseded" | "Invalid";

export interface RecordAnnotation {
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

export interface BaptismalRecord {
  id: string;
  parishId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dob: string;
  birthplace: string;
  sex: "Male" | "Female";
  baptismDate: string;
  priest: string;
  motherFirstName: string;
  motherLastName: string;
  fatherFirstName: string;
  fatherLastName: string;
  sponsor1: string;
  sponsor2: string;
  book: string;
  page: string;
  line: string;
  lastUpdated: string;
  lastUpdatedBy: string;
  issuedCount: number;
  status: RecordStatus;
  annotations: RecordAnnotation[];
  certificates: IssuedRecordCertificate[];
}

export interface BaptismalSearchCriteria {
  name: string;
  birthdate: string;
  birthplace: string;
  mother: string;
  father: string;
  priest: string;
}

export interface ConfirmationRecord {
  id: string;
  parishId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dob: string;
  birthplace: string;
  sex: "Male" | "Female";
  confirmationDate: string;
  priest: string;
  sponsor: string;
  sponsor2?: string;
  baptismDate?: string;
  baptismParish?: string;
  motherFirstName: string;
  motherLastName: string;
  fatherFirstName: string;
  fatherLastName: string;
  book: string;
  page: string;
  line: string;
  lastUpdated: string;
  lastUpdatedBy: string;
  issuedCount: number;
  status: RecordStatus;
  annotations: RecordAnnotation[];
  certificates: IssuedRecordCertificate[];
}

export interface ConfirmationSearchCriteria {
  name: string;
  birthdate: string;
  birthplace: string;
  mother: string;
  father: string;
  priest: string;
  sponsor: string;
}
