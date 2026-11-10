import { forwardRef, useRef, useState } from "react";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { AdminButton, AdminField, AdminInput, PrintIcon } from "@/features/parish-admin/components/AdminForm";
import { AdminDeliveryTag } from "@/features/parish-admin/components/AdminDeliveryTag";
import { sacramentCertTitles } from "@/features/parish-admin/components/certificate/constants";
import { getRequestCopyCount } from "@/features/parish-admin/requests/adminRequestHelpers";
import { printElement } from "@/features/parish-admin/requests/printUtils";
import { releaseCertificate } from "@/features/parish-admin/requests/api/requestsAdminApi";
import { getBaptismalRecord } from "@/features/parish-admin/records/api/baptismalRecordsApi";
import { recordFullName } from "@/features/parish-admin/records/baptismalHelpers";
import { useAsync } from "@/hooks/useAsync";
import type { CertificateRequest, Parish } from "@/types";
import { AdminModalFrame } from "@/features/parish-admin/components/AdminModalFrame";

// TODO: re-enable pickup receipt printing later
const ENABLE_PRINT_RECEIPT = false;

interface AdminReleaseCertificateModalProps {
  request: CertificateRequest;
  parish: Parish;
  onClose: () => void;
  onComplete: () => void;
}

const PRIMARY = "var(--color-primary, #0d3d30)";
const ACCENT = "var(--color-accent, #c49a1a)";

export function AdminReleaseCertificateModal({
  request,
  parish,
  onClose,
  onComplete,
}: AdminReleaseCertificateModalProps) {
  const copies = getRequestCopyCount(request);
  const holderName = request.details?.subjectName ?? request.requesterId;
  const printRef = useRef<HTMLDivElement>(null);

  const { data: linked, loading } = useAsync(
    () =>
      request.linkedRecordId
        ? getBaptismalRecord(request.parishId, request.linkedRecordId)
        : Promise.resolve(undefined),
    [request.parishId, request.linkedRecordId]
  );

  const [releasedTo, setReleasedTo] = useState(holderName);
  const [validId, setValidId] = useState("");
  const [printOnRelease, setPrintOnRelease] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [releaseDate] = useState(() =>
    new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  );

  const registerName = linked ? recordFullName(linked) : holderName;
  const registerRef = linked
    ? `Book ${linked.bookNumber}, Page ${linked.pageNumber}, Entry ${linked.entryNumber}`
    : "—";


  function printReceipt() {
    if (!printRef.current) return;
    printElement(printRef.current, `Pickup Receipt — ${request.referenceNo}`);
  }

  async function handleRelease() {
    if (!confirmed || !releasedTo.trim()) return;
    setSubmitting(true);
    try {
      await releaseCertificate(request.id, {
        releasedTo: releasedTo.trim(),
        validId: validId.trim() || undefined,
      });
      setDone(true);
      if (ENABLE_PRINT_RECEIPT && printOnRelease) {
        setTimeout(printReceipt, 300);
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleDone() {
    onComplete();
    onClose();
  }

  return (
    <AdminModalFrame
      onClose={onClose}
      busy={submitting}
      panelClassName="flex max-h-[92vh] max-w-[640px] flex-col overflow-hidden rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_12px_40px_-6px_rgba(10,40,30,0.25)]"
    >
      <div className="flex items-start justify-between gap-3 border-b border-admin-border px-6 py-4">
        <div>
          <h3 className="font-serif text-admin-section font-semibold text-admin-ink">
            {done ? "Certificate released" : "Release certificate"}
          </h3>
          <p className="mt-0.5 text-admin-support text-admin-ink-muted">
            Request {request.referenceNo} · {sacramentCertTitles[request.sacramentType]}
          </p>
        </div>
        {!submitting && (
          <button
            type="button"
            onClick={done ? handleDone : onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-admin-ink-muted hover:bg-admin-surface-alt"
            aria-label="Close"
          >
            ✕
          </button>
        )}
      </div>

      <div className="overflow-y-auto px-6 py-5">
        {loading ? (
          <p className="text-admin-body text-admin-ink-muted">Loading record data…</p>
        ) : done ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-admin-green-100 text-admin-green-700">
              <CheckIcon className="h-6 w-6" />
            </div>
            <h4 className="font-serif text-admin-page font-semibold text-admin-ink">Certificate released</h4>
            <p className="mx-auto mt-2 max-w-sm text-admin-body leading-relaxed text-admin-ink-muted">
              {copies} {copies > 1 ? "copies" : "copy"} of{" "}
              <span className="font-semibold text-admin-ink">{registerName}</span>&apos;s certificate
              handed to <span className="font-semibold text-admin-ink">{releasedTo}</span>.
            </p>
            {ENABLE_PRINT_RECEIPT && !printOnRelease && (
              <AdminButton variant="secondary" className="mt-4" onClick={printReceipt}>
                <PrintIcon />
                Print pickup receipt
              </AdminButton>
            )}
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <AdminDeliveryTag method="pickup" />
              <AdminBadge tone="gold">Ready for pickup</AdminBadge>
              <span className="text-admin-support text-admin-ink-muted">
                {copies} {copies > 1 ? "copies" : "copy"} · {request.purpose ?? "General purpose"}
              </span>
            </div>

            <div className="mb-4 rounded-md border border-admin-green-100 bg-admin-green-050 px-4 py-3.5">
              <p className="text-admin-body font-semibold text-admin-green-900">{registerName}</p>
              <p className="mt-0.5 text-admin-support text-admin-ink-muted">
                {sacramentCertTitles[request.sacramentType]} · {registerRef}
              </p>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <AdminField label="Released to" className="mb-0">
                <AdminInput
                  value={releasedTo}
                  onChange={(e) => setReleasedTo(e.target.value)}
                  placeholder="Recipient full name"
                  required
                />
              </AdminField>
              <AdminField label="Valid ID presented" className="mb-0">
                <AdminInput
                  value={validId}
                  onChange={(e) => setValidId(e.target.value)}
                  placeholder="Optional — e.g. Driver's License"
                />
              </AdminField>
            </div>

            {ENABLE_PRINT_RECEIPT && (
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h4 className="font-sans text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">
                    Pickup receipt preview
                  </h4>
                  <AdminButton variant="ghost" size="sm" className="py-0.5" onClick={printReceipt}>
                    <PrintIcon />
                    Print preview
                  </AdminButton>
                </div>
                <PickupReceiptDocument
                  ref={printRef}
                  parish={parish}
                  requestId={request.referenceNo}
                  certTitle={sacramentCertTitles[request.sacramentType]}
                  holderName={registerName}
                  registerRef={registerRef}
                  copies={copies}
                  releasedTo={releasedTo || "—"}
                  validId={validId || "—"}
                  releaseDate={releaseDate}
                />
              </div>
            )}

            {ENABLE_PRINT_RECEIPT && (
              <label className="mb-3 flex cursor-pointer items-start gap-2.5 rounded-md border border-admin-border bg-admin-surface-alt px-3.5 py-3">
                <input
                  type="checkbox"
                  checked={printOnRelease}
                  onChange={(e) => setPrintOnRelease(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-admin-border-strong accent-admin-green-700"
                />
                <span className="text-admin-body leading-relaxed text-admin-ink">
                  Print pickup receipt when released (for parish records and recipient copy)
                </span>
              </label>
            )}

            <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-admin-border bg-admin-surface-alt px-3.5 py-3">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-admin-border-strong accent-admin-green-700"
              />
              <span className="text-admin-body leading-relaxed text-admin-ink">
                I confirm the certificate was physically handed to the recipient listed above.
              </span>
            </label>
          </>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2.5 border-t border-admin-border px-6 py-4">
        {done ? (
          <>
            {ENABLE_PRINT_RECEIPT && (
              <AdminButton variant="secondary" onClick={printReceipt}>
                <PrintIcon />
                Print again
              </AdminButton>
            )}
            <AdminButton onClick={handleDone}>
              <CheckIcon />
              Done
            </AdminButton>
          </>
        ) : (
          <>
            <AdminButton variant="secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </AdminButton>
            <AdminButton onClick={handleRelease} disabled={!confirmed || !releasedTo.trim() || submitting}>
              {submitting ? (
                "Releasing…"
              ) : (
                <>
                  <CheckIcon />
                  Release certificate
                </>
              )}
            </AdminButton>
          </>
        )}
      </div>
    </AdminModalFrame>
  );
}

const PickupReceiptDocument = forwardRef<
  HTMLDivElement,
  {
    parish: Parish;
    requestId: string;
    certTitle: string;
    holderName: string;
    registerRef: string;
    copies: number;
    releasedTo: string;
    validId: string;
    releaseDate: string;
  }
>(function PickupReceiptDocument(
  { parish, requestId, certTitle, holderName, registerRef, copies, releasedTo, validId, releaseDate },
  ref
) {
  return (
    <div
      ref={ref}
      style={{
        border: `1px solid ${ACCENT}`,
        borderRadius: 8,
        padding: "24px 28px",
        fontFamily: "Georgia, 'Times New Roman', serif",
        color: "#20261f",
        background: "#fdfcf8",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", color: PRIMARY }}>
          {parish.name}
        </p>
        {parish.address && <p style={{ margin: "4px 0 0", fontSize: 11, color: "#7a8580" }}>{parish.address}</p>}
      </div>

      <p
        style={{
          textAlign: "center",
          margin: "0 0 18px",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: ACCENT,
        }}
      >
        Pickup Receipt
      </p>

      <div style={{ textAlign: "center", padding: "14px 0", borderTop: "1px solid #ece7d8", borderBottom: "1px solid #ece7d8", marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{holderName}</p>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#7a8580" }}>{certTitle}</p>
      </div>

      <ReceiptRow label="Request no." value={requestId} />
      <ReceiptRow label="Register ref" value={registerRef} />
      <ReceiptRow label="Copies released" value={String(copies)} />
      <ReceiptRow label="Released to" value={releasedTo} />
      <ReceiptRow label="Valid ID" value={validId} />
      <ReceiptRow label="Release date" value={releaseDate} last />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 28 }}>
        <div style={{ borderTop: "1px solid #999", paddingTop: 6, textAlign: "center", fontSize: 10, color: "#7a8580" }}>
          Recipient signature
        </div>
        <div style={{ borderTop: "1px solid #999", paddingTop: 6, textAlign: "center", fontSize: 10, color: "#7a8580" }}>
          Parish staff
        </div>
      </div>

      <p style={{ marginTop: 18, textAlign: "center", fontSize: 9.5, color: "#a3a39a" }}>
        This receipt confirms handover of the certificate — it is not the certificate itself.
      </p>
    </div>
  );
});

function ReceiptRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "8px 0",
        borderBottom: last ? "none" : "1px solid #f0ede1",
        fontSize: 12.5,
      }}
    >
      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase", color: "#a3a39a" }}>
        {label}
      </span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function CheckIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
