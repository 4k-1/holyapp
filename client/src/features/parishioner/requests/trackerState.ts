import type { CertificateRequest } from "@/types";

export interface TrackerState {
  steps: string[];
  doneCount: number;
  currentIndex: number | null;
  rejected: boolean;
  fillPercent: number;
}

export function getTrackerState(request: CertificateRequest): TrackerState {
  if (request.status === "rejected") {
    return { steps: ["Submitted", "Not issued"], doneCount: 1, currentIndex: 1, rejected: true, fillPercent: 100 };
  }

  const walkin = request.origin === "walkin";
  const steps = walkin
    ? request.deliveryMethod === "pickup"
      ? ["Requested at office", "Ready for pickup", "Released"]
      : ["Requested at office", "Released"]
    : request.deliveryMethod === "pickup"
      ? ["Submitted", "Record found", "Payment", "Preparing", "Ready for pickup", "Released"]
      : ["Submitted", "Record found", "Payment", "Preparing", "Released"];

  let currentIndex = 0;

  if (walkin) {
    currentIndex = request.status === "released" ? steps.length - 1 : request.pickupReady ? 1 : 0;
  } else if (request.status === "pending") {
    currentIndex = 1; // Submitted is done; staff are searching the register
  } else if (request.status === "processing") {
    if (!request.payment || request.payment.status === "unpaid") {
      currentIndex = 2; // Payment
    } else if (request.deliveryMethod === "pickup") {
      currentIndex = request.pickupReady ? 4 : 3; // Ready for pickup once sealed
    } else {
      currentIndex = 3; // Preparing
    }
  } else if (request.status === "released") {
    currentIndex = steps.length - 1;
  }

  const doneCount = request.status === "released" ? steps.length : currentIndex;
  const fillPercent = (currentIndex / (steps.length - 1)) * 100;

  return { steps, doneCount, currentIndex, rejected: false, fillPercent };
}