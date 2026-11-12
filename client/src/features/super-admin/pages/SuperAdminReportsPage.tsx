import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAsync } from "@/hooks/useAsync";
import { PrintSheet } from "@/components/print/PrintSheet";
import { usePrintJob } from "@/components/print/usePrintJob";
import { AdminDialog, AdminDialogFooter, AdminDialogHeader } from "@/features/parish-admin/components/AdminDialog";
import { buildReportPdf, type BuiltReportPdf } from "@/features/parish-admin/reports/reportPdf";
import "@/features/parish-admin/reports/reportPrint.css";
import { getPlatformReport, type PlatformReport, type ReportRange } from "@/features/super-admin/api/superAdminApi";
import { saBtnPrimary, saBtnSecondary } from "@/features/super-admin/components/SuperAdminModal";
import { PlatformReportSheet } from "@/features/super-admin/reports/PlatformReportSheet";
import {
  downloadReportCsv,
  normalizeRange,
  rangeLabel,
  rangePresets,
  reportFilename,
} from "@/features/super-admin/reports/platformReport";

/** CSS width the landscape PDF is laid out at, the same as the parish reports, so every download looks alike. */
const PDF_WIDTH = 1280;

const dateInputClass =
  "h-9 w-[160px] rounded-md border border-admin-border bg-white px-2.5 text-[13.5px] text-admin-ink outline-none focus-visible:border-admin-green-700";

/** How parishes are using HolyApp between two dates. The dashboard is "right now"; this page is "over time". */
export function SuperAdminReportsPage() {
  const [range, setRange] = useState<ReportRange>(() => rangePresets()[1].range);
  const { data, loading, error } = useAsync(() => getPlatformReport(range), [range.from, range.to]);
  const [previewing, setPreviewing] = useState(false);
  const [printJob, setPrintJob] = usePrintJob<PlatformReport>();
  const ready = data && !loading ? data : null;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex flex-wrap rounded-lg border border-admin-border bg-admin-surface p-1"
          role="group"
          aria-label="Quick dates"
        >
          {rangePresets().map((p) => {
            const active = p.range.from === range.from && p.range.to === range.to;
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={active}
                onClick={() => setRange(p.range)}
                className={`rounded-md px-3 py-1.5 text-[13.5px] font-semibold ${
                  active ? "bg-admin-green-700 text-white" : "text-admin-ink-muted hover:bg-admin-surface-alt"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Export this report">
          <button
            type="button"
            className={saBtnSecondary}
            disabled={!ready}
            onClick={() => ready && downloadReportCsv(ready, range)}
          >
            Export CSV
          </button>
          <button type="button" className={saBtnSecondary} disabled={!ready} onClick={() => ready && setPrintJob(ready)}>
            Print
          </button>
          <button type="button" className={saBtnPrimary} disabled={!ready} onClick={() => setPreviewing(true)}>
            Download PDF
          </button>
        </div>
      </div>

      <DateFilter range={range} onApply={setRange} />

      {error ? (
        <p className="text-[13.5px] text-admin-red-700">Couldn't load the report. Refresh the page to try again.</p>
      ) : !ready ? (
        <p className="text-[13.5px] text-admin-ink-muted">Loading report…</p>
      ) : (
        <PlatformReportSheet report={ready} range={range} />
      )}

      {previewing && ready ? (
        <PdfPreview report={ready} range={range} onClose={() => setPreviewing(false)} onPrint={() => setPrintJob(ready)} />
      ) : null}

      {printJob ? (
        <PrintSheet className="report-print-sheet">
          <div data-portal="admin" data-surface="platform">
            <PlatformReportSheet report={printJob} range={range} flat />
          </div>
        </PrintSheet>
      ) : null}
    </div>
  );
}

function DateFilter({ range, onApply }: { range: ReportRange; onApply: (range: ReportRange) => void }) {
  const [draft, setDraft] = useState(range);
  // Follow a range changed from outside, such as a quick pick or Clear dates.
  const [applied, setApplied] = useState(range);
  if (applied !== range) {
    setApplied(range);
    setDraft(range);
  }

  const dirty = draft.from !== range.from || draft.to !== range.to;
  const active = Boolean(range.from || range.to);

  return (
    <form
      className="mb-[18px] flex flex-wrap items-end gap-x-3 gap-y-3 rounded-lg border border-admin-border bg-admin-surface px-4 py-3.5"
      onSubmit={(e) => {
        e.preventDefault();
        onApply(normalizeRange(draft));
      }}
    >
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-semibold text-admin-ink-muted">From</span>
        <input
          type="date"
          value={draft.from}
          onChange={(e) => setDraft((prev) => ({ ...prev, from: e.target.value }))}
          className={dateInputClass}
        />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-semibold text-admin-ink-muted">To</span>
        <input
          type="date"
          value={draft.to}
          onChange={(e) => setDraft((prev) => ({ ...prev, to: e.target.value }))}
          className={dateInputClass}
        />
      </label>
      <button type="submit" className={`${saBtnPrimary} h-9`} disabled={!dirty}>
        Apply
      </button>
      {active ? (
        <button
          type="button"
          onClick={() => onApply({ from: "", to: "" })}
          className="mb-2 text-[13.5px] font-semibold text-admin-green-700 hover:underline"
        >
          Clear dates
        </button>
      ) : null}
      <p className="w-full text-[13.5px] text-admin-ink-muted sm:ml-auto sm:w-auto sm:self-center">
        {active ? `Showing ${rangeLabel(range)}.` : "Showing every date on file."}
      </p>
    </form>
  );
}

/**
 * Draws the PDF and shows its pages before saving, so what you see is exactly what downloads, page breaks
 * included. The sheet is drawn from an off-screen copy at a fixed width, like the parish reports.
 */
function PdfPreview({
  report,
  range,
  onClose,
  onPrint,
}: {
  report: PlatformReport;
  range: ReportRange;
  onClose: () => void;
  onPrint: () => void;
}) {
  const captureRef = useRef<HTMLDivElement>(null);
  const [built, setBuilt] = useState<BuiltReportPdf | null>(null);
  const [failed, setFailed] = useState(false);
  const filename = reportFilename(range);

  useEffect(() => {
    let cancelled = false;
    async function draw() {
      // Wait for the fonts and a painted frame, or the capture can come out in fallback fonts.
      await document.fonts.ready;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (!captureRef.current) return;
      const pdf = await buildReportPdf(captureRef.current);
      if (!cancelled) setBuilt(pdf);
    }
    draw().catch(() => {
      if (!cancelled) setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const pageCount = built?.pages.length ?? 0;

  return (
    <AdminDialog onClose={onClose} panelClassName="max-w-[900px]">
      <AdminDialogHeader title="Download PDF" subtitle={`${rangeLabel(range)} · landscape A4`} onClose={onClose} />
      <div className="max-h-[66vh] overflow-y-auto bg-admin-surface-alt px-4 py-4">
        {failed ? (
          <p className="py-16 text-center text-[13.5px] text-admin-red-700">Couldn't draw the PDF. Try again.</p>
        ) : !built ? (
          <p className="py-16 text-center text-[13.5px] text-admin-ink-muted">Preparing the preview…</p>
        ) : (
          <ol className="space-y-4">
            {built.pages.map((src, i) => (
              <li key={i}>
                <img
                  src={src}
                  alt={`Page ${i + 1} of ${pageCount}`}
                  className="mx-auto block w-full border border-admin-border bg-white"
                  style={{ aspectRatio: "297 / 210", objectFit: "contain", objectPosition: "top" }}
                />
                <p className="mt-1.5 text-center text-[12.5px] text-admin-ink-faint">
                  Page {i + 1} of {pageCount}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
      <AdminDialogFooter className="flex-wrap items-center">
        <p className="mr-auto text-[13px] text-admin-ink-faint">{filename}.pdf</p>
        <button type="button" className={saBtnSecondary} onClick={onClose}>
          Close
        </button>
        <button type="button" className={saBtnSecondary} onClick={onPrint}>
          Print
        </button>
        <button type="button" className={saBtnPrimary} disabled={!built} onClick={() => built?.save(filename)}>
          Save PDF
        </button>
      </AdminDialogFooter>

      {createPortal(
        <div
          aria-hidden="true"
          data-portal="admin"
          data-surface="platform"
          className="pointer-events-none fixed left-[-10000px] top-0"
          style={{ width: PDF_WIDTH }}
        >
          <div ref={captureRef}>
            <PlatformReportSheet report={report} range={range} flat />
          </div>
        </div>,
        document.body
      )}
    </AdminDialog>
  );
}
