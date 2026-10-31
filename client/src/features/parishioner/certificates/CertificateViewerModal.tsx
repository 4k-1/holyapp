import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { AdminModalFrame } from "@/features/parish-admin/components/AdminModalFrame";
import {
  CertificateDocument,
  CertificatePreviewStage,
} from "@/features/parish-admin/components/CertificateDocument";
import { sacramentCertTitles } from "@/features/parish-admin/components/certificate/constants";
import { printElement } from "@/features/parish-admin/requests/printUtils";
import { getCertificateAppearance } from "@/features/parish-admin/settings/api/certificateConfigApi";
import { useAsync } from "@/hooks/useAsync";
import type { IssuedCertificate, Parish } from "@/types";

interface CertificateViewerModalProps {
  certificate: IssuedCertificate;
  parish: Parish;
  onClose: () => void;
}

/** Read-only preview of a wallet certificate, reusing the same render used to issue it. */
export function CertificateViewerModal({ certificate, parish, onClose }: CertificateViewerModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { data: appearance, loading } = useAsync(
    () => getCertificateAppearance(certificate.sacramentType),
    [certificate.sacramentType]
  );

  const title = sacramentCertTitles[certificate.sacramentType];

  function handlePrint() {
    if (!printRef.current) return;
    printElement(printRef.current, `${title} — ${certificate.holderName}`);
  }

  return (
    <AdminModalFrame
      onClose={onClose}
      panelClassName="flex max-h-[92vh] max-w-[640px] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
    >
      <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h3 className="font-serif text-lg font-bold text-ink">{title}</h3>
          <p className="mt-0.5 text-xs text-ink-muted">
            {certificate.holderName}
            {certificate.certCode ? ` · ${certificate.certCode}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-alt"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {certificate.state === "invalid" && (
        <p className="border-b border-[#c9a4a0] bg-[#f8eeec] px-5 py-2.5 text-sm font-medium text-[#7A3C35]">
          This certificate has been revoked and is no longer valid.
        </p>
      )}

      <div className="overflow-y-auto overflow-x-hidden bg-[#ececec] px-4 py-5">
        {loading ? (
          <p className="text-sm text-ink-muted">Loading certificate…</p>
        ) : (
          <CertificatePreviewStage>
            <CertificateDocument
              ref={printRef}
              parish={parish}
              sacramentType={certificate.sacramentType}
              subjectName={certificate.holderName}
              fields={{ ...certificate.fields, certCode: certificate.certCode }}
              appearance={appearance}
            />
          </CertificatePreviewStage>
        )}
      </div>

      <div className="flex justify-end gap-2.5 border-t border-border px-5 py-4">
        <Button variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
        <Button variant="primary" size="sm" onClick={handlePrint} disabled={loading}>
          Print
        </Button>
      </div>
    </AdminModalFrame>
  );
}
