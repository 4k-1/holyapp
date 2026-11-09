import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { CertificateVerification } from "./certificateData";
import { present, shortHash, verifyUrl } from "./certificateFormat";

/**
 * The QR verification area: the QR code (a "QR CODE" placeholder while previewing) with the
 * Certificate No. and the start of the hash beside it. Styled by parishCertificate.css.
 */
/** "2027-05-09" → "9 May 2027". */
function longDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export function VerificationArea({
  verification,
  appUrl,
  purpose,
  validUntil,
}: {
  verification?: CertificateVerification;
  appUrl: string;
  /** What the copy is for (B2). */
  purpose?: string;
  /** Marriage copies: the last day it is accepted. */
  validUntil?: string;
}) {
  const url =
    present(verification?.url) ??
    (verification?.certificateId ? verifyUrl(appUrl, verification.certificateId) : undefined);
  const controlNo = present(verification?.controlNo);
  const hash = shortHash(verification?.hash);

  return (
    <div className="pcert__verify">
      {url ? <QrImage value={url} /> : <div className="pcert__qr pcert__qr--placeholder">QR CODE</div>}
      <div className="pcert__verify-text">
        <strong>Scan to verify authenticity</strong>
        <span>Certificate No.</span>
        <span className="pcert__mono">{controlNo ?? "______________"}</span>
        <span>SHA-256</span>
        <span className="pcert__mono">{hash ?? "________________"}</span>
        {validUntil ? (
          <>
            <strong className="pcert__purpose">For marriage purposes</strong>
            <span>Valid until {longDate(validUntil)}</span>
          </>
        ) : (
          present(purpose) && <span className="pcert__purpose">Issued for: {purpose}</span>
        )}
      </div>
    </div>
  );
}

export function QrImage({ value }: { value: string }) {
  const [qr, setQr] = useState({ value: "", src: "" });

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, { margin: 2, width: 360, errorCorrectionLevel: "M" })
      .then((src) => {
        if (!cancelled) setQr({ value, src });
      })
      .catch(() => {
        if (!cancelled) setQr({ value, src: "" });
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  const src = qr.value === value ? qr.src : "";
  return (
    <div className="pcert__qr" title={value}>
      {src && <img src={src} alt="Scan to verify this certificate" />}
    </div>
  );
}
