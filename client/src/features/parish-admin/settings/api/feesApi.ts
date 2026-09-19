import { apiFetch, ApiError } from "@/lib/api";
import type { ServiceFee } from "../types";

function fail(err: unknown): never {
  if (err instanceof ApiError) throw new Error(err.message);
  throw new Error("Unable to reach the server.");
}

export async function listServiceFees(): Promise<ServiceFee[]> {
  try {
    const data = await apiFetch<{ fees: ServiceFee[] }>("/parish/settings/fees");
    return data.fees ?? [];
  } catch (err) {
    fail(err);
  }
}

export async function updateServiceFeeAmount(id: string, amount: number, _updatedBy?: string): Promise<ServiceFee> {
  try {
    const data = await apiFetch<{ fee: ServiceFee }>(`/parish/settings/fees/${id}`, {
      method: "PATCH",
      body: { amount },
    });
    return data.fee;
  } catch (err) {
    fail(err);
  }
}
