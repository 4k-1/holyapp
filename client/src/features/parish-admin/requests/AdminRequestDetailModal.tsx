import { useState } from "react";
import { Link } from "react-router-dom";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import { AdminDeliveryTag } from "@/features/parish-admin/components/AdminDeliveryTag";
import { AdminModalFrame } from "@/features/parish-admin/components/AdminModalFrame";
import { PrintReceiptDialog } from "@/features/parish-admin/components/PrintReceiptDialog";
import {
  canRejectRequest,
  deriveAdminStatusLabel,
  getAdminStatusTone,
  getRequestCopyCount,
} from "@/features/parish-admin/requests/adminRequestHelpers";
import { deriveStatusKey } from "@/features/parishioner/dashboard/deriveStatusLabel";
import { getBaptismalRecord } from "@/features/parish-admin/records/api/baptismalRecordsApi";
import { useAsync } from "@/hooks/useAsync";
import {
  initials,
  recordFullName,
} from "@/features/parish-admin/records/baptismalHelpers";
import { recordDetailPath } from "@/features/parish-admin/records/recordPaths";
import { AdminIssueCertificateModal } from "@/features/parish-admin/requests/AdminIssueCertificateModal";
import { AdminReleaseCertificateModal } from "@/features/parish-admin/requests/AdminReleaseCertificateModal";
import { confirmRequestPayment, revokeIssuedCertificate } from "@/features/parish-admin/requests/api/requestsAdminApi";
import type { CertificateRequest, Parish, SacramentType } from "@/types";
import { askText } from "@/lib/notify";

const sacramentLabels: Record<SacramentType, string> = {
  baptism: "Baptismal",
  confirmation: "Confirmation",
  marriage: "Marriage",
  death: "Death",
};

interface AdminRequestDetailModalProps {
  request: CertificateRequest;
  parish: Parish;
  onClose: () => void;
  onReject?: (request: CertificateRequest) => void;
  onPaymentRecorded?: (request: CertificateRequest) => void;
  onIssueComplete?: () => void;
  onReleaseComplete?: () => void;
}

export function AdminRequestDetailModal({
  request,
  parish,
  onClose,
  onReject,
  onPaymentRecorded,
  onIssueComplete,
  onReleaseComplete,
}: AdminRequestDetailModalProps) {
  const [issueOpen, setIssueOpen] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const statusKey = deriveStatusKey(request);
  const canReject = canRejectRequest(request);
  const subjectName = request.details?.subjectName ?? request.requesterId;
  const copies = getRequestCopyCount(request);
  const fee = request.payment?.amount ?? 100 * copies;
  const method =
    request.payment?.method === "gcash"
      ? "GCash"
      : request.payment?.method === "cash"
        ? "Cash"
        : request.payment?.method ?? "—";
  const details = request.details;
  const { data: linked } = useAsync(
    () =>
      request.linkedRecordId
        ? getBaptismalRecord(request.parishId, request.linkedRecordId)
        : Promise.resolve(undefined),
    [request.parishId, request.linkedRecordId]
  );


  const submitted = new Date(request.createdAt + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  function reject() {
    onReject?.(request);
    onClose();
  }

  async function revokeIssued() {
    if (!request.issuedCertificate || request.issuedCertificate.state !== "valid") return;
    const reason = await askText({
      title: "Revoke this certificate?",
      message: "Anyone who checks it will see it's no longer valid. This can't be undone.",
      label: "Reason for revoking",
      placeholder: "For example: issued with a wrong date",
      confirmLabel: "Revoke certificate",
      danger: true,
    });
    if (!reason) return;
    setPayError(null);
    try {
      await revokeIssuedCertificate(request.issuedCertificate.id, reason);
      onIssueComplete?.();
      onClose();
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Could not revoke this certificate.");
    }
  }
  async function recordPayment() {
    setPaying(true);
    setPayError(null);
    try {
      const updated = await confirmRequestPayment(request.id);
      onPaymentRecorded?.(updated);
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Could not record this payment.");
    } finally {
      setPaying(false);
    }
  }

  return (
    <>
      <AdminModalFrame
        onClose={onClose}
        align="center"
        layer="z-50"
        panelClassName="flex max-h-[90vh] max-w-[620px] flex-col overflow-hidden rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_8px_28px_-6px_rgba(10,40,30,0.15)]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-admin-border px-6 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="font-serif text-admin-section font-semibold text-admin-ink">Request {request.referenceNo}</h3>
              <AdminBadge tone={getAdminStatusTone(request)}>{deriveAdminStatusLabel(request)}</AdminBadge>
            </div>
            <p className="mt-0.5 text-admin-support text-admin-ink-muted">
              {sacramentLabels[request.sacramentType]} certificate · Submitted {submitted}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-admin-ink-muted hover:bg-admin-surface-alt"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-[18px]">
          <div className="mb-[18px] flex items-center gap-3.5 rounded-md border border-admin-green-100 bg-admin-green-050 px-4 py-3.5">
            <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-admin-green-700 font-serif text-admin-group font-semibold text-white">
              {initials(subjectName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-serif text-admin-group font-bold text-admin-green-900">{subjectName}</p>
              <p className="mt-0.5 text-admin-support text-admin-ink-muted">
                {request.purpose ?? "—"} · {copies} {copies > 1 ? "copies" : "copy"}
              </p>
            </div>
            <AdminDeliveryTag method={request.deliveryMethod} />
          </div>

          <div className="mb-3.5 rounded-md border border-admin-border px-4 py-1">
            <h4 className="mb-1 mt-3 font-sans text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">
              Request details
            </h4>
            <InfoRow label="Full name" value={details?.subjectName || subjectName} />
            <InfoRow label="Birthdate" value={details?.birthdate || "—"} />
            <InfoRow label="Birthplace" value={details?.birthplace || "—"} />
            <InfoRow label="Mother" value={details?.motherName || "—"} />
            <InfoRow label="Father" value={details?.fatherName || "—"} />
            <InfoRow label="Sponsor 1" value={details?.sponsor1 || "—"} />
            <InfoRow label="Sponsor 2" value={details?.sponsor2 || "—"} last />
          </div>

          <div className="mb-3.5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div className="rounded-md border border-admin-border p-4 px-[18px]">
              <h4 className="mb-3 font-sans text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">
                Sacramental record
              </h4>
              {linked ? (
                <Link
                  to={recordDetailPath(parish.slug, "baptismal", linked.id)}
                  onClick={onClose}
                  className="flex items-start gap-2.5 rounded-md outline-none hover:bg-admin-green-050 focus-visible:ring-2 focus-visible:ring-admin-green-600/30"
                >
                  <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-admin-green-100 text-admin-green-700">
                    <CheckIcon />
                  </span>
                  <div>
                    <p className="text-admin-body font-semibold text-admin-green-700 hover:underline">
                      {recordFullName(linked)}
                    </p>
                    <p className="mt-0.5 text-admin-label text-admin-ink-faint">
                      Baptismal record · Book {linked.bookNumber}, Page {linked.pageNumber}, Entry {linked.entryNumber}
                    </p>
                  </div>
                </Link>
              ) : (
                <div className="flex items-start gap-2.5">
                  <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-admin-surface-alt text-admin-ink-faint">
                    <AlertIcon />
                  </span>
                  <div>
                    <p className="text-admin-body font-semibold text-admin-ink-muted">Not linked yet</p>
                    <p className="mt-0.5 text-admin-label text-admin-ink-faint">
                      Use &quot;Find matching record&quot; to search and link one.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-md border border-admin-border p-4 px-[18px]">
              <h4 className="mb-3 font-sans text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">
                Payment
              </h4>
              <div className="grid grid-cols-2 gap-x-5 gap-y-3.5">
                <div>
                  <div className="text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">
                    Certificate fee (×{copies})
                  </div>
                  <div className="mt-0.5 text-admin-body text-admin-ink">₱{fee}.00</div>
                </div>
                <div>
                  <div className="text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">
                    Payment method
                  </div>
                  <div className="mt-0.5 text-admin-body text-admin-ink">{method}</div>
                </div>
              </div>
              {request.payment?.status === "paid" && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-admin-support text-admin-green-700">
                    Receipt {request.payment.receiptNumber || "issued"}
                    {request.issuedCertificate?.code ? ` · for certificate ${request.issuedCertificate.code}` : ""}
                    {request.payment.paidAt
                      ? ` · ${new Date(request.payment.paidAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}`
                      : ""}
                  </p>
                  <AdminButton variant="secondary" size="sm" onClick={() => setReceiptOpen(true)}>
                    Print receipt
                  </AdminButton>
                </div>
              )}
            </div>
          </div>

          {statusKey === "ready" && (
            <div className="inline-flex items-center gap-1.5 rounded-md border border-admin-green-100 bg-admin-green-050 px-2.5 py-1 text-xs font-semibold text-admin-green-700">
              <CheckIcon />
              Certificate printed and sealed — ready for parishioner pickup at the office.
            </div>
          )}

          {statusKey === "rejected" && (
            <div className="flex items-start gap-2.5 rounded-md border border-[#E3C3BC] bg-admin-red-100 px-3.5 py-3">
              <span className="mt-0.5 text-admin-red-700">
                <AlertIcon />
              </span>
              <div>
                <p className="mb-0.5 text-admin-body font-semibold text-admin-red-700">Request rejected</p>
                <p className="text-admin-body text-[#7A3C35]">
                  {request.rejectionReason || "Rejected by staff."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap justify-end gap-2.5 border-t border-admin-border px-6 py-4">
          {statusKey === "pending" && (
            <>
              {canReject && (
                <AdminButton variant="danger" onClick={reject}>
                  Reject request
                </AdminButton>
              )}
              <Link to={`${request.id}/find-record`} onClick={onClose}>
                <AdminButton>
                  <FileIcon />
                  Find matching record
                </AdminButton>
              </Link>
            </>
          )}

          {statusKey === "awaiting_payment" && (
            <>
              {canReject && (
                <AdminButton variant="danger" onClick={reject}>
                  Reject request
                </AdminButton>
              )}
              <AdminButton variant="secondary" onClick={recordPayment} disabled={paying}>
                <ClockIcon />
                {paying ? "Recording payment..." : "Record cash payment"}
              </AdminButton>
            </>
          )}
          {payError && <p className="mr-auto text-admin-body text-admin-red-700">{payError}</p>}

          {statusKey === "processing" && (
            <AdminButton onClick={() => setIssueOpen(true)}>
              <FileIcon />
              {request.deliveryMethod === "digital" ? "Issue certificate" : "Mark ready for pickup"}
            </AdminButton>
          )}

          {statusKey === "ready" && (
            <>
              <AdminButton variant="secondary" onClick={onClose}>
                Close
              </AdminButton>
              <AdminButton onClick={() => setReleaseOpen(true)}>
                <CheckIcon />
                Release certificate
              </AdminButton>
            </>
          )}

          {(statusKey === "released" || statusKey === "rejected") && (
            <>
              {statusKey === "released" && request.issuedCertificate?.state === "valid" && (
                <AdminButton variant="danger" onClick={revokeIssued}>
                  Revoke certificate
                </AdminButton>
              )}
              <AdminButton variant="secondary" onClick={onClose}>
                Close
              </AdminButton>
            </>
          )}
        </div>
      </AdminModalFrame>

      {issueOpen && (
        <AdminIssueCertificateModal
          request={request}
          parish={parish}
          onClose={() => setIssueOpen(false)}
          onComplete={() => {
            setIssueOpen(false);
            onIssueComplete?.();
            onClose();
          }}
        />
      )}

      {releaseOpen && (
        <AdminReleaseCertificateModal
          request={request}
          parish={parish}
          onClose={() => setReleaseOpen(false)}
          onComplete={() => {
            setReleaseOpen(false);
            onReleaseComplete?.();
            onClose();
          }}
        />
      )}

      {receiptOpen && request.payment?.status === "paid" && (
        <PrintReceiptDialog
          parish={parish}
          receipt={{
            title: "Payment Receipt",
            number: request.payment.receiptNumber || request.id.replace(/-/g, "").slice(0, 10).toUpperCase(),
            date: request.payment.paidAt ?? request.createdAt,
            amount: fee,
            forText: `${sacramentLabels[request.sacramentType]} certificate${copies > 1 ? ` × ${copies}` : ""}`,
            note:
              [
                request.details?.subjectName ? `Certificate of ${request.details.subjectName}` : "",
                request.issuedCertificate?.code ? `No. ${request.issuedCertificate.code}` : "",
              ]
                .filter(Boolean)
                .join(" · ") || undefined,
            method,
            receivedBy: request.payment.collectedBy,
          }}
          defaultReceivedFrom={request.origin === "walkin" ? "" : request.details?.subjectName ?? ""}
          onClose={() => setReceiptOpen(false)}
        />
      )}
    </>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 py-2.5 ${
        last ? "" : "border-b border-admin-border"
      }`}
    >
      <span className="shrink-0 text-admin-label text-admin-ink-muted">{label}</span>
      <span className="text-right text-admin-body font-semibold text-admin-ink">{value}</span>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3 w-3">
      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="8" x2="12" y2="12" strokeLinecap="round" />
      <line x1="12" y1="16" x2="12.01" y2="16" strokeLinecap="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15 14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
      <polyline points="14 3 14 8 19 8" strokeLinejoin="round" />
    </svg>
  );
}
