import { useRef, useState } from "react";
import { AdminDialog, AdminDialogFooter, AdminDialogHeader } from "@/features/parish-admin/components/AdminDialog";
import { AdminButton, PrintIcon } from "@/features/parish-admin/components/AdminForm";
import {
  CertificateDocument,
  CertificatePreviewStage,
  type CertificateFields,
} from "@/features/parish-admin/components/CertificateDocument";
import { CERT_PREVIEW_STAGE_BG, sacramentCertTitles } from "@/features/parish-admin/components/certificate/constants";
import { printElement, waitForQrCode } from "@/features/parish-admin/requests/printUtils";
import { getCertificateAppearance } from "@/features/parish-admin/settings/api/certificateConfigApi";
import { useAsync } from "@/hooks/useAsync";
import type { IssuedRecordCertificate } from "@/features/parish-admin/records/types";
import type { Parish, SacramentType } from "@/types";

interface AdminGenerateCertificateModalProps {
  parish: Parish;
  sacramentType: SacramentType;
  subjectName: string;
  fields: CertificateFields;
  issued?: IssuedRecordCertificate;
  onClose: () => void;
  onIssue: () => Promise<{ certificates: IssuedRecordCertificate[] }>;
  onIssued?: (cert: IssuedRecordCertificate) => void;
}

export function AdminGenerateCertificateModal({
  parish,
  sacramentType,
  subjectName,
  fields,
  issued,
  onClose,
  onIssue,
  onIssued,
}: AdminGenerateCertificateModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const { data: appearance, loading } = useAsync(() => getCertificateAppearance(sacramentType), [sacramentType]);
  const [issuing, setIssuing] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState("");
  const [issuedCert, setIssuedCert] = useState<IssuedRecordCertificate | undefined>(issued);
  const [justIssued, setJustIssued] = useState(false);

  const title = sacramentCertTitles[sacramentType];
  const printable = issuedCert?.status === "Valid";
  // Anything that isn't a valid issued copy prints only as a watermarked specimen.
  const specimen = !printable;
  const busy = issuing || printing;
  const previewFields: CertificateFields = {
    ...fields,
    certCode: issuedCert?.code ?? fields.certCode,
    verifyUrl: printable ? (issuedCert?.verifyUrl ?? fields.verifyUrl) : undefined,
    issuedOn: issuedCert?.date ?? fields.issuedOn,
    specimen,
  };

  /** `issuedCopy`: wait for the copy's QR code (and the redraw without the watermark) before printing. */
  async function print(issuedCopy: boolean) {
    setPrinting(true);
    try {
      if (issuedCopy) await waitForQrCode(() => printRef.current);
      if (printRef.current) printElement(printRef.current, `${title} — ${subjectName}`);
    } finally {
      setPrinting(false);
    }
  }

  /** Records the copy on the server first; only a recorded copy (with its code and QR) is printed. */
  async function handleIssueAndPrint() {
    setIssuing(true);
    setError("");
    let newest: IssuedRecordCertificate | undefined;
    try {
      const next = await onIssue();
      newest = next.certificates.find((c) => c.status === "Valid") ?? next.certificates.at(-1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't issue this copy. Nothing was printed.");
    } finally {
      setIssuing(false);
    }
    if (!newest) return;
    setIssuedCert(newest);
    setJustIssued(true);
    onIssued?.(newest);
    if (newest.status === "Valid") await print(true);
  }

  const subtitle = issuedCert
    ? `${subjectName} · ${issuedCert.code}${printable ? "" : ` · ${issuedCert.status}`}`
    : `${subjectName} · Preview — not yet issued`;

  const note = !issuedCert
    ? "Issue & print records this copy and gives it its code and QR, then prints it. A preview prints marked SPECIMEN – NOT VALID."
    : !printable
      ? `This copy is ${issuedCert.status.toLowerCase()} and can't be printed. Issue a new copy from the record instead.`
      : justIssued
        ? `Issued as ${issuedCert.code}. If the printout failed, use Reprint: it prints this same copy and isn't counted again.`
        : "Reprint prints this same copy with the same code. It isn't counted as a new copy.";

  return (
    <AdminDialog onClose={onClose} busy={busy} panelClassName="max-w-[720px]">
      <AdminDialogHeader title={title} subtitle={subtitle} onClose={onClose} busy={busy} />

      <div className="overflow-hidden px-4 py-3" style={{ background: CERT_PREVIEW_STAGE_BG }}>
        {loading ? (
          <p className="text-admin-body text-admin-ink-muted">Loading certificate template…</p>
        ) : (
          <CertificatePreviewStage>
            <CertificateDocument
              ref={printRef}
              parish={parish}
              sacramentType={sacramentType}
              subjectName={subjectName}
              fields={previewFields}
              appearance={appearance}
            />
          </CertificatePreviewStage>
        )}
      </div>

      <AdminDialogFooter className="flex-wrap">
        <p className={`w-full text-admin-support ${error ? "font-semibold text-red-700" : "text-admin-ink-muted"}`}>
          {error || note}
        </p>
        <AdminButton variant="secondary" onClick={onClose} disabled={busy}>
          Close
        </AdminButton>
        {!issuedCert && (
          <>
            <AdminButton variant="secondary" onClick={() => print(false)} disabled={loading || busy}>
              <PrintIcon />
              Print preview
            </AdminButton>
            <AdminButton onClick={handleIssueAndPrint} disabled={loading || busy}>
              <PrintIcon />
              {issuing ? "Issuing…" : "Issue & print"}
            </AdminButton>
          </>
        )}
        {printable && (
          <AdminButton onClick={() => print(true)} disabled={loading || busy}>
            <PrintIcon />
            {printing ? "Preparing…" : "Reprint"}
          </AdminButton>
        )}
      </AdminDialogFooter>
    </AdminDialog>
  );
}
