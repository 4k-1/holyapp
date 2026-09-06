import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CERT_PREVIEW_STAGE_BG, CERT_SHEET_WIDTH } from "@/features/parish-admin/components/certificate/constants";

/**
 * Scales the certificate sheet to fit the stage so the whole document stays in view.
 * When nested in AdminDialog, measures header/footer via `data-admin-dialog-*`.
 * Includes an expand control that opens a full-viewport preview.
 */
export function CertificatePreviewStage({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      setExpanded(false);
    }
    document.addEventListener("keydown", onKey, true);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = previous;
    };
  }, [expanded]);

  return (
    <>
      <div className="relative h-full w-full">
        <ExpandButton onClick={() => setExpanded(true)} />
        <FitStage>{children}</FitStage>
      </div>

      {expanded &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label="Certificate preview full screen"
          >
            <div className="absolute inset-0 bg-black/70" onClick={() => setExpanded(false)} aria-hidden="true" />
            <div className="relative z-10 flex min-h-0 flex-1 flex-col">
              <div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 text-white sm:px-5">
                <p className="text-sm font-semibold tracking-wide">Certificate preview</p>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/20"
                >
                  <CollapseIcon />
                  Exit full screen
                </button>
              </div>
              <div
                data-cert-preview-fullscreen
                className="min-h-0 flex-1 overflow-hidden px-3 pb-3 sm:px-5 sm:pb-5"
                style={{ background: CERT_PREVIEW_STAGE_BG }}
              >
                <FitStage>{children}</FitStage>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function FitStage({ children }: { children: ReactNode }) {
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
      const fullscreen = stage.closest("[data-cert-preview-fullscreen]");
      let availH: number;
      if (fullscreen instanceof HTMLElement) {
        availH = Math.max(160, fullscreen.clientHeight - 8);
      } else if (stage.clientHeight > 80) {
        availH = stage.clientHeight;
      } else {
        const panel = stage.closest("[data-admin-dialog-panel]");
        const header = panel?.querySelector("[data-admin-dialog-header]");
        const footer = panel?.querySelector("[data-admin-dialog-footer]");
        const panelMax = Math.min(window.innerHeight * 0.92, 840);
        const chrome =
          (header instanceof HTMLElement ? header.offsetHeight : 56) +
          (footer instanceof HTMLElement ? footer.offsetHeight : 56) +
          24;
        availH = Math.max(160, panelMax - chrome);
      }
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
    if (stage.parentElement) observer.observe(stage.parentElement);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [children]);

  return (
    <div ref={stageRef} className="flex h-full min-h-[200px] w-full items-center justify-center overflow-hidden">
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

function ExpandButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute right-2 top-2 z-10 inline-flex items-center gap-1.5 rounded-lg border border-admin-border bg-admin-surface/95 px-2.5 py-1.5 text-admin-label font-semibold text-admin-ink shadow-sm backdrop-blur-sm hover:bg-admin-surface-alt"
      aria-label="Expand certificate preview to full screen"
      title="Full screen"
    >
      <ExpandIcon />
      <span className="hidden sm:inline">Full screen</span>
    </button>
  );
}

function ExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5" aria-hidden>
      <polyline points="15 3 21 3 21 9" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="9 21 3 21 3 15" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="21" y1="3" x2="14" y2="10" strokeLinecap="round" />
      <line x1="3" y1="21" x2="10" y2="14" strokeLinecap="round" />
    </svg>
  );
}

function CollapseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5" aria-hidden>
      <polyline points="4 14 10 14 10 20" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points="20 10 14 10 14 4" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="14" y1="10" x2="21" y2="3" strokeLinecap="round" />
      <line x1="3" y1="21" x2="10" y2="14" strokeLinecap="round" />
    </svg>
  );
}
