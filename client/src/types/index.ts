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
  /** Pickup only — set when staff confirms print/seal; unlocks "Ready for Pickup" status. */
  pickupReady?: boolean;
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

export type MassIntentionPayment = "paid" | "unpaid";

export type MassSlotCapacityState = "open" | "nearly_full" | "full";

/**
 * Hard cap of announced intentions per Mass (Canon 948 / local parish limit).
 * TODO: replace with parish settings once Mass intention rules exist.
 */
export const MASS_INTENTION_MAX_PER_SLOT = 5;

export interface MassIntentionRequest {
  id: string;
  parishId: string;
  /** Portal user id, or `"online"` for public / office-recorded online requests. */
  requesterId: string | null;
  intentionType: string;
  intentionFor: string;
  requestedBy: string;
  contact?: string;
  status: MassIntentionStatus;
  offering: number;
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
  maxIntentions: number;
  bookedCount: number;
  remaining: number;
  capacityState: MassSlotCapacityState;
  intentions: MassIntentionRequest[];
}

interface EventTypeStyle {
  tag: string;
  card: string;
}

export const EVENT_TYPE_STYLES: Record<EventType, EventTypeStyle> = {
  mass: {
    tag: "bg-admin-green-100 text-admin-green-700",
    card: "bg-admin-green-100 border-l-[3px] border-l-admin-green-700",
  },
  novena: {
    tag: "bg-admin-gold-100 text-admin-gold-700",
    card: "bg-admin-gold-100 border-l-[3px] border-l-admin-gold-700",
  },
  blessing: {
    tag: "bg-[#E3E9F5] text-[#3B6FB4]",
    card: "bg-[#E3E9F5] border-l-[3px] border-l-[#3B6FB4]",
  },
  interview: {
    tag: "bg-[#EDE3F5] text-[#6A3B9E]",
    card: "bg-[#EDE3F5] border-l-[3px] border-l-[#6A3B9E]",
  },
  manual: {
    tag: "bg-admin-surface-alt text-admin-ink-muted",
    card: "bg-admin-surface-alt border-l-[3px] border-l-admin-ink-muted",
  },
  baptism: {
    tag: "bg-[#E1F0EE] text-[#2E8B87]",
    card: "bg-[#E1F0EE] border-l-[3px] border-l-[#2E8B87]",
  },
  confirmation: {
    tag: "bg-[#E3E9F5] text-[#3B4E8A]",
    card: "bg-[#E3E9F5] border-l-[3px] border-l-[#3B4E8A]",
  },
  wedding: {
    tag: "bg-[#F5E3EA] text-[#B4577A]",
    card: "bg-[#F5E3EA] border-l-[3px] border-l-[#B4577A]",
  },
  funeral: {
    tag: "bg-admin-surface-alt text-[#5B5750]",
    card: "bg-admin-surface-alt border-l-[3px] border-l-[#5B5750]",
  },
};