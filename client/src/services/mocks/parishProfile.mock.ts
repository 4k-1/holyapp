// src/services/mocks/parishProfile.mock.ts
import type { ParishProfile } from "@/features/parish-admin/settings/types";

export let PARISH_PROFILE: ParishProfile = {
  name: "Sto. Niño de Cebu Parish",
  address: "Osmeña Blvd, Cebu City, 6000 Cebu",
  patron: "Santo Niño",
  diocese: "Archdiocese of Cebu",
  phone: "(032) 255 6698",
  email: "office@stonino-parish.ph",
  fiestaDate: "",
  localFeasts: [],
};

export function setParishProfile(next: ParishProfile) {
  PARISH_PROFILE = next;
}