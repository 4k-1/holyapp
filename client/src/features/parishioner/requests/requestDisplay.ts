import { deriveStatusKey, type DerivedStatusKey } from "@/features/parishioner/dashboard/deriveStatusLabel";
import type { CertificateRequest, SacramentType } from "@/types";

export const SACRAMENT_TITLES: Record<SacramentType, string> = {
  baptism: "Baptism certificate",
  confirmation: "Confirmation certificate",
  marriage: "Marriage certificate",
  death: "Death certificate",
};

/** Where a request belongs on the page: something to do, still moving, or finished. */
export type RequestGroup = "attention" | "active" | "done";

export function requestGroup(request: CertificateRequest): RequestGroup {
  const key = deriveStatusKey(request);
  if (key === "awaiting_payment" || key === "ready") return "attention";
  if (key === "released" || key === "rejected") return "done";
  return "active";
}

/** The person the certificate is for, when the request names them. */
export function subjectOf(request: CertificateRequest): string | null {
  const name = request.details?.subjectName?.trim();
  return name && name !== "Certificate subject" ? name : null;
}

/** The short reference people read and search for, e.g. CR-2026-00042. */
export function requestRef(request: CertificateRequest) {
  return request.referenceNo;
}

export function peso(amount: number) {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: amount % 1 ? 2 : 0 })}`;
}

export function feeOf(request: CertificateRequest): number | null {
  const amount = request.payment?.amount;
  return typeof amount === "number" && amount > 0 ? amount : null;
}

/** "Sep 24, 2026", with "today", "yesterday" or "3 days ago" for the last few weeks. */
export function submittedLabel(createdAt: string, now = new Date()) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "";
  const full = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(date)) / 86_400_000);
  if (days < 0 || days > 27) return full;
  if (days === 0) return `${full} (today)`;
  if (days === 1) return `${full} (yesterday)`;
  if (days < 14) return `${full} (${days} days ago)`;
  return `${full} (${Math.floor(days / 7)} weeks ago)`;
}

/** One plain sentence on where the request stands and what happens next. */
export function statusSentence(request: CertificateRequest): string {
  const key: DerivedStatusKey = deriveStatusKey(request);
  const fee = feeOf(request);
  switch (key) {
    case "pending":
      return request.origin === "walkin"
        ? "The parish office is preparing this certificate."
        : "Staff are looking for the entry in the parish register. We'll email you once it's found.";
    case "awaiting_payment":
      return `We found the record. Pay the certificate fee${fee ? ` of ${peso(fee)}` : ""} to continue.`;
    case "processing":
      return request.deliveryMethod === "pickup"
        ? "Payment received. Staff are printing and sealing your certificate."
        : "Payment received. Staff are preparing your certificate.";
    case "ready":
      return "Your printed certificate is ready at the parish office. Bring a valid ID to claim it.";
    case "released":
      return request.deliveryMethod === "pickup"
        ? "Claimed at the parish office. A copy is also in your certificate wallet."
        : "Released. Your certificate is in your certificate wallet.";
    case "rejected":
      return request.rejectionReason?.trim()
        ? `The parish couldn't issue this certificate. The office says: “${request.rejectionReason.trim()}”`
        : "The parish couldn't match a record with the details given.";
  }
}
