import { useRef, useState } from "react";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { AdminButton, PrintIcon } from "@/features/parish-admin/components/AdminForm";
import { AdminDeliveryTag } from "@/features/parish-admin/components/AdminDeliveryTag";
import {
  CertificateDocument,
  CertificatePreviewStage,
  type CertificateFields,
} from "@/features/parish-admin/components/CertificateDocument";
import { CERT_PREVIEW_STAGE_BG, sacramentCertTitles } from "@/features/parish-admin/components/certificate/constants";
import { getRequestCopyCount } from "@/features/parish-admin/requests/adminRequestHelpers";
import { printElement } from "@/features/parish-admin/requests/printUtils";
import {
  issueCertificate,
  markReadyForPickup,
} from "@/features/parish-admin/requests/api/requestsAdminApi";
import { getBaptismalRecord } from "@/features/parish-admin/records/api/baptismalRecordsApi";
import { baptismCertificateFields, recordFullName } from "@/features/parish-admin/records/baptismalHelpers";
import { getCertificateAppearance } from "@/features/parish-admin/settings/api/certificateConfigApi";
import { useAsync } from "@/hooks/useAsync";
import type { CertificateRequest, Parish } from "@/types";
import { AdminModalFrame } from "@/features/parish-admin/components/AdminModalFrame";

interface AdminIssueCertificateModalProps {
  request: CertificateRequest;
  parish: Parish;
  onClose: () => void;
  onComplete: () => void;
}

export function AdminIssueCertificateModal({
  request,
  parish,
  onClose,
  onComplete,
}: AdminIssueCertificateModalProps) {
  const isDigital = request.deliveryMethod === "digital";
  const copies = getRequestCopyCount(request);
  const subjectName = request.details?.subjectName ?? request.requesterId;
  const printRef = useRef<HTMLDivElement>(null);

  const { data: linked, loading } = useAsync(
    () =>
      request.linkedRecordId
        ? getBaptismalRecord(request.parishId, request.linkedRecordId)
        : Promise.resolve(undefined),
    [request.parishId, request.linkedRecordId]
  );

  const { data: appearance } = useAsync(
    () => getCertificateAppearance(request.sacramentType),
    [request.sacramentType]
  );

  const [verified, setVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [certCode, setCertCode] = useState("");
  const [verifyUrl, setVerifyUrl] = useState("");
  const [issueError, setIssueError] = useState<string | null>(null);


  async function handleConfirm() {
    if (!verified || !linked) return;
    setSubmitting(true);
    setIssueError(null);
    try {
      const result = isDigital
        ? await issueCertificate(request.id)
        : await markReadyForPickup(request.id);
      setCertCode(result.certificateCode);
      setVerifyUrl(result.verifyUrl);
      setDone(true);
    } catch (err) {
      setIssueError(err instanceof Error ? err.message : "Could not issue this certificate.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleDone() {
    onComplete();
    onClose();
  }

  function handlePrintCertificate() {
    if (!printRef.current) return;
    printElement(printRef.current, `${sacramentCertTitles[request.sacramentType]} — ${request.referenceNo}`);
  }

  const previewName = linked ? recordFullName(linked) : subjectName;
  const baseFields: CertificateFields = linked
    ? baptismCertificateFields(linked, { requestId: request.referenceNo, certCode: certCode || undefined })
    : {
        requestId: request.referenceNo,
        registerRef: "—",
        birthdate: request.details?.birthdate ?? "—",
        birthplace: request.details?.birthplace ?? "—",
        baptismDate: request.details?.baptismDate ?? "—",
        motherName: request.details?.motherName ?? "—",
        fatherName: request.details?.fatherName ?? "—",
        certCode: certCode || undefined,
      };
  const fields: CertificateFields = {
    ...baseFields,
    certCode: certCode || baseFields.certCode,
    verifyUrl: verifyUrl || undefined,
  };

  return (
    <AdminModalFrame
      onClose={onClose}
      busy={submitting}
      panelClassName="flex max-h-[92vh] max-w-[760px] flex-col overflow-hidden rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_12px_40px_-6px_rgba(10,40,30,0.25)]"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-admin-border px-6 py-4">
        <div>
          <h3 className="font-serif text-admin-section font-semibold text-admin-ink">
            {done
              ? isDigital
                ? "Certificate issued"
                : "Ready for pickup"
              : isDigital
                ? "Issue certificate"
                : "Mark ready for pickup"}
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
        ) : !linked ? (
          <div className="rounded-[10px] border border-admin-gold-700/30 bg-admin-gold-700/10 px-4 py-3.5 text-admin-body text-admin-gold-700">
            This request has no linked sacramental record. Link a record before issuing a certificate.
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <AdminDeliveryTag method={request.deliveryMethod} />
              <AdminBadge tone="green">Paid</AdminBadge>
              <span className="text-admin-support text-admin-ink-muted">
                {copies} {copies > 1 ? "copies" : "copy"} · {request.purpose ?? "General purpose"}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_240px]">
              {/* Certificate */}
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h4 className="font-sans text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">
                    Certificate preview
                  </h4>
                  {!isDigital && (
                    <AdminButton variant="ghost" size="sm" className="py-0.5" onClick={handlePrintCertificate}>
                      <PrintIcon />
                      Print certificate
                    </AdminButton>
                  )}
                </div>
                <div
                  className="relative h-[min(70vh,560px)] overflow-hidden rounded-[10px]"
                  style={{ background: CERT_PREVIEW_STAGE_BG }}
                >
                  <CertificatePreviewStage>
                    <CertificateDocument
                      ref={printRef}
                      parish={parish}
                      sacramentType={request.sacramentType}
                      subjectName={previewName}
                      fields={fields}
                      appearance={appearance}
                    />
                  </CertificatePreviewStage>
                </div>
              </div>

              {/* Right column: checklist (pre-done) or success state */}
              <div>
                {done ? (
                  <SuccessPanel
                    isDigital={isDigital}
                    subjectName={previewName}
                    certCode={certCode}
                    copies={copies}
                    onPrint={!isDigital ? handlePrintCertificate : undefined}
                  />
                ) : (
                  <div className="rounded-[10px] border border-admin-border bg-admin-surface-alt p-4">
                    <h4 className="mb-3 font-sans text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">
                      Register data
                    </h4>
                    <VerifyRow label="Name" value={previewName} />
                    <VerifyRow label="Birthdate" value={fields.birthdate ?? "—"} />
                    <VerifyRow label="Birthplace" value={fields.birthplace ?? "—"} />
                    {request.sacramentType === "baptism" && (
                      <VerifyRow label="Baptism date" value={fields.baptismDate ?? "—"} />
                    )}
                    <VerifyRow label="Mother" value={fields.motherName ?? "—"} />
                    <VerifyRow label="Father" value={fields.fatherName ?? "—"} />
                    <VerifyRow label="Register ref" value={fields.registerRef ?? "—"} last />
                  </div>
                )}
              </div>
            </div>

            {!done && (
              <>
                <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-[10px] border border-admin-border bg-admin-surface-alt px-3.5 py-3">
                  <input
                    type="checkbox"
                    checked={verified}
                    onChange={(e) => setVerified(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-admin-border-strong accent-admin-green-700"
                  />
                  <span className="text-admin-body leading-relaxed text-admin-ink">
                    {isDigital
                      ? "I have verified that the certificate information matches the parish register. Issue to the parishioner's digital wallet."
                      : "I confirm the certificate information matches the parish register. Mark this request ready for parishioner pickup."}
                  </span>
                </label>

                {!isDigital && (
                  <p className="mt-2 text-admin-support text-admin-ink-muted">
                    Once marked ready, you can print the certificate above and have it signed and sealed for pickup.
                  </p>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-admin-border px-6 py-4">
        {issueError && <p className="mr-auto text-admin-body text-admin-red-700">{issueError}</p>}
        {done ? (
          <>
            {!isDigital && (
              <AdminButton variant="secondary" onClick={handlePrintCertificate}>
                <PrintIcon />
                Print certificate
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
            <AdminButton onClick={handleConfirm} disabled={!verified || !linked || submitting}>
              {submitting ? (
                "Processing…"
              ) : isDigital ? (
                <>
                  <FileIcon />
                  Issue to wallet
                </>
              ) : (
                <>
                  <CheckIcon />
                  Mark ready for pickup
                </>
              )}
            </AdminButton>
          </>
        )}
      </div>
    </AdminModalFrame>
  );
}

function VerifyRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`py-2 ${last ? "" : "border-b border-admin-border"}`}>
      <p className="text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-faint">{label}</p>
      <p className="mt-0.5 text-admin-support font-medium text-admin-ink">{value}</p>
    </div>
  );
}

function SuccessPanel({
  isDigital,
  subjectName,
  certCode,
  copies,
  onPrint,
}: {
  isDigital: boolean;
  subjectName: string;
  certCode: string;
  copies: number;
  onPrint?: () => void;
}) {
  return (
    <div className="rounded-[10px] border border-admin-border bg-admin-surface-alt p-4 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-admin-green-100 text-admin-green-700">
        <CheckIcon className="h-5 w-5" />
      </div>
      <h4 className="font-serif text-admin-group font-semibold text-admin-ink">
        {isDigital ? "Certificate issued" : "Marked ready for pickup"}
      </h4>
      <p className="mx-auto mt-2 text-admin-body leading-relaxed text-admin-ink-muted">
        {isDigital ? (
          <>
            <span className="font-semibold text-admin-ink">{subjectName}</span>&apos;s certificate
            {copies > 1 ? ` (${copies} copies)` : ""} is now in their digital wallet.
          </>
        ) : (
          <>
            <span className="font-semibold text-admin-ink">{subjectName}</span>&apos;s certificate
            {copies > 1 ? ` (${copies} copies)` : ""} is ready. Print it now for signing and sealing.
          </>
        )}
      </p>
      {isDigital && certCode && (
        <p className="mt-3 font-mono text-admin-label text-admin-ink-faint">Verification code: {certCode}</p>
      )}
      {onPrint && (
        <AdminButton variant="secondary" className="mt-4 w-full justify-center" onClick={onPrint}>
          <PrintIcon />
          Print certificate
        </AdminButton>
      )}
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

function FileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
      <polyline points="14 3 14 8 19 8" strokeLinejoin="round" />
    </svg>
  );
}
