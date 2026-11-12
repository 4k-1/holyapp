import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CERT_PREVIEW_STAGE_BG, CERT_SHEET_WIDTH } from "@/features/parish-admin/components/certificate/constants";

/**
 * Scales the certificate sheet to fit the stage so the whole document stays in view, with zoom controls
 * (and Ctrl + scroll) to look closer; once zoomed in, the sheet scrolls inside the same frame.
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
      <FitStage onExpand={() => setExpanded(true)}>{children}</FitStage>

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

/** Zoom steps, as multiples of the fitted size; 1 shows the whole sheet. */
const ZOOM_STEPS = [1, 1.5, 2, 3, 4];

function clampZoom(index: number) {
  return Math.max(0, Math.min(ZOOM_STEPS.length - 1, index));
}

function FitStage({ children, onExpand }: { children: ReactNode; onExpand?: () => void }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  // boxHeight: in a dialog, the frame keeps the fitted height so zooming in scrolls inside it.
  const [fit, setFit] = useState({ scale: 1, width: CERT_SHEET_WIDTH, height: 640, boxHeight: 0 });
  const [zoomIndex, setZoomIndex] = useState(0);
  const scale = fit.scale * ZOOM_STEPS[zoomIndex];
  // Where the view was centred before a zoom, as a share of the sheet, so that spot stays in the middle.
  const anchor = useRef<{ x: number; y: number } | null>(null);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const sheet = sheetRef.current;
    if (!stage || !sheet) return;

    const update = () => {
      const natW = sheet.offsetWidth;
      const natH = sheet.offsetHeight;
      const availW = stage.clientWidth;
      const fullscreen = stage.closest("[data-cert-preview-fullscreen]");
      // Inside an AdminDialog the stage grows with the sheet, so its own height can't be the limit.
      const dialogPanel = stage.closest("[data-admin-dialog-panel]");
      let availH: number;
      let inDialog = false;
      if (fullscreen instanceof HTMLElement) {
        availH = Math.max(160, fullscreen.clientHeight - 8);
      } else if (!dialogPanel && stage.clientHeight > 80) {
        availH = stage.clientHeight;
      } else {
        const header = dialogPanel?.querySelector("[data-admin-dialog-header]");
        const footer = dialogPanel?.querySelector("[data-admin-dialog-footer]");
        const panelMax = Math.min(window.innerHeight * 0.92, 840);
        const chrome =
          (header instanceof HTMLElement ? header.offsetHeight : 56) +
          (footer instanceof HTMLElement ? footer.offsetHeight : 56) +
          24;
        availH = Math.max(160, panelMax - chrome);
        inDialog = true;
      }
      if (natW < 8 || natH < 8 || availW < 8) return;
      const next = Math.min(availW / natW, availH / natH);
      const boxHeight = inDialog ? Math.ceil(natH * next) : 0;
      setFit((prev) =>
        Math.abs(prev.scale - next) < 0.002 && prev.width === natW && prev.height === natH && prev.boxHeight === boxHeight
          ? prev
          : { scale: next, width: natW, height: natH, boxHeight }
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

  // After a zoom, scroll so the spot that was in the middle is in the middle again.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const point = anchor.current;
    if (!stage || !point) return;
    anchor.current = null;
    stage.scrollLeft = point.x * fit.width * scale - stage.clientWidth / 2;
    stage.scrollTop = point.y * fit.height * scale - stage.clientHeight / 2;
  }, [scale, fit.width, fit.height]);

  function zoomTo(index: number) {
    const next = clampZoom(index);
    if (next === zoomIndex) return;
    const stage = stageRef.current;
    if (stage) {
      const w = fit.width * scale;
      const h = fit.height * scale;
      anchor.current = {
        x: w > stage.clientWidth ? (stage.scrollLeft + stage.clientWidth / 2) / w : 0.5,
        y: h > stage.clientHeight ? (stage.scrollTop + stage.clientHeight / 2) / h : 0.5,
      };
    }
    setZoomIndex(next);
  }

  // Ctrl + scroll wheel (and a trackpad pinch, which browsers send the same way) zooms instead of scrolling.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    function onWheel(e: WheelEvent) {
      if (!e.ctrlKey) return;
      e.preventDefault();
      setZoomIndex((i) => clampZoom(i + (e.deltaY < 0 ? 1 : -1)));
    }
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, []);

  const zoomed = zoomIndex > 0;

  return (
    <div className="relative h-full w-full">
      <ZoomBar
        percent={Math.round(scale * 100)}
        canZoomOut={zoomed}
        canZoomIn={zoomIndex < ZOOM_STEPS.length - 1}
        onZoomOut={() => zoomTo(zoomIndex - 1)}
        onZoomIn={() => zoomTo(zoomIndex + 1)}
        onFit={() => zoomTo(0)}
        onExpand={onExpand}
      />
      <div
        ref={stageRef}
        tabIndex={zoomed ? 0 : undefined}
        aria-label={zoomed ? "Certificate preview, zoomed in. Scroll to move around." : undefined}
        className={`flex h-full min-h-[200px] w-full rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-green-600/40 ${
          zoomed ? "overflow-auto overscroll-contain" : "overflow-hidden"
        }`}
        style={fit.boxHeight > 0 ? { height: Math.max(200, fit.boxHeight) } : undefined}
      >
        {/* margin: auto centres the sheet while it fits, and lets it scroll from its edge once it doesn't. */}
        <div
          className="m-auto shrink-0 shadow-[0_10px_28px_-8px_rgba(40,36,20,0.35)]"
          style={{ width: fit.width * scale, height: fit.height * scale, position: "relative" }}
        >
          <div
            ref={sheetRef}
            className="cert-fit-sheet"
            style={{ width: CERT_SHEET_WIDTH, transform: `scale(${scale})`, transformOrigin: "top left" }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

const ZOOM_BUTTON =
  "flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-admin-ink hover:bg-admin-surface-alt disabled:cursor-not-allowed disabled:opacity-40";

function ZoomBar({
  percent,
  canZoomOut,
  canZoomIn,
  onZoomOut,
  onZoomIn,
  onFit,
  onExpand,
}: {
  percent: number;
  canZoomOut: boolean;
  canZoomIn: boolean;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onFit: () => void;
  onExpand?: () => void;
}) {
  return (
    <div className="absolute right-2 top-2 z-10 flex items-center gap-1.5">
      <div
        role="group"
        aria-label="Zoom"
        className="flex items-center gap-0.5 rounded-lg border border-admin-border bg-admin-surface/95 p-0.5 shadow-sm backdrop-blur-sm"
      >
        <button type="button" onClick={onZoomOut} disabled={!canZoomOut} aria-label="Zoom out" title="Zoom out" className={ZOOM_BUTTON}>
          <ZoomGlyph plus={false} />
        </button>
        <span className="min-w-[3.25rem] text-center text-admin-label font-semibold tabular-nums text-admin-ink" aria-live="polite">
          {percent}%
        </span>
        <button type="button" onClick={onZoomIn} disabled={!canZoomIn} aria-label="Zoom in" title="Zoom in" className={ZOOM_BUTTON}>
          <ZoomGlyph plus />
        </button>
        <button
          type="button"
          onClick={onFit}
          disabled={!canZoomOut}
          title="Show the whole certificate"
          className={`${ZOOM_BUTTON} text-admin-label font-semibold`}
        >
          Fit
        </button>
      </div>
      {onExpand && <ExpandButton onClick={onExpand} />}
    </div>
  );
}

function ZoomGlyph({ plus }: { plus: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-3.5 w-3.5" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
      {plus && <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" />}
    </svg>
  );
}

function ExpandButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-admin-border bg-admin-surface/95 px-2.5 text-admin-label font-semibold text-admin-ink shadow-sm backdrop-blur-sm hover:bg-admin-surface-alt"
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
