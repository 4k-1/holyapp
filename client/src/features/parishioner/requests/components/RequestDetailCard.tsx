import { useState } from "react";
import { Link } from "react-router-dom";
import { startGcashPayment } from "@/features/parishioner/requests/api/requestsApi";
import { DropletIcon, DoveIcon, HeartIcon, CandleIcon } from "@/components/ui/icons/SacramentIcons";
import { getSacramentIconStyle } from "@/features/parishioner/dashboard/statusStyles";
import { getStatusPillClasses } from "@/features/parishioner/dashboard/statusStyles";
import { deriveStatusLabel } from "@/features/parishioner/dashboard/deriveStatusLabel";
import { RequestStepTracker } from "@/features/parishioner/requests/components/RequestStepTracker";
import type { CertificateRequest, SacramentType } from "@/types";

const sacramentLabels: Record<SacramentType, string> = {
  baptism: "Certificate of Baptism",
  confirmation: "Certificate of Confirmation",
  marriage: "Certificate of Marriage",
  death: "Certificate of Death",
};

const sacramentIcons: Record<SacramentType, typeof DropletIcon> = {
  baptism: DropletIcon,
  confirmation: DoveIcon,
  marriage: HeartIcon,
  death: CandleIcon,
};

interface RequestDetailCardProps {
  request: CertificateRequest;
  parishSlug: string;
}

export function RequestDetailCard({ request, parishSlug }: RequestDetailCardProps) {
  const Icon = sacramentIcons[request.sacramentType];
  const label = deriveStatusLabel(request);
  const isAwaitingPayment = label === "Awaiting Payment";
  const isReadyForPickup = label === "Ready for Pickup";
  const isReleased = label === "Released";
  const isRejected = label === "Rejected";
  const isPaid = request.payment?.status === "paid";
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  async function payWithGcash() {
    if (paying) return;
    setPaying(true);
    setPayError(null);
    try {
      const result = await startGcashPayment(request.id);
      if (result.paid) {
        window.location.reload();
        return;
      }
      if (!result.checkoutUrl) throw new Error("PayMongo did not return a checkout page.");
      window.location.assign(result.checkoutUrl);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Could not start GCash payment.");
      setPaying(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm transition-shadow hover:shadow-md sm:p-6">
      <div className="flex items-start gap-3 sm:gap-3.5">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10 ${getSacramentIconStyle(
            request.sacramentType
          )}`}
        >
          <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-serif text-[15px] font-semibold leading-snug text-ink sm:text-lg">
            {sacramentLabels[request.sacramentType]}
          </p>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-ink-muted">
            <span
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${getStatusPillClasses(
                request
              )}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {label}
            </span>
            <span className="text-border">·</span>
            <span>
              {new Date(request.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
            {request.purpose && (
              <>
                <span className="text-border">·</span>
                <span>{request.purpose}</span>
              </>
            )}
            <span className="text-border">·</span>
            <span>{request.deliveryMethod === "pickup" ? "Self Pickup" : "Digital Copy"}</span>
          </div>

          <RequestStepTracker request={request} />

          {isReadyForPickup && (
            <div className="mt-4 flex gap-2.5 rounded-xl border border-primary/15 bg-primary/[0.04] px-3.5 py-3 text-sm text-primary sm:px-4 sm:py-3.5">
              <span className="shrink-0"></span>
              <p>Your printed certificate is ready at the parish office. Bring a valid ID to claim it.</p>
            </div>
          )}

          {isRejected && (
            <div className="mt-4 flex gap-2.5 rounded-xl border border-danger/20 bg-danger/[0.05] px-3.5 py-3 text-sm text-danger sm:px-4 sm:py-3.5">
              <span className="shrink-0">ℹ</span>
              <p>
                We couldn't match a {sacramentLabels[request.sacramentType].replace("Certificate of ", "")} record with
                the details provided. Please confirm the parish and approximate date, then submit a new request.
              </p>
            </div>
          )}
        </div>
      </div>

      {isAwaitingPayment && (
        <div className="mt-4 border-t border-border pt-4">
          {payError && <p className="mb-3 text-sm font-medium text-red-700">{payError}</p>}
          <button
            type="button"
            onClick={payWithGcash}
            disabled={paying}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[13.5px] font-bold text-white shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60 sm:w-auto sm:ml-auto"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-4 w-4"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
              <line x1="2.5" y1="10" x2="21.5" y2="10" />
            </svg>
            {paying ? "Opening GCash…" : "Proceed to Payment"}
          </button>
        </div>
      )}

      {isPaid && (
        <div className="mt-4 border-t border-border pt-4">
          <Link
            to={`/${parishSlug}/portal/requests/${request.id}/receipt`}
            className="flex w-full items-center justify-center gap-1 rounded-xl border border-border px-4 py-2.5 text-[13.5px] font-semibold text-ink transition-colors hover:bg-surface-alt sm:w-auto sm:ml-auto"
          >
            View receipt
          </Link>
        </div>
      )}

      {isReleased && (
        <div className="mt-4 border-t border-border pt-4">
          <Link
            to={`/${parishSlug}/portal/wallet`}
            className="flex w-full items-center justify-center gap-1 rounded-xl border border-primary/30 px-4 py-2.5 text-[13.5px] font-semibold text-primary transition-colors hover:bg-primary/5 sm:w-auto sm:ml-auto sm:border-0 sm:px-0 sm:py-0 sm:hover:bg-transparent sm:hover:underline"
          >
            View in wallet →
          </Link>
        </div>
      )}
    </div>
  );
}