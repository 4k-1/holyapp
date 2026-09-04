import { useState } from "react";
import { Outlet, useLocation, useOutletContext } from "react-router-dom";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { AdminReportPrintModal } from "@/features/parish-admin/reports/AdminReportPrintModal";
import {
  emptyReportDateRange,
  normalizeReportRange,
  REPORT_SECTIONS,
  reportPeriodLabel,
  type ReportDateRange,
} from "@/features/parish-admin/reports/reportsHelpers";
import type { Parish } from "@/types";

export interface ReportsOutletContext {
  parish: Parish;
  range: ReportDateRange;
  period: string;
}

export function AdminReportsLayout() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const { pathname } = useLocation();
  const section =
    REPORT_SECTIONS.find((item) => pathname.includes(`/reports/${item.path}`)) ?? REPORT_SECTIONS[0];
  const [draftRange, setDraftRange] = useState<ReportDateRange>(emptyReportDateRange);
  const [appliedRange, setAppliedRange] = useState<ReportDateRange>(emptyReportDateRange);
  const [printOpen, setPrintOpen] = useState(false);
  const period = reportPeriodLabel(appliedRange);
  const rangeActive = Boolean(appliedRange.from || appliedRange.to);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-admin-page font-semibold text-admin-ink">{section.label}</h1>
          <p className="mt-1 text-admin-body text-admin-ink-muted">{section.blurb}</p>
        </div>
        <AdminButton variant="secondary" onClick={() => setPrintOpen(true)}>
          Print
        </AdminButton>
      </div>

      <AdminCard className="mb-4 p-5 px-[22px]">
        <h2 className="mb-3.5 font-sans text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">
          Date range
        </h2>
        <div className="flex flex-wrap items-end gap-4">
          <AdminField label="From" className="mb-0 w-[160px]">
            <AdminInput
              type="date"
              value={draftRange.from}
              onChange={(e) => setDraftRange((prev) => ({ ...prev, from: e.target.value }))}
            />
          </AdminField>
          <AdminField label="To" className="mb-0 w-[160px]">
            <AdminInput
              type="date"
              value={draftRange.to}
              onChange={(e) => setDraftRange((prev) => ({ ...prev, to: e.target.value }))}
            />
          </AdminField>
          <AdminButton onClick={() => setAppliedRange(normalizeReportRange(draftRange))}>
            Apply
          </AdminButton>
          {rangeActive && (
            <button
              type="button"
              onClick={() => {
                const empty = emptyReportDateRange();
                setDraftRange(empty);
                setAppliedRange(empty);
              }}
              className="mb-0.5 text-admin-support font-semibold text-admin-green-700 hover:underline"
            >
              Clear dates
            </button>
          )}
        </div>
        <p className="mt-3 text-admin-support text-admin-ink-muted">
          Showing {period}. Leave both dates empty to include every year on file.
        </p>
      </AdminCard>

      <Outlet context={{ parish, range: appliedRange, period } satisfies ReportsOutletContext} />

      {printOpen && (
        <AdminReportPrintModal
          parish={parish}
          kind={section.id}
          range={appliedRange}
          period={period}
          onClose={() => setPrintOpen(false)}
        />
      )}
    </div>
  );
}
