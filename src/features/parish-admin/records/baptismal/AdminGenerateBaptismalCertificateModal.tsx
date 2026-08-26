import { useEffect, useRef, useState } from "react";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import {
  CertificateDocument,
  CertificatePreviewStage,
  sacramentCertTitles,
  type CertificateFields,
} from "@/features/parish-admin/components/CertificateDocument";
import { printElement } from "@/features/parish-admin/requests/printUtils";
import { generateBaptismalCertificate } from "@/features/parish-admin/records/api/baptismalRecordsApi";
import {
  baptismCertificateDisplayRef,
  baptismCertificateNotations,
  formatRecordDate,
  recordFatherName,
  recordFullName,
  recordMotherName,
} from "@/features/parish-admin/records/baptismalHelpers";
import { getCertificateAppearance } from "@/features/parish-admin/settings/api/certificateConfigApi";
import { useAsync } from "@/hooks/useAsync";
import type { BaptismalRecord, IssuedRecordCertificate } from "@/features/parish-admin/records/types";
import type { Parish } from "@/types";

interface AdminGenerateBaptismalCertificateModalProps {
  parish: Parish;
  record: BaptismalRecord;
  issued?: IssuedRecordCertificate;
  onClose: () => void;
  onIssued?: (cert: IssuedRecordCertificate) => void;
}

export function AdminGenerateBaptismalCertificateModal({
  parish,
  record,
  issued,
  onClose,
  onIssued,
}: AdminGenerateBaptismalCertificateModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { data: appearance, loading } = useAsync(() => getCertificateAppearance("baptism"), []);
  const [issuing, setIssuing] = useState(false);
  const [issuedCert, setIssuedCert] = useState<IssuedRecordCertificate | undefined>(issued);

  const name = recordFullName(record);
  const title = sacramentCertTitles.baptism;
  const liveCode = issuedCert?.code;

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && !issuing) onClose();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, issuing]);

  const fields: CertificateFields = {
    requestId: record.id,
    registerRef: baptismCertificateDisplayRef(record),
    birthdate: formatRecordDate(record.dateOfBirth),
    birthplace: record.placeOfBirth ?? "—",
    baptismDate: formatRecordDate(record.dateOfBaptism),
    motherName: recordMotherName(record),
    fatherName: recordFatherName(record),
    certCode: liveCode,
    notations: baptismCertificateNotations(record.annotations ?? []),
  };

  function handlePrint() {
    if (!printRef.current) return;
    printElement(printRef.current, `${title} — ${name}`);
  }

  async function handleIssue() {
    setIssuing(true);
    try {
      const next = await generateBaptismalCertificate(parish.id, record.id);
      const newest = next.certificates.find((c) => c.status === "Valid") ?? next.certificates.at(-1);
      if (!newest) return;
      setIssuedCert(newest);
      onIssued?.(newest);
    } finally {
      setIssuing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/45" onClick={issuing ? undefined : onClose} aria-hidden="true" />
      <div
        data-cert-preview-panel
        className="relative z-10 flex max-h-[min(92dvh,840px)] w-full max-w-[720px] flex-col overflow-hidden rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_12px_40px_-6px_rgba(10,40,30,0.25)]"
      >
        <div
          data-cert-preview-header
          className="flex shrink-0 items-start justify-between gap-3 border-b border-admin-border px-5 py-3"
        >
          <div>
            <h3 className="font-serif text-admin-section font-semibold text-admin-ink">{title}</h3>
            <p className="mt-0.5 text-admin-support text-admin-ink-muted">
              {name}
              {liveCode ? ` · ${liveCode}` : " · Preview — not yet recorded as issued"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={issuing}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-admin-ink-muted hover:bg-admin-surface-alt disabled:opacity-50"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="overflow-hidden bg-[#d8d3c4] px-4 py-3">
          {loading ? (
            <p className="text-admin-body text-admin-ink-muted">Loading certificate template…</p>
          ) : (
            <CertificatePreviewStage>
              <CertificateDocument
                ref={printRef}
                parish={parish}
                sacramentType="baptism"
                subjectName={name}
                fields={fields}
                appearance={appearance}
              />
            </CertificatePreviewStage>
          )}
        </div>

        <div
          data-cert-preview-footer
          className="flex shrink-0 flex-wrap justify-end gap-2.5 border-t border-admin-border px-5 py-3"
        >
          <AdminButton variant="secondary" onClick={onClose} disabled={issuing}>
            Close
          </AdminButton>
          <AdminButton variant="secondary" onClick={handlePrint} disabled={loading || issuing}>
            <PrintIcon />
            Print
          </AdminButton>
          {!issuedCert && (
            <AdminButton onClick={handleIssue} disabled={loading || issuing}>
              {issuing ? "Issuing…" : "Issue this copy"}
            </AdminButton>
          )}
        </div>
      </div>
    </div>
  );
}

function PrintIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
      <path d="M6 9V3h12v6" strokeLinejoin="round" />
      <rect x="6" y="13" width="12" height="8" rx="1" />
      <path d="M6 17H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" strokeLinejoin="round" />
    </svg>
  );
}
