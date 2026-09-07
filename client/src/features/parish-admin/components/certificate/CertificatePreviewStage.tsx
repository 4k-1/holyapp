import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { CERT_SHEET_WIDTH } from "@/features/parish-admin/components/certificate/constants";

/**
 * Scales the certificate sheet to fit the stage so the whole document stays in view.
 * When nested in AdminDialog, measures header/footer via `data-admin-dialog-*`.
 */
export function CertificatePreviewStage({ children }: { children: ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 1, width: CERT_SHEET_WIDTH, height: 640 });

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const sheet = sheetRef.current;
    if (!stage || !sheet) return;

    const update = () => {
      const natW = sheet.offsetWidth;
      const natH = sheet.offsetHeight;
      const availW = stage.clientWidth;
      const panel = stage.closest("[data-admin-dialog-panel]");
      const header = panel?.querySelector("[data-admin-dialog-header]");
      const footer = panel?.querySelector("[data-admin-dialog-footer]");
      const panelMax = Math.min(window.innerHeight * 0.92, 840);
      const chrome =
        (header instanceof HTMLElement ? header.offsetHeight : 56) +
        (footer instanceof HTMLElement ? footer.offsetHeight : 56) +
        24;
      const availH = Math.max(160, panelMax - chrome);
      if (natW < 8 || natH < 8 || availW < 8) return;
      const scale = Math.min(availW / natW, availH / natH);
      setFit((prev) =>
        Math.abs(prev.scale - scale) < 0.002 && prev.width === natW && prev.height === natH
          ? prev
          : { scale, width: natW, height: natH }
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(stage);
    observer.observe(sheet);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [children]);

  return (
    <div ref={stageRef} className="flex h-full w-full items-center justify-center overflow-hidden">
      <div
        className="shadow-[0_10px_28px_-8px_rgba(40,36,20,0.35)]"
        style={{
          width: fit.width * fit.scale,
          height: fit.height * fit.scale,
          position: "relative",
        }}
      >
        <div
          ref={sheetRef}
          style={{
            width: CERT_SHEET_WIDTH,
            transform: `scale(${fit.scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
