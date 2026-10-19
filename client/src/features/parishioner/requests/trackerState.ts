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
    return { steps: ["Pending", "Rejected"], doneCount: 1, currentIndex: 1, rejected: true, fillPercent: 100 };
  }

  const walkin = request.origin === "walkin";
  const steps = walkin
    ? request.deliveryMethod === "pickup"
      ? ["Walk-in", "Ready for Pickup", "Released"]
      : ["Walk-in", "Released"]
    : request.deliveryMethod === "pickup"
      ? ["Pending", "Approved", "Pay", "Processing", "Ready for Pickup", "Released"]
      : ["Pending", "Approved", "Pay", "Processing", "Released"];

  let currentIndex = 0;

  if (walkin) {
    currentIndex = request.status === "released" ? steps.length - 1 : request.pickupReady ? 1 : 0;
  } else if (request.status === "pending") {
    currentIndex = 0;
  } else if (request.status === "processing") {
    if (!request.payment || request.payment.status === "unpaid") {
      currentIndex = 2; // Pay
    } else if (request.deliveryMethod === "pickup") {
      currentIndex = 4; // Ready for Pickup
    } else {
      currentIndex = 3; // Processing
    }
  } else if (request.status === "released") {
    currentIndex = steps.length - 1;
  }

  const doneCount = request.status === "released" ? steps.length : currentIndex;
  const fillPercent = (currentIndex / (steps.length - 1)) * 100;

  return { steps, doneCount, currentIndex, rejected: false, fillPercent };
}