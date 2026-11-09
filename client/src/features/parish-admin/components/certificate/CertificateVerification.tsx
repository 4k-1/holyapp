import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { CertificateVerification } from "./certificateData";
import { present, shortHash, verifyUrl } from "./certificateFormat";

/**
 * The QR verification area: the QR code (a "QR CODE" placeholder while previewing) with the
 * Certificate No. and the start of the hash beside it. Styled by parishCertificate.css.
 */
export function VerificationArea({
  verification,
  appUrl,
}: {
  verification?: CertificateVerification;
  appUrl: string;
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
