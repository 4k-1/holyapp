import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AdminDialog, AdminDialogFooter, AdminDialogHeader } from "@/features/parish-admin/components/AdminDialog";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import {
  buildReportPdf,
  PDF_LAYOUT_WIDTH,
  type BuiltReportPdf,
  type PdfOrientation,
} from "@/features/parish-admin/reports/reportPdf";

const ORIENTATIONS: { id: PdfOrientation; label: string }[] = [
  { id: "landscape", label: "Landscape" },
  { id: "portrait", label: "Portrait" },
];

/**
 * Draws the PDF and shows its pages before saving, so what you see is exactly what downloads, page breaks
 * included. Landscape or portrait: the sheet is laid out again at that orientation's width and redrawn.
 */
export function ReportPdfDialog({
  subtitle,
  filename,
  renderSheet,
  surface,
  onPrint,
  onClose,
}: {
  subtitle: string;
  /** Without the extension. */
  filename: string;
  /** The flat report sheet laid out for the orientation. */
  renderSheet: (orientation: PdfOrientation) => ReactNode;
  /** `data-surface` for the off-screen copy, so it picks up the same styles as the page. */
  surface?: string;
  onPrint?: () => void;
  onClose: () => void;
}) {
  const captureRef = useRef<HTMLDivElement>(null);
  const [orientation, setOrientation] = useState<PdfOrientation>("landscape");
  const [result, setResult] = useState<{ orientation: PdfOrientation; pdf: BuiltReportPdf | null; failed: boolean } | null>(
    null
  );
  // A result for the other orientation is stale while the new one draws.
  const current = result?.orientation === orientation ? result : null;
  const built = current?.pdf ?? null;

  useEffect(() => {
    let cancelled = false;
    async function draw() {
      // Wait for the fonts and a painted frame at the new width, or the capture can come out wrong.
      await document.fonts.ready;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (!captureRef.current || cancelled) return;
      const pdf = await buildReportPdf(captureRef.current, orientation);
      if (!cancelled) setResult({ orientation, pdf, failed: false });
    }
    draw().catch(() => {
      if (!cancelled) setResult({ orientation, pdf: null, failed: true });
    });
    return () => {
      cancelled = true;
    };
  }, [orientation]);

  const pageCount = built?.pages.length ?? 0;
  const portrait = orientation === "portrait";

  return (
    <AdminDialog onClose={onClose} panelClassName="max-w-[900px]">
      <AdminDialogHeader title="Download PDF" subtitle={`${subtitle} · A4`} onClose={onClose} />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-border px-5 py-3">
        <div className="inline-flex rounded-lg border border-admin-border bg-admin-surface-alt p-1" role="radiogroup" aria-label="Page orientation">
          {ORIENTATIONS.map((o) => {
            const active = o.id === orientation;
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setOrientation(o.id)}
                className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-admin-body font-semibold transition-colors ${
                  active ? "bg-admin-surface text-admin-green-900 shadow-sm" : "text-admin-ink-muted hover:text-admin-ink"
                }`}
              >
                <PageShape portrait={o.id === "portrait"} />
                {o.label}
              </button>
            );
          })}
        </div>
        <p className="text-admin-support text-admin-ink-muted" aria-live="polite">
          {built ? `${pageCount} ${pageCount === 1 ? "page" : "pages"}` : ""}
        </p>
      </div>

      <div className="max-h-[62vh] overflow-y-auto bg-admin-surface-alt px-4 py-4">
        {current?.failed ? (
          <p className="py-16 text-center text-admin-body text-admin-red-700">Couldn't draw the PDF. Try again.</p>
        ) : !built ? (
          <p className="py-16 text-center text-admin-body text-admin-ink-muted">Preparing the preview…</p>
        ) : (
          <ol className="space-y-4">
            {built.pages.map((src, i) => (
              <li key={i} className={portrait ? "mx-auto max-w-[520px]" : undefined}>
                <img
                  src={src}
                  alt={`Page ${i + 1} of ${pageCount}`}
                  className="mx-auto block w-full border border-admin-border bg-white"
                  style={{ aspectRatio: portrait ? "210 / 297" : "297 / 210", objectFit: "contain", objectPosition: "top" }}
                />
                <p className="mt-1.5 text-center text-admin-label text-admin-ink-faint">
                  Page {i + 1} of {pageCount}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>

      <AdminDialogFooter className="flex-wrap items-center">
        <p className="mr-auto min-w-0 truncate text-admin-label text-admin-ink-faint">{filename}.pdf</p>
        <AdminButton variant="secondary" onClick={onClose}>
          Close
        </AdminButton>
        {onPrint && (
          <AdminButton variant="secondary" onClick={onPrint}>
            Print
          </AdminButton>
        )}
        <AdminButton disabled={!built} onClick={() => built?.save(filename)}>
          Save PDF
        </AdminButton>
      </AdminDialogFooter>

      {createPortal(
        <div
          aria-hidden="true"
          data-portal="admin"
          data-surface={surface}
          className="pointer-events-none fixed left-[-10000px] top-0"
          style={{ width: PDF_LAYOUT_WIDTH[orientation] }}
        >
          <div ref={captureRef}>{renderSheet(orientation)}</div>
        </div>,
        document.body
      )}
    </AdminDialog>
  );
}

/** A small page outline, wide or tall. */
function PageShape({ portrait }: { portrait: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4" aria-hidden="true">
      {portrait ? <rect x="6" y="3" width="12" height="18" rx="1.5" /> : <rect x="3" y="6" width="18" height="12" rx="1.5" />}
    </svg>
  );
}
