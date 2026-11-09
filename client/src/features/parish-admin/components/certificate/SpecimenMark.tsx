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
