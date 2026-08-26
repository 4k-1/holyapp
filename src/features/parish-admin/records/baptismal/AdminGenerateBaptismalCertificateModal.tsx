import { useRef, useState } from "react";
import { AdminDialog, AdminDialogFooter, AdminDialogHeader } from "@/features/parish-admin/components/AdminDialog";
import { AdminButton, PrintIcon } from "@/features/parish-admin/components/AdminForm";
import {
  CertificateDocument,
  CertificatePreviewStage,
  sacramentCertTitles,
} from "@/features/parish-admin/components/CertificateDocument";
import { CERT_PREVIEW_STAGE_BG } from "@/features/parish-admin/components/certificate/constants";
import { printElement } from "@/features/parish-admin/requests/printUtils";
import { generateBaptismalCertificate } from "@/features/parish-admin/records/api/baptismalRecordsApi";
import { baptismCertificateFields, recordFullName } from "@/features/parish-admin/records/baptismalHelpers";
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
  const fields = baptismCertificateFields(record, { certCode: liveCode });

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
    <AdminDialog onClose={onClose} busy={issuing} panelClassName="max-w-[720px]">
      <AdminDialogHeader
        title={title}
        subtitle={`${name}${liveCode ? ` · ${liveCode}` : " · Preview — not yet recorded as issued"}`}
        onClose={onClose}
        busy={issuing}
      />

      <div className="overflow-hidden px-4 py-3" style={{ background: CERT_PREVIEW_STAGE_BG }}>
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

      <AdminDialogFooter className="flex-wrap">
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
      </AdminDialogFooter>
    </AdminDialog>
  );
}
