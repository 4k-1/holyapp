import { useOutletContext } from "react-router-dom";
import { getCertificateMonthly } from "@/features/parish-admin/reports/api/reportsApi";
import {
  ChartEmpty,
  ChartPanel,
  ReportLineChart,
  ReportRowChart,
} from "@/features/parish-admin/reports/ReportCharts";
import type { ReportsOutletContext } from "@/features/parish-admin/reports/AdminReportsLayout";
import {
  countPhrase,
  formatMonthLabel,
  SACRAMENT_SERIES,
  sum,
} from "@/features/parish-admin/reports/reportsHelpers";
import { useAsync } from "@/hooks/useAsync";

export function AdminCertificatesReportPage() {
  const { parish, range, period } = useOutletContext<ReportsOutletContext>();
  const { data: rows = [], loading } = useAsync(() => getCertificateMonthly(parish.id, range), [
    parish.id,
    range.from,
    range.to,
  ]);

  const total = sum(rows.map((row) => row.pending + row.processing + row.released + row.rejected));
  const released = sum(rows.map((row) => row.released));
  const inOffice = sum(rows.map((row) => row.pending + row.processing));

  if (loading) {
    return <p className="text-admin-body text-admin-ink-muted">Loading this report…</p>;
  }

  return (
    <div className="grid gap-4">
      <p className="text-admin-body text-admin-ink-muted">
        {countPhrase(total, "certificate request")} for {period} — {released} released, {inOffice} still in
        the office.
      </p>

      <ChartPanel title="Requests by month" caption="How many certificates the office took in each month.">
        {rows.length === 0 ? (
          <ChartEmpty message={`No certificate requests for ${period}. Widen the dates, or leave them empty.`} />
        ) : (
          <ReportLineChart
            points={rows.map((row) => ({
              key: row.month,
              label: formatMonthLabel(row.month),
              value: row.pending + row.processing + row.released + row.rejected,
            }))}
          />
        )}
      </ChartPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartPanel title="By sacrament">
          {total === 0 ? (
            <ChartEmpty message={`No requests for ${period}.`} />
          ) : (
            <ReportRowChart
              points={SACRAMENT_SERIES.map((item) => ({
                key: item.id,
                label: item.label,
                value: sum(rows.map((row) => row[item.id])),
              }))}
            />
          )}
        </ChartPanel>
        <ChartPanel title="By status">
          {total === 0 ? (
            <ChartEmpty message={`No requests for ${period}.`} />
          ) : (
            <ReportRowChart
              points={[
                { key: "released", label: "Released", value: released },
                { key: "processing", label: "Processing", value: sum(rows.map((row) => row.processing)) },
                { key: "pending", label: "Pending", value: sum(rows.map((row) => row.pending)) },
                { key: "rejected", label: "Rejected", value: sum(rows.map((row) => row.rejected)) },
              ]}
            />
          )}
        </ChartPanel>
      </div>
    </div>
  );
}
