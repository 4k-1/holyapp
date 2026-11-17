import { useCertificateTestMode } from "@/lib/certificateMode";

/**
 * Watermark for a certificate that hasn't been issued yet. It prints with the page (styled in
 * parishCertificate.css, which goes into the print document), so a preview can't pass as a real copy.
 */
export function SpecimenMark() {
  return (
    <div className="cert-specimen" aria-label="Specimen, not valid">
      <span className="cert-specimen__text">
        SPECIMEN
        <small>NOT VALID</small>
      </span>
    </div>
  );
}

/**
 * The watermark a certificate page carries: SPECIMEN before it's issued, and TEST COPY on an
 * issued copy while HolyApp is being tested, so a test certificate can't pass as a real one.
 * Until the site says which it is, it leaves a hidden marker that printing and PDF saving wait on.
 */
export function CertificateMark({ specimen }: { specimen?: boolean }) {
  const testMode = useCertificateTestMode();
  if (specimen) return <SpecimenMark />;
  if (testMode === null) return <span className="cert-mode-pending" hidden />;
  if (!testMode) return null;
  return (
    <div className="cert-testmark" aria-label="Test copy, not valid. HolyApp is being tested.">
      <span className="cert-specimen__text">
        TEST COPY
        <small>NOT VALID · HOLYAPP TESTING</small>
      </span>
    </div>
  );
}
