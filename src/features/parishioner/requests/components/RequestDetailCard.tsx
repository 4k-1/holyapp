import { Link } from "react-router-dom";
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

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6">
      <div className="flex items-start gap-3.5">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${getSacramentIconStyle(request.sacramentType)}`}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-serif text-lg font-semibold text-ink">{sacramentLabels[request.sacramentType]}</p>
            <span
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide ${getStatusPillClasses(
                request
              )}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {label}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
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
            <div className="mt-4 flex gap-2.5 rounded-xl border border-primary/15 bg-primary/[0.04] px-4 py-3.5 text-sm text-primary">
              <span className="shrink-0">⛪</span>
              <p>Your printed certificate is ready at the parish office. Bring a valid ID to claim it.</p>
            </div>
          )}

          {isRejected && (
            <div className="mt-4 flex gap-2.5 rounded-xl border border-danger/20 bg-danger/[0.05] px-4 py-3.5 text-sm text-danger">
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
        <div className="mt-4 flex justify-end border-t border-border pt-4">
            <button className="rounded-lg bg-[#b5773a] px-4 py-2 text-[13.5px] font-bold text-white shadow-sm transition-colors hover:bg-[#9c6530]">
            Proceed to Payment
            </button>
        </div>
        )}

      {isReleased && (
        <div className="mt-4 flex justify-end border-t border-border pt-4">
          <Link
            to={`/${parishSlug}/portal/wallet`}
            className="text-[13.5px] font-semibold text-accent hover:underline"
          >
            View in wallet →
          </Link>
        </div>
      )}
    </div>
  );
}