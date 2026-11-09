import type { PrintedRecord } from "@/features/parish-admin/components/certificate/certificateData";
export type Role = "super_admin" | "parish_admin" | "parish_staff" | "parishioner";

/** Mirrors `user_status` in the identity schema. */
export type UserStatus = "active" | "suspended";

export type SacramentType = "baptism" | "confirmation" | "marriage" | "death";

export type RequestType = "online" | "walkin";

export type DeliveryMethod = "pickup" | "digital";

export type RequestStatus = "pending" | "processing" | "released" | "rejected";

export type CertificateState = "valid" | "superseded" | "invalid";

export interface Parish {
  id: string;
  /** Frontend routing key — not a DB column. */
  slug: string;
  name: string;
  address: string;
  contact: string;
  email: string;
  sealUrl?: string;
  backgroundImageUrl?: string;
  /** A photo of the church building, shown on the parishioner dashboard. */
  photoUrl?: string;
  tagline?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CurrentUser {
  id: string;
  parishId: string | null;
  role: Role;
  status: UserStatus;
  /** Display convenience — DB stores first/middle/last only (migration 009). */
  fullName: string;
  email: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  contactNumber?: string;
  emailVerifiedAt?: string;
  createdAt?: string;
  gender?: string;
  birthday?: string; // ISO date string, e.g. "1998-04-12"
  address?: string;
}

/** Mirrors `audit_log`. `parishId` is null for platform-level actions. */
export interface AuditLogEntry {
  id: string;
  parishId: string | null;
  actorId: string;
  actorName?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface Payment {
  status: "unpaid" | "paid";
  amount: number;
  method?: string;
  receiptNumber?: string;
  receiptUrl?: string;
  paidAt?: string;
  /** Staff member who took the payment at the office; absent for GCash. */
  collectedBy?: string;
}

export interface PaymentReceipt {
  number: string;
  requestId: string;
  parishName: string;
  subjectName: string;
  sacramentType: SacramentType;
  amount: number;
  method: string;
  paidAt: string | null;
  paymongoUrl?: string;
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
  /** Short reference people read and search for, e.g. CR-2026-00042. The id stays the key. */
  referenceNo: string;
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
  /** Pickup only — set when staff confirms print/seal; unlocks "Ready for Pickup" status. */
  pickupReady?: boolean;
  issuedCertificate?: {
    id: string;
    code: string;
    state: CertificateState;
  } | null;
}

/**
 * Snapshot of register data captured at issuance, so a wallet certificate always
 * renders the same way it did the day it was released — independent of later
 * edits to the underlying sacramental record. Field-for-field compatible with
 * the admin side's CertificateFields (see parish-admin/components/CertificateDocument).
 */
export interface IssuedCertificateFields {
  requestId: string;
  registerRef: string;
  birthdate?: string;
  birthplace?: string;
  baptismDate?: string;
  confirmationDate?: string;
  marriageDate?: string;
  deathDate?: string;
  motherName?: string;
  fatherName?: string;
  notations?: string[];
  verifyUrl?: string;
  /** The full record as it was printed when the copy was issued. */
  printed?: PrintedRecord;
  /** ISO date the copy was issued. */
  issuedOn?: string;
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
  certCode: string;
  fields: IssuedCertificateFields;
}

export type MassDayType = "weekday" | "saturday" | "sunday" | "firstFriday";

export interface MassScheduleEntry {
  dayType: MassDayType;
  label: string;
  times: string[];
}

export const MASS_INTENTION_TYPES = [
  "Thanksgiving",
  "Healing",
  "In memory of the deceased",
  "Birthday blessing",
  "Other",
] as const;

export type MassIntentionTypeName = (typeof MASS_INTENTION_TYPES)[number];

/** Online origin for now. `said` = already offered at Mass. */
export type MassIntentionStatus = "pending" | "confirmed" | "said";

/** Donations are optional: `none`, a GCash donation still `pending`, or `paid`. */
export type MassIntentionPayment = "paid" | "pending" | "none";

export type MassSlotCapacityState = "open" | "nearly_full" | "full";

/**
 * Hard cap of announced intentions per Mass (Canon 948 / local parish limit).
 * TODO: replace with parish settings once Mass intention rules exist.
 */
export const MASS_INTENTION_MAX_PER_SLOT = 5;

export interface MassIntentionRequest {
  id: string;
  /** Short reference people read and search for, e.g. MI-2026-00007. */
  referenceNo: string;
  parishId: string;
  /** Portal user id, or `"online"` for public / office-recorded online requests. */
  requesterId: string | null;
  intentionType: string;
  intentionFor: string;
  requestedBy: string;
  contact?: string;
  status: MassIntentionStatus;
  /** Optional donation in pesos; 0 when none was given. */
  offering: number;
  donation?: number;
  payment: MassIntentionPayment;
  scheduleDate: string;   // ISO date, e.g. "2026-07-05"
  scheduleTime: string;   // snapshotted display string, e.g. "8:00 AM" — NOT a live reference to MassScheduleEntry
  scheduleLabel: string;  // snapshotted day-type label, e.g. "Sunday" — also frozen at submission time
  createdAt: string;
}

/** Derived Mass slot: schedule occurrence + booked count vs max. Not persisted. */
export interface MassSlotView {
  id: string;
  parishId: string;
  date: string;
  time: string;
  scheduleLabel: string;
  location: string;
  /** null when the parish sets no limit on intentions per Mass. */
  maxIntentions: number | null;
  bookedCount: number;
  /** null when there is no limit. */
  remaining: number | null;
  capacityState: MassSlotCapacityState;
  intentions: MassIntentionRequest[];
}
