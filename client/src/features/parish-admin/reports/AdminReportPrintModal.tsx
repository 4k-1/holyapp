import { useEffect, useState } from "react";
import {
  AdminDialog,
  AdminDialogFooter,
  AdminDialogHeader,
} from "@/features/parish-admin/components/AdminDialog";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import {
  buildReportDocument,
  type ReportPdfDocument,
} from "@/features/parish-admin/reports/reportDocument";
import { downloadReportPdf, reportPdfObjectUrl } from "@/features/parish-admin/reports/reportPdf";
import type { ReportDateRange, ReportKind } from "@/features/parish-admin/reports/reportsHelpers";
import type { Parish } from "@/types";

function previewCell(value: string) {
  return value.startsWith("PHP ") ? `₱${value.slice(4)}` : value;
}

interface AdminReportPrintModalProps {
  parish: Parish;
  kind: ReportKind;
  range: ReportDateRange;
  period: string;
  onClose: () => void;
}

export function AdminReportPrintModal({
  parish,
  kind,
  range,
  period,
  onClose,
}: AdminReportPrintModalProps) {
  const [doc, setDoc] = useState<ReportPdfDocument | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    setLoading(true);
    setError(null);
    setDoc(null);
    setPdfUrl(null);

    buildReportDocument(kind, parish, range, period)
      .then((built) => {
        if (cancelled) return;
        objectUrl = reportPdfObjectUrl(built);
        setDoc(built);
        setPdfUrl(objectUrl);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not prepare this report.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [kind, parish, range, period]);

  function handleDownload() {
    if (!doc) return;
    setDownloading(true);
    try {
      downloadReportPdf(doc);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <AdminDialog onClose={onClose} busy={downloading} panelClassName="max-w-[920px]">
      <AdminDialogHeader
        title="Print report"
        subtitle={doc ? `${doc.title} · ${doc.period}` : "Preparing a printable PDF of this report."}
        onClose={onClose}
        busy={downloading}
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {loading ? (
          <p className="text-admin-body text-admin-ink-muted">Preparing the PDF…</p>
        ) : error ? (
          <p className="rounded-[10px] border border-admin-red-100 bg-admin-red-100/40 px-4 py-3 text-admin-body text-admin-red-700">
            {error}
          </p>
        ) : doc ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            <div className="overflow-hidden rounded-[10px] border border-admin-border bg-[#ececec] p-3 sm:p-4">
              {pdfUrl ? (
                <iframe
                  title={`${doc.title} PDF preview`}
                  src={pdfUrl}
                  className="h-[min(68vh,720px)] w-full rounded-md border border-admin-border bg-white"
                />
              ) : null}
            </div>

            <div className="space-y-4">
              <div className="rounded-[10px] border border-admin-border bg-admin-surface-alt p-4">
                <p className="font-sans text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">
                  File
                </p>
                <p className="mt-1 break-all font-mono text-admin-support text-admin-ink">{doc.filename}</p>
                <p className="mt-3 text-admin-body leading-relaxed text-admin-ink-muted">{doc.summary}</p>
              </div>

              <div className="rounded-[10px] border border-admin-border bg-admin-surface-alt p-4">
                <p className="mb-2 font-sans text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">
                  Included
                </p>
                <ul className="space-y-2">
                  {doc.sections.map((section) => (
                    <li key={section.title} className="text-admin-support text-admin-ink">
                      <span className="font-semibold">{section.title}</span>
                      <span className="text-admin-ink-muted">
                        {" "}
                        · {section.rows.length === 0 ? "empty" : `${section.rows.length} row${section.rows.length === 1 ? "" : "s"}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {doc.sections[0]?.rows.slice(0, 4).length ? (
                <div className="rounded-[10px] border border-admin-border bg-admin-surface-alt p-4">
                  <p className="mb-2 font-sans text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">
                    Sample rows
                  </p>
                  <div className="space-y-2">
                    {doc.sections[0].rows.slice(0, 4).map((row, index) => (
                      <p key={`${row[0]}-${index}`} className="text-admin-support text-admin-ink">
                        {row.map(previewCell).join(" · ")}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <AdminDialogFooter>
        <AdminButton variant="secondary" onClick={onClose} disabled={downloading}>
          Close
        </AdminButton>
        <AdminButton onClick={handleDownload} disabled={!doc || downloading}>
          {downloading ? "Downloading…" : "Download PDF"}
        </AdminButton>
      </AdminDialogFooter>
    </AdminDialog>
  );
}
