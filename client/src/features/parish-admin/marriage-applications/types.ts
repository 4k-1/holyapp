export type MarriageApplicationStatus =
  | "pending"
  | "checking_requirements"
  | "approved"
  | "rejected"
  | "completed";

export type DispensationStatus = "none" | "pending" | "granted" | "denied";

export type WeddingDateStatus = "none" | "reserved" | "confirmed";

export interface MarriageRequirement {
  id: string;
  typeId: string;
  name: string;
  required: boolean;
  submitted: boolean;
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
