// src/services/mocks/serviceFees.mock.ts
import type { ServiceFee } from "@/features/parish-admin/settings/types";

export const SERVICE_FEES: ServiceFee[] = [
  { id: "fee-bapt", label: "Baptismal Certificate", amount: 100, updatedBy: "Rec. Staff Carla Bautista", updatedOn: "June 2, 2026" },
  { id: "fee-conf", label: "Confirmation Certificate", amount: 100, updatedBy: "Rec. Staff Carla Bautista", updatedOn: "June 2, 2026" },
  { id: "fee-marr", label: "Marriage Certificate", amount: 150, updatedBy: "Rec. Staff Carla Bautista", updatedOn: "June 2, 2026" },
  { id: "fee-death", label: "Death Certificate", amount: 100, updatedBy: "Rec. Staff Carla Bautista", updatedOn: "June 2, 2026" },
  { id: "fee-copy", label: "Additional copy (per copy)", amount: 50, updatedBy: "Rec. Staff Carla Bautista", updatedOn: "May 14, 2026" },
  { id: "fee-intention", label: "Mass Intention (per intention)", amount: 100, updatedBy: "Rec. Staff Miguel Torres", updatedOn: "May 14, 2026" },
  { id: "fee-house", label: "House Blessing", amount: 500, updatedBy: "Rec. Staff Miguel Torres", updatedOn: "April 28, 2026" },
  { id: "fee-car", label: "Car Blessing", amount: 300, updatedBy: "Rec. Staff Miguel Torres", updatedOn: "April 28, 2026" },
  { id: "fee-business", label: "Business Blessing", amount: 500, updatedBy: "Rec. Staff Miguel Torres", updatedOn: "April 28, 2026" },
];