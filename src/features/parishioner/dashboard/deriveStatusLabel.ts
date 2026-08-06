import type { CertificateRequest } from "@/types";

export type DerivedStatusKey =
  | "pending"
  | "awaiting_payment"
  | "processing"
  | "ready"
  | "released"
  | "rejected";

export function deriveStatusKey(request: CertificateRequest): DerivedStatusKey {
  const { status, payment, deliveryMethod } = request;

  if (status === "pending") return "pending";
  if (status === "rejected") return "rejected";
  if (status === "released") return "released";

  if (status === "processing") {
    if (!payment || payment.status === "unpaid") return "awaiting_payment";
    if (deliveryMethod === "pickup") return "ready";
    return "processing";
  }

  return "processing";
}

// Parishioner-facing — full, unambiguous phrasing
const parishionerLabels: Record<DerivedStatusKey, string> = {
  pending: "Pending",
  awaiting_payment: "Awaiting Payment",
  processing: "Processing",
  ready: "Ready for Pickup",
  released: "Released",
  rejected: "Rejected",
};

export function deriveStatusLabel(request: CertificateRequest): string {
  return parishionerLabels[deriveStatusKey(request)];
}