// src/features/parish-admin/settings/api/feesApi.ts
import { delay } from "@/services/delay";
import { SERVICE_FEES } from "@/services/mocks/serviceFees.mock";
import type { ServiceFee } from "../types";

// NOTE: not scoped by parishId yet since the mock is single-tenant —
// thread parishId through here once fees are per-parish.

export async function listServiceFees(): Promise<ServiceFee[]> {
  await delay();
  return [...SERVICE_FEES];
}

export async function updateServiceFeeAmount(id: string, amount: number, updatedBy: string): Promise<ServiceFee> {
  await delay();
  const fee = SERVICE_FEES.find((f) => f.id === id);
  if (!fee) throw new Error(`Unknown fee id: ${id}`);
  fee.amount = amount;
  fee.updatedBy = updatedBy;
  fee.updatedOn = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return { ...fee };
}