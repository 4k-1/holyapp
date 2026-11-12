import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { PrintSheet } from "@/components/print/PrintSheet";
import { usePrintJob } from "@/components/print/usePrintJob";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import type { ReportsOutletContext } from "@/features/parish-admin/reports/AdminReportsLayout";
import {
  buildReportDocument,
  type ReportDocument,
} from "@/features/parish-admin/reports/reportDocument";
import { downloadReportCsv } from "@/features/parish-admin/reports/reportPdf";
import { ReportPdfDialog } from "@/features/parish-admin/reports/ReportPdfDialog";
import { ReportSheet } from "@/features/parish-admin/reports/ReportSheet";
import {
  emptyReportDateRange,
  normalizeReportRange,
  REPORT_SECTIONS,
  reportPeriodLabel,
  type ReportDateRange,
  type ReportKind,
} from "@/features/parish-admin/reports/reportsHelpers";
import "./reportPrint.css";
import { emptyCopyFilter, withCopyFilter, type CopyFilter } from "@/features/parish-admin/reports/issuedCopies";
import {
  AdminPage,
  AdminPageHeader,
} from "@/features/parish-admin/components/AdminPageHeader";

const dateInputClass =
  "h-9 w-[150px] rounded-md border border-admin-border bg-admin-surface px-2.5 text-admin-support text-admin-ink outline-none focus-visible:border-admin-green-700 focus-visible:ring-[3px] focus-visible:ring-admin-green-100";

function DateFilter({
  range,
  onApply,
}: {
  range: ReportDateRange;
  onApply: (range: ReportDateRange) => void;
}) {
  const [draft, setDraft] = useState(range);
  // Follow a range changed from outside, such as Clear.
  const [applied, setApplied] = useState(range);
  if (applied !== range) {
    setApplied(range);
    setDraft(range);
  }

  const dirty = draft.from !== range.from || draft.to !== range.to;
  const active = Boolean(range.from || range.to);
  const labelClass =
    "mb-1.5 block text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted";

  return (
    <form
      className="mb-4 flex flex-wrap items-end gap-x-3 gap-y-3 rounded-[var(--radius)] border border-admin-border bg-admin-surface px-4 py-3.5 shadow-[var(--shadow-card)]"
      onSubmit={(e) => {
        e.preventDefault();
        onApply(normalizeReportRange(draft));
      }}
    >
      <label className="block">
        <span className={labelClass}>From</span>
        <input
          type="date"
          value={draft.from}
          onChange={(e) =>
            setDraft((prev) => ({ ...prev, from: e.target.value }))
          }
          className={dateInputClass}
        />
      </label>
      <label className="block">
        <span className={labelClass}>To</span>
        <input
          type="date"
          value={draft.to}
          onChange={(e) =>
            setDraft((prev) => ({ ...prev, to: e.target.value }))
          }
          className={dateInputClass}
        />
      </label>
      <AdminButton type="submit" size="sm" disabled={!dirty} className="h-9">
        Apply
      </AdminButton>
      {active && (
        <button
          type="button"
          onClick={() => onApply(emptyReportDateRange())}
          className="mb-2 text-admin-support font-semibold text-admin-green-700 hover:underline"
        >
          Clear dates
        </button>
      )}
      <p className="w-full text-admin-support text-admin-ink-muted sm:ml-auto sm:w-auto sm:self-center">
        {active
          ? `Showing ${reportPeriodLabel(range)}.`
          : "Showing every date on file."}
      </p>
    </form>
  );
}

/** A report as a dashboard, with the date filter above it and CSV, PDF and print in the header. */
export function AdminReportPage({ kind }: { kind: ReportKind }) {
  const { parish, range, setRange } = useOutletContext<ReportsOutletContext>();
  const section =
    REPORT_SECTIONS.find((item) => item.id === kind) ?? REPORT_SECTIONS[0];
  const period = reportPeriodLabel(range);
  const [doc, setDoc] = useState<ReportDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [printJob, setPrintJob] = usePrintJob<ReportDocument>();

  useEffect(() => {
    let cancelled = false;
    buildReportDocument(kind, parish, range, period)
      .then((built) => {
        if (!cancelled) {
          setDoc(built);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(
            err instanceof Error
              ? err.message
              : "Could not prepare this report.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [kind, parish, range, period]);

  // Certificates: search and filters over the copy list, also applied to the CSV, PDF and print (A7).
  const [copyFilter, setCopyFilter] = useState<CopyFilter>(emptyCopyFilter);

  // The last report stays on screen while the next one loads, but never one of a different kind.
  const loaded = doc?.kind === kind ? doc : null;
  const shown = useMemo(() => (loaded ? withCopyFilter(loaded, copyFilter) : null), [loaded, copyFilter]);

  return (
    <AdminPage>
      <AdminPageHeader
        title={section.label}
        description={section.blurb}
        actions={
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Export this report"
          >
            <AdminButton
              variant="secondary"
              onClick={() => shown && downloadReportCsv(shown)}
              disabled={!shown}
              title="The report's rows as a spreadsheet"
            >
              Export CSV
            </AdminButton>
            <AdminButton
              variant="secondary"
              onClick={() => shown && setPrintJob(shown)}
              disabled={!shown}
            >
              Print
            </AdminButton>
            <AdminButton onClick={() => setPreviewing(true)} disabled={!shown}>
              Download PDF
            </AdminButton>
          </div>
        }
      />
      <DateFilter range={range} onApply={setRange} />

      {error && (
        <p className="mb-4 rounded-md border border-admin-red-100 bg-admin-red-100 px-4 py-3 text-admin-body text-admin-red-700">
          {error}
        </p>
      )}

      {shown ? (
        <ReportSheet doc={shown} bare interactive copyFilter={copyFilter} onCopyFilterChange={setCopyFilter} />
      ) : (
        <p className="text-admin-body text-admin-ink-muted">
          Loading this report…
        </p>
      )}

      {previewing && shown && (
        <ReportPdfDialog
          subtitle={period}
          filename={shown.filename}
          renderSheet={(orientation) => <ReportSheet doc={shown} flat portrait={orientation === "portrait"} />}
          onPrint={() => setPrintJob(shown)}
          onClose={() => setPreviewing(false)}
        />
      )}

      {printJob && (
        <PrintSheet className="report-print-sheet">
          <div data-portal="admin">
            <ReportSheet doc={printJob} flat />
          </div>
        </PrintSheet>
      )}
    </AdminPage>
  );
}
