import { useEffect, useRef, type ReactNode } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { listRequests, syncGcashPayment } from "@/features/parishioner/requests/api/requestsApi";
import { useAsync } from "@/hooks/useAsync";
import { CompletedRequestRow, RequestDetailCard } from "@/features/parishioner/requests/components/RequestDetailCard";
import { requestGroup } from "@/features/parishioner/requests/requestDisplay";
import type { CertificateRequest, Parish } from "@/types";

function newestFirst(a: CertificateRequest, b: CertificateRequest) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="mb-3 font-sans text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-ink-muted">
        {title} <span className="font-normal">({count})</span>
      </h2>
      {children}
    </section>
  );
}

export function RequestsListPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const [params, setParams] = useSearchParams();
  const { data: requests = [], loading, refetch } = useAsync(() => listRequests(parish.id), [parish.id]);
  const syncing = useRef(false);
  const newRequestPath = `/${parish.slug}/portal/requests/new`;

  useEffect(() => {
    const requestId = params.get("request");
    const paid = params.get("paid");
    if (!requestId || paid !== "1" || syncing.current) return;
    syncing.current = true;
    void syncGcashPayment(requestId)
      .catch(() => null)
      .finally(() => {
        setParams({}, { replace: true });
        refetch();
        syncing.current = false;
      });
  }, [params, refetch, setParams]);

  const sorted = [...requests].sort(newestFirst);
  const attention = sorted.filter((r) => requestGroup(r) === "attention");
  const active = sorted.filter((r) => requestGroup(r) === "active");
  const done = sorted.filter((r) => requestGroup(r) === "done");
  const nothingOpen = attention.length === 0 && active.length === 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-serif text-[1.75rem] leading-tight text-ink sm:text-[2rem]">My Requests</h1>
          <p className="mt-1 text-[0.9375rem] text-ink-muted">Certificates you've asked {parish.name} for, and where each one stands.</p>
        </div>
        {requests.length > 0 && (
          <Link
            to={newRequestPath}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-[0.9375rem] font-semibold text-white shadow-[var(--shadow-button)] hover:opacity-90 sm:w-auto"
          >
            <span aria-hidden="true" className="text-[1.125rem] leading-none">+</span>
            Request a certificate
          </Link>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading your requests">
          {[0, 1].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-2xl border border-border bg-surface" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface px-6 py-12 text-center shadow-[var(--shadow-card)]">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/[0.08] text-primary" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
              <path d="M14 3v5h5M9 13h6M9 17h4" />
            </svg>
          </span>
          <h2 className="mt-4 font-serif text-[1.375rem] font-bold text-ink">No requests yet</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-[0.9375rem] text-ink-muted">
            Ask the parish for a baptism, confirmation, marriage or death certificate. You can follow every step here.
          </p>
          <Link
            to={newRequestPath}
            className="mt-6 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-primary px-6 text-[0.9375rem] font-semibold text-white shadow-[var(--shadow-button)] hover:opacity-90"
          >
            Request a certificate
          </Link>
        </div>
      ) : (
        <>
          {attention.length > 0 && (
            <Section title="Needs your attention" count={attention.length}>
              <div className="flex flex-col gap-4">
                {attention.map((request) => (
                  <RequestDetailCard key={request.id} request={request} parishSlug={parish.slug} highlight />
                ))}
              </div>
            </Section>
          )}

          {active.length > 0 && (
            <Section title="In progress" count={active.length}>
              <div className="flex flex-col gap-4">
                {active.map((request) => (
                  <RequestDetailCard key={request.id} request={request} parishSlug={parish.slug} />
                ))}
              </div>
            </Section>
          )}

          {nothingOpen && (
            <p className="rounded-2xl border border-border bg-surface px-5 py-4 text-[0.9375rem] text-ink-muted">
              Nothing in progress right now. Your finished requests are below.
            </p>
          )}

          {done.length > 0 && (
            <details open={nothingOpen} className="group mt-8 rounded-2xl border border-border bg-surface shadow-[var(--shadow-card)]">
              <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 px-4 sm:px-5 [&::-webkit-details-marker]:hidden">
                <span className="font-sans text-[0.9375rem] font-semibold text-ink">
                  Completed <span className="font-normal text-ink-muted">({done.length})</span>
                </span>
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-ink-muted transition-transform group-open:rotate-180" aria-hidden="true">
                  <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <ul className="divide-y divide-border border-t border-border">
                {done.map((request) => (
                  <CompletedRequestRow key={request.id} request={request} parishSlug={parish.slug} />
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </div>
  );
}
