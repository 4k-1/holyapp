import { useCallback, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { listCertificates } from "@/features/parishioner/certificates/api/certificatesApi";
import { CertificatePdfCapture } from "@/features/parishioner/certificates/CertificatePdfCapture";
import { saveCertificatePdf } from "@/features/parishioner/certificates/saveCertificatePdf";
import { useAsync } from "@/hooks/useAsync";
import { CertificateCard } from "@/features/parishioner/certificates/CertificateCard";
import { CertificateViewerModal } from "@/features/parishioner/certificates/CertificateViewerModal";
import type { IssuedCertificate, Parish } from "@/types";

export function CertificatesWalletPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const { data: certificates = [], loading } = useAsync(() => listCertificates(parish.id), [parish.id]);
  const [viewing, setViewing] = useState<IssuedCertificate | null>(null);
  const [saving, setSaving] = useState<IssuedCertificate | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const savingRef = useRef<IssuedCertificate | null>(null);

  function handleView(certificate: IssuedCertificate) {
    setViewing(certificate);
  }

  function handleDownload(certificate: IssuedCertificate) {
    if (savingRef.current) return;
    setDownloadError(null);
    savingRef.current = certificate;
    setSaving(certificate);
  }

  const handleSheetReady = useCallback((element: HTMLElement) => {
    const certificate = savingRef.current;
    if (!certificate) return;
    const filename = `${certificate.certCode || "certificate"}.pdf`;
    saveCertificatePdf(element, filename)
      .catch((err: unknown) => {
        setDownloadError(err instanceof Error ? err.message : "Could not download this certificate.");
      })
      .finally(() => {
        savingRef.current = null;
        setSaving(null);
      });
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="font-serif text-[26px] font-bold text-ink">My Certificate Wallet</h1>
      <p className="mb-6 mt-1.5 text-sm text-ink-muted">
        Every certificate released to you lives here. Download or view anytime — no need to request again.
      </p>
      {downloadError && <p className="mb-4 text-sm font-medium text-red-700">{downloadError}</p>}

      {loading ? (
        <p className="text-sm text-ink-muted">Loading your certificates…</p>
      ) : certificates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-sm text-ink-muted">
          No certificates yet. Once a request is released, it'll show up here.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
          {certificates.map((certificate) => (
            <CertificateCard
              key={certificate.id}
              certificate={certificate}
              onView={handleView}
              onDownload={handleDownload}
              downloading={saving?.id === certificate.id}
            />
          ))}
        </div>
      )}

      {viewing && (
        <CertificateViewerModal certificate={viewing} parish={parish} onClose={() => setViewing(null)} />
      )}
      {saving && <CertificatePdfCapture certificate={saving} parish={parish} onReady={handleSheetReady} />}
    </div>
  );
}