import { useOutletContext } from "react-router-dom";
import { formatAmount } from "@/features/parish-admin/donations/donationsHelpers";
import { getIntentionMonthly } from "@/features/parish-admin/reports/api/reportsApi";
import {
  ChartEmpty,
  ChartPanel,
  ReportBarChart,
  ReportLineChart,
  ReportRowChart,
} from "@/features/parish-admin/reports/ReportCharts";
import type { ReportsOutletContext } from "@/features/parish-admin/reports/AdminReportsLayout";
import { countPhrase, formatMonthLabel, formatPeso, sum } from "@/features/parish-admin/reports/reportsHelpers";
import { useAsync } from "@/hooks/useAsync";

export function AdminIntentionsReportPage() {
  const { parish, range, period } = useOutletContext<ReportsOutletContext>();
  const { data: rows = [], loading } = useAsync(() => getIntentionMonthly(parish.id, range), [
    parish.id,
    range.from,
    range.to,
  ]);

  const total = sum(rows.map((row) => row.pending + row.confirmed + row.said));
  const said = sum(rows.map((row) => row.said));
  const offering = sum(rows.map((row) => row.offering));

  if (loading) {
    return <p className="text-admin-body text-admin-ink-muted">Loading this report…</p>;
  }

  return (
    <div className="grid gap-4">
      <p className="text-admin-body text-admin-ink-muted">
        {countPhrase(total, "Mass intention")} for {period} — {said} already said. Offerings{" "}
        {formatAmount(offering)}.
      </p>

      <ChartPanel title="Intentions by month" caption="How many intentions were booked onto Masses.">
        {rows.length === 0 ? (
          <ChartEmpty message={`No Mass intentions for ${period}. Widen the dates, or leave them empty.`} />
        ) : (
          <ReportBarChart
            points={rows.map((row) => ({
              key: row.month,
              label: formatMonthLabel(row.month),
              value: row.pending + row.confirmed + row.said,
            }))}
          />
        )}
      </ChartPanel>

      <ChartPanel title="Offerings by month">
        {rows.length === 0 ? (
          <ChartEmpty message={`No offerings for ${period}.`} />
        ) : (
          <ReportLineChart
            points={rows.map((row) => ({
              key: row.month,
              label: formatMonthLabel(row.month),
              value: row.offering,
            }))}
            formatValue={formatPeso}
          />
        )}
      </ChartPanel>

      <ChartPanel title="By status">
        {total === 0 ? (
          <ChartEmpty message={`No Mass intentions for ${period}.`} />
        ) : (
          <ReportRowChart
            points={[
              { key: "said", label: "Said", value: said },
              { key: "confirmed", label: "Confirmed", value: sum(rows.map((row) => row.confirmed)) },
              { key: "pending", label: "Pending", value: sum(rows.map((row) => row.pending)) },
            ]}
          />
        )}
      </ChartPanel>
    </div>
  );
}
