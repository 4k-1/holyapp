import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CertificateDocument } from "@/features/parish-admin/components/CertificateDocument";
import { CERT_SHEET_WIDTH } from "@/features/parish-admin/components/certificate/constants";
import { getCertificateAppearance } from "@/features/parish-admin/settings/api/certificateConfigApi";
import { useAsync } from "@/hooks/useAsync";
import type { IssuedCertificate, Parish } from "@/types";

interface CertificatePdfCaptureProps {
  certificate: IssuedCertificate;
  parish: Parish;
  onReady: (element: HTMLElement) => void;
}

/** Renders the same certificate sheet used by View, off to the side, so it can be saved. */
export function CertificatePdfCapture({ certificate, parish, onReady }: CertificatePdfCaptureProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const { data: appearance, loading } = useAsync(
    () => getCertificateAppearance(certificate.sacramentType).catch(() => undefined),
    [certificate.id, certificate.sacramentType]
  );

  useEffect(() => {
    if (loading || started.current) return;
    const sheet = sheetRef.current;
    if (!sheet) return;
    let cancelled = false;

    async function waitUntilPainted() {
      if (document.fonts?.ready) await document.fonts.ready;
      const deadline = Date.now() + 4000;
      while (!cancelled && Date.now() < deadline) {
        const images = [...sheet!.querySelectorAll("img")];
        const pending = images.some((img) => !img.complete || img.naturalWidth === 0);
        const needsQr = Boolean(certificate.fields.verifyUrl);
        const hasQr = Boolean(sheet!.querySelector('img[alt="Scan to verify this certificate"]'));
        // The test-copy mark is drawn once the site says whether certificates are test copies.
        const markPending = Boolean(sheet!.querySelector(".cert-mode-pending"));
        if (!pending && !markPending && (!needsQr || hasQr)) return;
        await new Promise((resolve) => window.setTimeout(resolve, 40));
      }
    }

    waitUntilPainted().then(() => {
      if (cancelled || started.current || !sheetRef.current) return;
      started.current = true;
      onReady(sheetRef.current);
    });

    return () => {
      cancelled = true;
    };
  }, [loading, appearance, certificate.fields.verifyUrl, onReady]);

  return createPortal(
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        left: -10000,
        top: 0,
        width: CERT_SHEET_WIDTH,
        pointerEvents: "none",
      }}
    >
      <CertificateDocument
        ref={sheetRef}
        parish={parish}
        sacramentType={certificate.sacramentType}
        subjectName={certificate.holderName}
        fields={{ ...certificate.fields, certCode: certificate.certCode }}
        appearance={appearance ?? undefined}
      />
    </div>,
    document.body
  );
}
