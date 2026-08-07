export type Role = "super_admin" | "parish_admin" | "parish_staff" | "parishioner";

export type SacramentType = "baptism" | "confirmation" | "marriage" | "death";

export type RequestType = "online" | "walkin";

export type DeliveryMethod = "pickup" | "digital";

export type RequestStatus = "pending" | "processing" | "released" | "rejected";

export type CertificateState = "valid" | "superseded" | "invalid";

export interface Parish {
  id: string;
  slug: string;
  name: string;
  address: string;
  sealUrl?: string;
  backgroundImageUrl?: string;
  tagline?: string;
}

export interface CurrentUser {
  id: string;
  parishId: string | null;
  role: Role;
  fullName: string;
  email: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  gender?: string;
  birthday?: string; // ISO date string, e.g. "1998-04-12"
  address?: string;
}

export interface Payment {
  status: "unpaid" | "paid";
  amount: number;
  method?: string;
}

export interface CertificateRequestDetails {
  subjectName: string;
  birthdate?: string;
  birthplace?: string;
  motherName?: string;
  fatherName?: string;
  sponsor1?: string;
  sponsor2?: string;
  baptismDate?: string;
}

export interface CertificateRequest {
  id: string;
  parishId: string;
  requesterId: string;
  sacramentType: SacramentType;
  status: RequestStatus;
  origin: RequestType;
  deliveryMethod: DeliveryMethod;
  payment: Payment | null;
  purpose?: string;
  createdAt: string;
  copies?: number;
  details?: CertificateRequestDetails;
  linkedRecordId?: string | null;
  rejectionReason?: string;
}

export interface IssuedCertificate {
  id: string;
  requestId: string;
  parishId: string;
  ownerId: string;
  sacramentType: SacramentType;
  holderName: string;
  issuedAt: string;
  state: CertificateState;
}

export type MassDayType = "weekday" | "saturday" | "sunday" | "firstFriday";

export interface MassScheduleEntry {
  dayType: MassDayType;
  label: string;
  times: string[];
}

export interface MassIntentionRequest {
  id: string;
  parishId: string;
  requesterId: string | null; // null if ever opened to guests later; for now always the logged-in parishioner
  intentionType: string;
  intentionFor: string;
  requestedBy: string;
  scheduleDate: string;   // ISO date, e.g. "2026-07-05"
  scheduleTime: string;   // snapshotted display string, e.g. "8:00 AM" — NOT a live reference to MassScheduleEntry
  scheduleLabel: string;  // snapshotted day-type label, e.g. "Sunday" — also frozen at submission time
  createdAt: string;
}