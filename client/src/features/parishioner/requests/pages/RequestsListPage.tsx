import { useEffect, useRef } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { listRequests, syncGcashPayment } from "@/features/parishioner/requests/api/requestsApi";
import { useAsync } from "@/hooks/useAsync";
import { RequestDetailCard } from "@/features/parishioner/requests/components/RequestDetailCard";
import type { Parish } from "@/types";

export function RequestsListPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const [params, setParams] = useSearchParams();
  const { data: requests = [], loading, refetch } = useAsync(() => listRequests(parish.id), [parish.id]);
  const syncing = useRef(false);

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

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-[26px] font-bold text-ink">My Requests</h1>
        <Link
          to={`/${parish.slug}/portal/requests/new`}
          className="rounded-lg bg-primary/90 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:opacity-90"
        >
          + New Request
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-ink-muted">Loading your requests…</p>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-sm text-ink-muted">
          You haven't made any certificate requests yet.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {requests.map((request) => (
            <RequestDetailCard key={request.id} request={request} parishSlug={parish.slug} />
          ))}
        </div>
      )}
    </div>
  );
}
