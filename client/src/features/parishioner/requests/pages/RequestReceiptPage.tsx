import { useParams } from "react-router-dom";
import { PortalBackLink } from "@/features/parishioner/components/PortalBackLink";
import { getRequestReceipt } from "@/features/parishioner/requests/api/requestsApi";
import { useAsync } from "@/hooks/useAsync";
import { SACRAMENT_TITLES as sacramentLabels } from "@/features/parishioner/requests/requestDisplay";

export function RequestReceiptPage() {
  const { requestId = "" } = useParams();
  const { data: receipt, loading, error } = useAsync(
    () => getRequestReceipt(decodeURIComponent(requestId)),
    [requestId]
  );

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <PortalBackLink to=".." label="This request" />
      <h1 className="font-serif text-[26px] font-bold text-ink">Payment receipt</h1>
      {loading ? (
        <p className="mt-4 text-sm text-ink-muted">Loading receipt…</p>
      ) : error || !receipt ? (
        <p className="mt-4 text-sm font-medium text-red-700">
          {error?.message || "This receipt is not available."}
        </p>
      ) : (
        <div className="mt-6 rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <p className="text-[12px] font-bold uppercase tracking-wide text-ink-muted">{receipt.parishName}</p>
          <p className="mt-1 font-serif text-xl font-bold text-ink">{receipt.number}</p>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Paid for</dt>
              <dd className="text-right font-medium text-ink">{sacramentLabels[receipt.sacramentType]}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Subject</dt>
              <dd className="text-right font-medium text-ink">{receipt.subjectName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Amount</dt>
              <dd className="text-right font-medium text-ink">₱{Number(receipt.amount).toFixed(2)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Method</dt>
              <dd className="text-right font-medium text-ink">
                {receipt.method === "gcash" ? "GCash" : receipt.method === "cash" ? "Cash" : receipt.method}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-muted">Paid at</dt>
              <dd className="text-right font-medium text-ink">
                {receipt.paidAt
                  ? new Date(receipt.paidAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })
                  : "—"}
              </dd>
            </div>
          </dl>
          {receipt.paymongoUrl && (
            <a
              href={receipt.paymongoUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-block text-sm font-semibold text-primary hover:underline"
            >
              PayMongo receipt
            </a>
          )}
        </div>
      )}
    </div>
  );
}
