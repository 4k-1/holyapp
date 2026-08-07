import { useEffect } from "react";
import { Link } from "react-router-dom";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import { AdminDeliveryTag } from "@/features/parish-admin/components/AdminDeliveryTag";
import {
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
import type { CertificateRequest, SacramentType } from "@/types";

const sacramentLabels: Record<SacramentType, string> = {
  baptism: "Baptismal",
  confirmation: "Confirmation",
  marriage: "Marriage",
  death: "Death",
};

interface AdminRequestDetailModalProps {
  request: CertificateRequest;
  onClose: () => void;
  onReject?: (request: CertificateRequest) => void;
}

export function AdminRequestDetailModal({ request, onClose, onReject }: AdminRequestDetailModalProps) {
  const statusKey = deriveStatusKey(request);
  const subjectName = request.details?.subjectName ?? request.requesterId;
  const copies = getRequestCopyCount(request);
  const fee = request.payment?.amount ?? 100 * copies;
  const method = request.payment?.method ?? "—";
  const details = request.details;
  const { data: linked } = useAsync(
    () =>
      request.linkedRecordId
        ? getBaptismalRecord(request.parishId, request.linkedRecordId)
        : Promise.resolve(undefined),
    [request.parishId, request.linkedRecordId]
  );

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const submitted = new Date(request.createdAt + "T00:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  function reject() {
    onReject?.(request);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-[620px] flex-col overflow-hidden rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_8px_28px_-6px_rgba(10,40,30,0.15)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-admin-border px-6 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="font-serif text-lg font-semibold text-admin-ink">Request {request.id}</h3>
              <AdminBadge tone={getAdminStatusTone(request)}>{deriveAdminStatusLabel(request)}</AdminBadge>
            </div>
            <p className="mt-0.5 text-[12.5px] text-admin-ink-muted">
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
          <div className="mb-[18px] flex items-center gap-3.5 rounded-[10px] border border-admin-green-100 bg-admin-green-050 px-4 py-3.5">
            <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-admin-green-700 font-serif text-[15px] font-semibold text-white">
              {initials(subjectName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-serif text-[15px] font-bold text-admin-green-900">{subjectName}</p>
              <p className="mt-0.5 text-[12.5px] text-admin-ink-muted">
                {request.purpose ?? "—"} · {copies} {copies > 1 ? "copies" : "copy"}
              </p>
            </div>
            <AdminDeliveryTag method={request.deliveryMethod} />
          </div>

          <div className="mb-3.5 rounded-[10px] border border-admin-border px-4 py-1">
            <h4 className="mb-1 mt-3 font-sans text-[11.5px] font-semibold uppercase tracking-[0.6px] text-admin-ink-muted">
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
            <div className="rounded-[10px] border border-admin-border p-4 px-[18px]">
              <h4 className="mb-3 font-sans text-[11.5px] font-semibold uppercase tracking-[0.6px] text-admin-ink-muted">
                Sacramental record
              </h4>
              {linked ? (
                <div className="flex items-start gap-2.5">
                  <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-admin-green-100 text-admin-green-700">
                    <CheckIcon />
                  </span>
                  <div>
                    <p className="text-[13.5px] font-semibold text-admin-ink">{recordFullName(linked)}</p>
                    <p className="mt-0.5 text-[11.5px] text-admin-ink-faint">
                      Baptismal record · Book {linked.book}, Page {linked.page}, Line {linked.line || "—"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2.5">
                  <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-admin-surface-alt text-admin-ink-faint">
                    <AlertIcon />
                  </span>
                  <div>
                    <p className="text-[13.5px] font-semibold text-admin-ink-muted">Not linked yet</p>
                    <p className="mt-0.5 text-[11.5px] text-admin-ink-faint">
                      Use &quot;Find matching record&quot; to search and link one.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-[10px] border border-admin-border p-4 px-[18px]">
              <h4 className="mb-3 font-sans text-[11.5px] font-semibold uppercase tracking-[0.6px] text-admin-ink-muted">
                Payment
              </h4>
              <div className="grid grid-cols-2 gap-x-5 gap-y-3.5">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.4px] text-admin-ink-muted">
                    Certificate fee (×{copies})
                  </div>
                  <div className="mt-0.5 text-sm text-admin-ink">₱{fee}.00</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.4px] text-admin-ink-muted">
                    Payment method
                  </div>
                  <div className="mt-0.5 text-sm text-admin-ink">{method}</div>
                </div>
              </div>
            </div>
          </div>

          {statusKey === "ready" && (
            <div className="inline-flex items-center gap-1.5 rounded-[7px] border border-admin-green-100 bg-admin-green-050 px-2.5 py-1 text-xs font-semibold text-admin-green-700">
              <CheckIcon />
              Certificate printed and sealed — ready for parishioner pickup at the office.
            </div>
          )}

          {statusKey === "rejected" && (
            <div className="flex items-start gap-2.5 rounded-[9px] border border-[#E3C3BC] bg-admin-red-100 px-3.5 py-3">
              <span className="mt-0.5 text-admin-red-700">
                <AlertIcon />
              </span>
              <div>
                <p className="mb-0.5 text-[13px] font-semibold text-admin-red-700">Request rejected</p>
                <p className="text-[13px] text-[#7A3C35]">
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
              <AdminButton variant="danger" onClick={reject}>
                Reject request
              </AdminButton>
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
              <AdminButton variant="danger" onClick={reject}>
                Reject request
              </AdminButton>
              <AdminButton variant="secondary" disabled>
                <ClockIcon />
                Awaiting payment
              </AdminButton>
            </>
          )}

          {statusKey === "processing" && (
            <>
              <AdminButton variant="danger" onClick={reject}>
                Reject request
              </AdminButton>
              <AdminButton onClick={() => console.info("[mock] issue certificate", request.id)}>
                <FileIcon />
                Issue certificate
              </AdminButton>
            </>
          )}

          {statusKey === "ready" && (
            <>
              <AdminButton variant="secondary" onClick={onClose}>
                Close
              </AdminButton>
              <AdminButton onClick={() => console.info("[mock] release pickup", request.id)}>
                <CheckIcon />
                Release certificate
              </AdminButton>
            </>
          )}

          {(statusKey === "released" || statusKey === "rejected") && (
            <AdminButton variant="secondary" onClick={onClose}>
              Close
            </AdminButton>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 py-2.5 ${
        last ? "" : "border-b border-admin-border"
      }`}
    >
      <span className="shrink-0 text-xs text-admin-ink-muted">{label}</span>
      <span className="text-right text-[13.5px] font-semibold text-admin-ink">{value}</span>
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
