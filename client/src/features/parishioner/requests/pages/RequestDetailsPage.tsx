import { useEffect, useState } from "react";
import { Link, useLocation, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { useAsync } from "@/hooks/useAsync";
import { getMyRequest, type SubmittedRequestDetails } from "@/features/parishioner/requests/api/requestsApi";
import { PortalBackLink } from "@/features/parishioner/components/PortalBackLink";
import { RequestDetailCard } from "@/features/parishioner/requests/components/RequestDetailCard";
import { MyRequestDocuments } from "@/features/parishioner/requests/documents/MyRequestDocuments";
import { requestGroup } from "@/features/parishioner/requests/requestDisplay";
import {
  DELIVERY_OPTIONS,
  formatDay,
  RECORD_GROUPS,
  SACRAMENT_DATE_KEY,
} from "@/features/parishioner/requests/requestFormConfig";
import type { CertificateRequest, Parish } from "@/types";

/**
 * One request: where it stands (with the next thing to do) and everything the parishioner sent with it.
 * The wizard lands here with ?sent=1 right after a request goes in.
 */
export function RequestDetailsPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const { requestId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  // "Request sent" shows once: the flag leaves the address straight away, so a reload or a bookmark doesn't repeat it.
  const [justSent] = useState(() => params.get("sent") === "1");
  // Photos the wizard couldn't attach, passed along when it lands here.
  const location = useLocation();
  const [failedUploads] = useState<string[]>(() => {
    const state = location.state as { documentsFailed?: string[] } | null;
    return Array.isArray(state?.documentsFailed) ? state.documentsFailed : [];
  });
  useEffect(() => {
    if (params.has("sent")) setParams({}, { replace: true });
  }, [params, setParams]);

  const { data, loading, error } = useAsync(() => getMyRequest(requestId), [requestId]);
  const listPath = `/${parish.slug}/portal/requests`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <PortalBackLink to=".." label="My requests" />

      {justSent && (
        <div role="status" className="mb-5 flex gap-3 rounded-2xl border border-primary/25 bg-primary/[0.06] px-4 py-4 sm:px-5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-white" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M5 13l4.5 4.5L19 7" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="font-sans text-[1rem] font-semibold text-ink">Request sent</p>
            <p className="mt-0.5 text-[0.9375rem] leading-relaxed text-ink-muted">
              We'll email you at each step. You can come back to this page any time from My requests.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading your request">
          <div className="h-56 animate-pulse rounded-2xl border border-border bg-surface" />
          <div className="h-72 animate-pulse rounded-2xl border border-border bg-surface" />
        </div>
      ) : error || !data ? (
        <div className="rounded-2xl border border-border bg-surface px-6 py-10 text-center">
          <h1 className="font-serif text-[1.375rem] font-bold text-ink">We couldn't find this request</h1>
          <Link to={listPath} className="mt-3 inline-flex font-semibold text-primary hover:underline">
            Back to My requests
          </Link>
        </div>
      ) : (
        <>
          <RequestDetailCard
            request={data.request}
            parishSlug={parish.slug}
            variant="page"
            highlight={requestGroup(data.request) === "attention"}
          />
          <MyRequestDocuments requestId={data.request.id} failedUploads={failedUploads} />
          <SubmittedDetails request={data.request} submitted={data.submitted} parish={parish} />
        </>
      )}
    </div>
  );
}

function SubmittedDetails({
  request,
  submitted,
  parish,
}: {
  request: CertificateRequest;
  submitted: SubmittedRequestDetails;
  parish: Parish;
}) {
  const values: Record<string, string> = { ...submitted.fields };
  if (submitted.sacramentDate) values[SACRAMENT_DATE_KEY] = submitted.sacramentDate;
  const valueOf = (key: string) => (values[key] ?? "").trim();

  const relationship = submitted.relationship?.trim();
  const forWhom = !relationship || relationship === "Myself" ? "Me" : `Someone else (${relationship.toLowerCase()})`;
  const delivery = DELIVERY_OPTIONS.find((option) => option.key === request.deliveryMethod)?.label ?? request.deliveryMethod;

  // The same groups as the form, so each detail sits under the heading it was asked under.
  const sections = [
    {
      title: "Request",
      rows: [
        ["Reference", request.referenceNo],
        ["For", forWhom],
        ["Purpose", request.purpose ?? ""],
        ["Delivery", delivery],
      ] as [string, string][],
    },
    ...RECORD_GROUPS[request.sacramentType].map((group) => ({
      title: group.title,
      rows: group.rows
        .flat()
        .map((field): [string, string] => [
          field.label,
          field.type === "date" && valueOf(field.key) ? formatDay(valueOf(field.key)) : valueOf(field.key),
        ]),
    })),
  ]
    .map((section) => ({ ...section, rows: section.rows.filter(([, value]) => value) }))
    .filter((section) => section.rows.length > 0);

  const phone = parish.contact?.trim();
  const tel = phone ? phone.replace(/[^\d+]/g, "") : "";

  return (
    <section aria-labelledby="sent-heading" className="mt-6 rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)]">
      <h2 id="sent-heading" className="px-4 pb-1 pt-4 font-sans text-[1rem] font-semibold text-ink sm:px-6 sm:pt-5">
        What you sent
      </h2>
      {sections.map((section) => (
        <div key={section.title} className="px-4 pt-3 sm:px-6">
          <h3 className="border-b border-border pb-1.5 text-[0.8125rem] font-semibold text-ink-muted">{section.title}</h3>
          <dl>
            {section.rows.map(([label, value]) => (
              <div
                key={label}
                className="grid grid-cols-[minmax(0,40%)_minmax(0,1fr)] gap-3 border-b border-border/60 py-2 last:border-b-0 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)] sm:gap-4"
              >
                <dt className="text-[0.875rem] text-ink-muted">{label}</dt>
                <dd className="break-words text-[0.9375rem] text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
      <p className="mt-3 border-t border-border px-4 py-3.5 text-[0.875rem] leading-relaxed text-ink-muted sm:px-6">
        Spotted a mistake?{" "}
        {phone ? (
          <>
            Call the parish office at{" "}
            <a href={`tel:${tel}`} className="font-semibold text-primary hover:underline">
              {phone}
            </a>{" "}
            and give your reference, {request.referenceNo}.
          </>
        ) : (
          <>Contact the parish office and give your reference, {request.referenceNo}.</>
        )}
      </p>
    </section>
  );
}
