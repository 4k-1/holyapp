import type { SacramentType, DeliveryMethod } from "@/types";

export interface BaptismFields {
  firstName: string;
  middleName?: string;
  lastName: string;
  birthdate: string;
  birthplace: string;
  parishOfBaptism?: string;
  addressAtTime?: string;
  mothersName?: string;
  fathersName?: string;
  godmothersName?: string;
  godfathersName?: string;
}

export interface ConfirmationFields {
  firstName: string;
  middleName?: string;
  lastName: string;
  birthdate: string;
  birthplace?: string;
  parishOfConfirmation?: string;
  sponsorName?: string;
}

export interface MarriageFields {
  groomFirstName: string;
  groomMiddleName?: string;
  groomLastName: string;
  brideFirstName: string;
  brideMiddleName?: string;
  brideMaidenLastName: string;
  parishOfMarriage?: string;
  placeOfMarriage?: string;
  witness1?: string;
  witness2?: string;
}

export interface DeathFields {
  firstName: string;
  middleName?: string;
  lastName: string;
  dateOfBirth?: string;
  placeOfDeath?: string;
  parish?: string;
  nextOfKin?: string;
}

export type SacramentFieldValues =
  | { sacramentType: "baptism"; fields: BaptismFields }
  | { sacramentType: "confirmation"; fields: ConfirmationFields }
  | { sacramentType: "marriage"; fields: MarriageFields }
  | { sacramentType: "death"; fields: DeathFields };

export interface RequestFormState {
  sacramentType: SacramentType;
  deliveryMethod: DeliveryMethod;
  purpose: string;
  relationship: string;
  sacramentDate: string;
  fields: Record<string, string>;
  documents: string[]; // mock: just file names
}