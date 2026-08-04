import { useOutletContext } from "react-router-dom";
import { MOCK_CERTIFICATES } from "@/services/mocks/certificates.mock";
import { CertificateCard } from "@/features/parishioner/certificates/CertificateCard";
import type { IssuedCertificate, Parish } from "@/types";

export function CertificatesWalletPage() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const certificates = MOCK_CERTIFICATES.filter((c) => c.parishId === parish.id);

  function handleView(certificate: IssuedCertificate) {
    console.info("View certificate", certificate.id);
    // TODO: open certificate viewer / PDF preview
  }

  function handleDownload(certificate: IssuedCertificate) {
    console.info("Download certificate", certificate.id);
    // TODO: trigger actual file download once backend exists
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="font-serif text-[26px] font-bold text-ink">My Certificate Wallet</h1>
      <p className="mb-6 mt-1.5 text-sm text-ink-muted">
        Every certificate released to you lives here. Download or view anytime — no need to request again.
      </p>

      {certificates.length === 0 ? (
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
            />
          ))}
        </div>
      )}
    </div>
  );
}