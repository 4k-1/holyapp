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

export interface CertificateRequest {
  id: string;
  parishId: string;
  requesterId: string;
  sacramentType: SacramentType;
  status: RequestStatus;
  origin: RequestType;
  deliveryMethod: DeliveryMethod;
  payment: Payment | null; // null only for walk-in requests with no payment step
  createdAt: string; // ISO date
}