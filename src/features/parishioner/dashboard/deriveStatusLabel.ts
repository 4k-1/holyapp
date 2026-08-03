import type { CertificateRequest } from "@/types";

export function deriveStatusLabel(request: CertificateRequest): string {
  const { status, payment, deliveryMethod } = request;

  if (status === "pending") return "Pending";
  if (status === "rejected") return "Rejected";

  if (status === "processing") {
    if (payment && payment.status === "unpaid") return "Awaiting Payment";
    if (deliveryMethod === "pickup") return "Ready for Pickup";
    return "Processing";
  }

  if (status === "released") return "Released";

  return status;
}

export function deriveStatusTone(request: CertificateRequest): "neutral" | "accent" | "primary" | "danger" {
  const { status, payment } = request;
  if (status === "rejected") return "danger";
  if (status === "released") return "primary";
  if (status === "processing" && payment && payment.status === "unpaid") return "danger";
  return "accent";
}