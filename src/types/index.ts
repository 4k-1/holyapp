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
}

export interface CurrentUser {
  id: string;
  parishId: string | null;
  role: Role;
  fullName: string;
  email: string;
}