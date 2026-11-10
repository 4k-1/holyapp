// A scanned register page you can zoom and move around, like the image viewers on FamilySearch and
// Ancestry: the scroll wheel or + and − zoom, dragging moves the page, a double-click zooms in there.
// Zoom is shown against "fit width" (100%), which shows a two-page spread across the whole stage.
// It opens at fit width; give it a new key to start again (a new page, a turn).
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type WheelEvent,
} from "react";
import type { ScanAdjust } from "./scanAdjust";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 8;
const STEP = 1.25;

/** Zoom against fit width, and the point of the page (as fractions) at the middle of the stage. */
type View = { zoom: number; fx: number; fy: number; whole: boolean };
const FIT_WIDTH: View = { zoom: 1, fx: 0.5, fy: 0, whole: false };

export function ZoomableScan({
  url,
  alt,
  width,
  height,
  adjust,
  failed,
}: {
  url: string;
  alt: string;
  /** The photo's size in pixels; read from the image itself when not stored. */
  width: number;
  height: number;
  adjust: ScanAdjust;
  failed: boolean;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ w: 0, h: 0 });
  const [natural, setNatural] = useState({ w: width, h: height });
  const [view, setView] = useState<View>(FIT_WIDTH);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const sideways = adjust.turns % 2 === 1;
  const imgW = natural.w || 1;
  const imgH = natural.h || 1;
  const boxW = sideways ? imgH : imgW;
  const boxH = sideways ? imgW : imgH;
  const fitWidth = stage.w ? stage.w / boxW : 1;
  const fitPage = stage.w && stage.h ? Math.min(stage.w / boxW, stage.h / boxH) : 1;

  /** Where the page sits for a zoom and top-left corner: centred when smaller than the stage, edges held otherwise. */
  function clamp(z: number, x: number, y: number) {
    const w = boxW * z;
    const h = boxH * z;
    return {
      z,
      x: w <= stage.w ? (stage.w - w) / 2 : Math.min(0, Math.max(stage.w - w, x)),
      y: h <= stage.h ? (stage.h - h) / 2 : Math.min(0, Math.max(stage.h - h, y)),
    };
  }

  function placed(v: View) {
    const z = v.whole ? fitPage : v.zoom * fitWidth;
    return clamp(z, stage.w / 2 - v.fx * boxW * z, stage.h / 2 - v.fy * boxH * z);
  }

  function toView(p: { z: number; x: number; y: number }): View {
    return {
      zoom: p.z / fitWidth,
      fx: (stage.w / 2 - p.x) / (boxW * p.z),
      fy: (stage.h / 2 - p.y) / (boxH * p.z),
      whole: false,
    };
  }

  /** Zooms by `factor` keeping the point (cx, cy) of the stage still. */
  function zoomAt(factor: number, cx: number, cy: number) {
    setView((v) => {
      const now = placed(v);
      const z = Math.min(fitWidth * MAX_ZOOM, Math.max(fitWidth * MIN_ZOOM, now.z * factor));
      const ratio = z / now.z;
      return toView(clamp(z, cx - (cx - now.x) * ratio, cy - (cy - now.y) * ratio));
    });
  }

  const zoomRef = useRef(zoomAt);
  useLayoutEffect(() => {
    zoomRef.current = zoomAt;
  });

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      setStage({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    observer.observe(el);
    // The wheel zooms, so it mustn't scroll the page behind the scan as well.
    const stopScroll = (e: globalThis.WheelEvent) => e.preventDefault();
    el.addEventListener("wheel", stopScroll, { passive: false });
    return () => {
      observer.disconnect();
      el.removeEventListener("wheel", stopScroll);
    };
  }, []);

  // Keys: + and − zoom, 0 goes back to fit width.
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const el = stageRef.current;
      const cx = (el?.clientWidth ?? 0) / 2;
      const cy = (el?.clientHeight ?? 0) / 2;
      if (e.key === "+" || e.key === "=") zoomRef.current(STEP, cx, cy);
      else if (e.key === "-" || e.key === "_") zoomRef.current(1 / STEP, cx, cy);
      else if (e.key === "0") setView(FIT_WIDTH);
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function handleWheel(e: WheelEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - rect.left, e.clientY - rect.top);
  }

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || (e.target as HTMLElement).closest("button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const now = placed(view);
    drag.current = { x: e.clientX, y: e.clientY, px: now.x, py: now.y };
    setDragging(true);
  }

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start) return;
    const z = placed(view).z;
    setView(toView(clamp(z, start.px + e.clientX - start.x, start.py + e.clientY - start.y)));
  }

  function endDrag() {
    drag.current = null;
    setDragging(false);
  }

  function handleDoubleClick(e: MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("button")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    zoomAt(2, e.clientX - rect.left, e.clientY - rect.top);
  }

  const p = placed(view);
  const percent = Math.round((p.z / fitWidth) * 100);

  return (
    <div
      ref={stageRef}
      className={`relative h-full w-full touch-none select-none overflow-hidden bg-[#dfe6e8] ${
        dragging ? "cursor-grabbing" : "cursor-grab"
      }`}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={handleDoubleClick}
    >
      {!url ? (
        <p className="absolute inset-0 flex items-center justify-center text-admin-support text-admin-ink-muted">
          {failed ? "Photo couldn't load" : "Loading photo…"}
        </p>
      ) : (
        stage.w > 0 && (
          <div
            className="absolute bg-white shadow-[0_2px_12px_rgb(14_59_70/0.18)]"
            style={{ left: p.x, top: p.y, width: boxW * p.z, height: boxH * p.z }}
          >
            <img
              src={url}
              alt={alt}
              draggable={false}
              onLoad={(e) => {
                const img = e.currentTarget;
                if (!width || !height) setNatural({ w: img.naturalWidth, h: img.naturalHeight });
              }}
              className="absolute left-1/2 top-1/2 max-w-none"
              style={{
                width: imgW * p.z,
                height: imgH * p.z,
                transform: `translate(-50%, -50%) rotate(${adjust.turns * 90}deg)`,
                // Only when changed: a filter can stop some browsers from drawing a very large photo.
                filter:
                  adjust.brightness !== 1 || adjust.contrast !== 1
                    ? `brightness(${adjust.brightness}) contrast(${adjust.contrast})`
                    : undefined,
              }}
            />
          </div>
        )
      )}

      {/* Zoom controls, floating on the scan like on a map. */}
      <div className="absolute bottom-3 right-3 flex items-center gap-0.5 rounded-lg border border-admin-border bg-admin-surface/95 p-1 shadow-[var(--shadow-card)]">
        <ZoomButton label="Zoom out (−)" onClick={() => zoomAt(1 / STEP, stage.w / 2, stage.h / 2)}>
          <path d="M5 12h14" />
        </ZoomButton>
        <span className="w-12 text-center text-admin-support tabular-nums text-admin-ink" aria-live="polite">
          {percent}%
        </span>
        <ZoomButton label="Zoom in (+)" onClick={() => zoomAt(STEP, stage.w / 2, stage.h / 2)}>
          <path d="M12 5v14M5 12h14" />
        </ZoomButton>
        <span className="mx-1 h-5 w-px bg-admin-border" aria-hidden="true" />
        <TextZoomButton onClick={() => setView(FIT_WIDTH)} title="Fit the page's width (0)" on={!view.whole && percent === 100}>
          Fit width
        </TextZoomButton>
        <TextZoomButton onClick={() => setView({ ...FIT_WIDTH, fy: 0.5, whole: true })} title="Show the whole page" on={view.whole}>
          Whole page
        </TextZoomButton>
      </div>
    </div>
  );
}

function ZoomButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-admin-ink hover:bg-admin-surface-alt"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}

function TextZoomButton({
  onClick,
  title,
  on,
  children,
}: {
  onClick: () => void;
  title: string;
  on: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={on}
      className={`h-8 whitespace-nowrap rounded-md px-2.5 text-admin-support font-medium hover:bg-admin-surface-alt ${
        on ? "bg-admin-green-100 text-admin-green-700" : "text-admin-ink"
      }`}
    >
      {children}
    </button>
  );
}
