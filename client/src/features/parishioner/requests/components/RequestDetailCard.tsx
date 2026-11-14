import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { CandleIcon, DoveIcon, DropletIcon, HeartIcon } from "@/components/ui/icons/SacramentIcons";
import { deriveStatusKey, deriveStatusLabel } from "@/features/parishioner/dashboard/deriveStatusLabel";
import { getSacramentIconStyle, getStatusPillClasses } from "@/features/parishioner/dashboard/statusStyles";
import { startGcashPayment } from "@/features/parishioner/requests/api/requestsApi";
import { RequestStepTracker } from "@/features/parishioner/requests/components/RequestStepTracker";
import {
  feeOf,
  peso,
  requestRef,
  SACRAMENT_TITLES,
  statusSentence,
  subjectOf,
  submittedLabel,
} from "@/features/parishioner/requests/requestDisplay";
import type { CertificateRequest, SacramentType } from "@/types";

const sacramentIcons: Record<SacramentType, typeof DropletIcon> = {
  baptism: DropletIcon,
  confirmation: DoveIcon,
  marriage: HeartIcon,
  death: CandleIcon,
};

function SacramentBadge({ type, small = false }: { type: SacramentType; small?: boolean }) {
  const Icon = sacramentIcons[type];
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-xl ${small ? "h-9 w-9" : "h-11 w-11"} ${getSacramentIconStyle(type)}`}
      aria-hidden="true"
    >
      <Icon className={small ? "h-4 w-4" : "h-5 w-5"} />
    </span>
  );
}

function StatusPill({ request }: { request: CertificateRequest }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[0.75rem] font-semibold ${getStatusPillClasses(request)}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {deriveStatusLabel(request)}
    </span>
  );
}

const actionBase =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-[0.875rem] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25";
const primaryAction = `${actionBase} bg-primary text-white shadow-[var(--shadow-button)] hover:opacity-90 disabled:opacity-60`;
const secondaryAction = `${actionBase} border border-border bg-surface text-ink hover:bg-surface-alt`;

interface RequestDetailCardProps {
  request: CertificateRequest;
  parishSlug: string;
  /** Something the parishioner needs to do: the card is edged in gold. */
  highlight?: boolean;
  /**
   * "list": the title links to the request's page. "page": the request's own page, where the title is the page
   * heading and the reference, purpose and delivery are left to the labelled details below.
   */
  variant?: "list" | "page";
}

/** One request in progress: what it is, whose it is, where it stands, and the next thing to do. */
export function RequestDetailCard({ request, parishSlug, highlight = false, variant = "list" }: RequestDetailCardProps) {
  const key = deriveStatusKey(request);
  const subject = subjectOf(request);
  const fee = feeOf(request);
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
      if (!result.checkoutUrl) throw new Error("GCash didn't open a payment page. Try again in a moment.");
      window.location.assign(result.checkoutUrl);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Could not start GCash payment.");
      setPaying(false);
    }
  }

  const actions: ReactNode[] = [];
  const onPage = variant === "page";
  const detailsPath = `/${parishSlug}/portal/requests/${request.id}`;
  if (key === "rejected") {
    actions.push(
      <Link key="again" to={`/${parishSlug}/portal/requests/new`} className={`${primaryAction} w-full sm:w-auto`}>
        Request again with more details
      </Link>
    );
  }
  if (key === "awaiting_payment") {
    actions.push(
      <button key="pay" type="button" onClick={payWithGcash} disabled={paying} className={`${primaryAction} w-full sm:w-auto`}>
        <CardIcon />
        {paying ? "Opening GCash…" : fee ? `Pay ${peso(fee)} with GCash` : "Pay with GCash"}
      </button>
    );
  }
  if (isPaid) {
    actions.push(
      <Link key="receipt" to={`/${parishSlug}/portal/requests/${request.id}/receipt`} className={`${secondaryAction} w-full sm:w-auto`}>
        View receipt
      </Link>
    );
  }

  return (
    <article
      className={`rounded-2xl border bg-surface shadow-[var(--shadow-card)] ${
        highlight ? "border-[#e8c98a] ring-1 ring-[#e8c98a]/60" : "border-border"
      }`}
    >
      <div className="p-4 sm:p-6">
        <div className="flex items-start gap-3 sm:gap-4">
          <SacramentBadge type={request.sacramentType} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
              <div className="min-w-0">
                {onPage ? (
                  <h1 className="font-serif text-[1.5rem] font-bold leading-tight text-ink sm:text-[1.75rem]">
                    {SACRAMENT_TITLES[request.sacramentType]}
                  </h1>
                ) : (
                  <h3 className="font-serif text-[1.125rem] font-bold leading-snug text-ink sm:text-[1.25rem]">
                    <TitleLink to={detailsPath}>{SACRAMENT_TITLES[request.sacramentType]}</TitleLink>
                  </h3>
                )}
                {subject && <p className="text-[0.9375rem] text-ink">for {subject}</p>}
              </div>
              <StatusPill request={request} />
            </div>
            {onPage ? (
              <p className="mt-1.5 text-[0.8125rem] text-ink-muted">Submitted {submittedLabel(request.createdAt)}</p>
            ) : (
              <p className="mt-1.5 text-[0.8125rem] text-ink-muted">
                <span className="font-mono">Ref. {requestRef(request)}</span>
                <span aria-hidden="true"> · </span>
                Submitted {submittedLabel(request.createdAt)}
                <span aria-hidden="true"> · </span>
                {request.deliveryMethod === "pickup" ? "Pick up at the office" : "Digital copy"}
                {request.purpose && (
                  <>
                    <span aria-hidden="true"> · </span>
                    Purpose: {request.purpose}
                  </>
                )}
              </p>
            )}
          </div>
        </div>

        <p
          className={`mt-4 rounded-xl px-4 py-3 text-[0.9375rem] leading-relaxed ${
            highlight ? "bg-[#fbf3e1] text-[#5c3f0c]" : "bg-surface-alt text-ink"
          }`}
        >
          {statusSentence(request)}
        </p>

        <div className="mt-5">
          <RequestStepTracker request={request} />
        </div>

        {payError && (
          <p role="alert" className="mt-4 rounded-xl border border-danger/30 bg-danger/[0.06] px-4 py-3 text-[0.875rem] text-danger">
            {payError}
          </p>
        )}
      </div>

      {actions.length > 0 && (
        <div className="flex flex-col-reverse gap-2 border-t border-border px-4 py-3.5 sm:flex-row sm:justify-end sm:px-6">
          {actions}
        </div>
      )}
    </article>
  );
}

/** A finished request in one line, with its wallet or receipt link, or why it wasn't issued. */
export function CompletedRequestRow({ request, parishSlug }: { request: CertificateRequest; parishSlug: string }) {
  const key = deriveStatusKey(request);
  const subject = subjectOf(request);
  const rejected = key === "rejected";

  return (
    <li className="flex items-start gap-3 px-4 py-4 sm:px-5">
      <SacramentBadge type={request.sacramentType} small />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="min-w-0 text-[0.9375rem] font-semibold text-ink">
            <TitleLink to={`/${parishSlug}/portal/requests/${request.id}`}>
              <span>
                {SACRAMENT_TITLES[request.sacramentType]}
                {subject && <span className="font-normal"> · for {subject}</span>}
              </span>
            </TitleLink>
          </p>
          <StatusPill request={request} />
        </div>
        <p className="mt-0.5 text-[0.8125rem] text-ink-muted">
          <span className="font-mono">Ref. {requestRef(request)}</span>
          <span aria-hidden="true"> · </span>
          Submitted {submittedLabel(request.createdAt)}
        </p>
        {rejected ? (
          <div className="mt-2 text-[0.875rem]">
            <p className="text-ink">
              {request.rejectionReason ? (
                <>
                  <span className="font-semibold text-danger">Reason from the office:</span> {request.rejectionReason}
                </>
              ) : (
                "The parish couldn't match a record with the details given."
              )}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
              <Link
                to={`/${parishSlug}/portal/requests/new`}
                className="inline-flex font-semibold text-primary hover:underline"
              >
                Request again with more details →
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.875rem]">
            <Link to={`/${parishSlug}/portal/wallet`} className="font-semibold text-primary hover:underline">
              Open in wallet →
            </Link>
            {request.payment?.status === "paid" && (
              <Link to={`/${parishSlug}/portal/requests/${request.id}/receipt`} className="font-semibold text-ink-muted hover:text-ink hover:underline">
                View receipt
              </Link>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

/** A request's name, linking to its own page. The chevron says it opens; the underline comes on hover. */
function TitleLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="group/title inline-flex items-baseline gap-1 rounded-sm text-ink hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/25">
      {children}
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-3.5 w-3.5 shrink-0 self-center text-ink-muted transition-transform group-hover/title:translate-x-0.5" aria-hidden="true">
        <path d="m8 5 5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}

function CardIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <line x1="2.5" y1="10" x2="21.5" y2="10" />
    </svg>
  );
}
