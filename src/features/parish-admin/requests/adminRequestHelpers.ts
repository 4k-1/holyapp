import type { CertificateRequest } from "@/types";
import { deriveStatusKey, type DerivedStatusKey } from "@/features/parishioner/dashboard/deriveStatusLabel";

export type BadgeTone = "amber" | "green" | "red" | "gold" | "muted";

const adminLabels: Record<DerivedStatusKey, string> = {
  pending: "Pending",
  awaiting_payment: "Awaiting Payment",
  processing: "Processing",
  ready: "Ready for Pickup",
  released: "Released",
  rejected: "Rejected",
};

export function deriveAdminStatusLabel(request: CertificateRequest): string {
  return adminLabels[deriveStatusKey(request)];
}

export function getAdminStatusTone(request: CertificateRequest): BadgeTone {
  switch (deriveStatusKey(request)) {
    case "pending":
      return "amber";
    case "awaiting_payment":
      return "gold";
    case "ready":
      return "gold";
    case "processing":
      return "green";
    case "released":
      return "green";
    case "rejected":
      return "red";
    default:
      return "muted";
  }
}

export function getAdminActionLabel(request: CertificateRequest): string {
  const key = deriveStatusKey(request);
  switch (key) {
    case "pending":
      return "Find record";
    case "awaiting_payment":
      return "View";
    case "processing":
      return request.deliveryMethod === "digital" ? "Issue certificate →" : "Mark ready for pickup →";
    case "ready":
      return "Release →";
    case "released":
      return "View";
    case "rejected":
      return "View";
    default:
      return "View";
  }
}

/** Digital wallet certificates are always a single copy. */
export function getRequestCopyCount(request: CertificateRequest): number {
  if (request.deliveryMethod === "digital") return 1;
  return Math.max(1, request.copies ?? 1);
}

/**
 * Reject is only allowed before payment. Once paid, cancellation is a
 * refund case — not the same as staff reject.
 */
export function canRejectRequest(request: CertificateRequest): boolean {
  return request.payment?.status !== "paid";
}