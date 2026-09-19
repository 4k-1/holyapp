import { useOutletContext } from "react-router-dom";
import { formatAmount } from "@/features/parish-admin/donations/donationsHelpers";
import { getDonationMonthly } from "@/features/parish-admin/reports/api/reportsApi";
import {
  ChartEmpty,
  ChartPanel,
  ReportLineChart,
  ReportRowChart,
} from "@/features/parish-admin/reports/ReportCharts";
import type { ReportsOutletContext } from "@/features/parish-admin/reports/AdminReportsLayout";
import { formatMonthLabel, formatPeso, sum } from "@/features/parish-admin/reports/reportsHelpers";
import { useAsync } from "@/hooks/useAsync";

export function AdminDonationsReportPage() {
  const { parish, range, period } = useOutletContext<ReportsOutletContext>();
  const { data: rows = [], loading } = useAsync(() => getDonationMonthly(parish.id, range), [
    parish.id,
    range.from,
    range.to,
  ]);

  const total = sum(rows.map((row) => row.amount));

  if (loading) {
    return <p className="text-admin-body text-admin-ink-muted">Loading this report…</p>;
  }

  return (
    <div className="grid gap-4">
      <p className="text-admin-body text-admin-ink-muted">
        Gifts recorded for {period} total {formatAmount(total)}.
      </p>

      <ChartPanel title="Amount by month" caption="Pesos received, month by month.">
        {rows.length === 0 ? (
          <ChartEmpty message={`No donations for ${period}. Widen the dates, or leave them empty.`} />
        ) : (
          <ReportLineChart
            points={rows.map((row) => ({
              key: row.month,
              label: formatMonthLabel(row.month),
              value: row.amount,
            }))}
            formatValue={formatPeso}
          />
        )}
      </ChartPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartPanel title="By purpose">
          {total === 0 ? (
            <ChartEmpty message={`No donations for ${period}.`} />
          ) : (
            <ReportRowChart
              formatValue={formatPeso}
              points={[
                { key: "roof", label: "Church roof repair", value: sum(rows.map((row) => row.roof)) },
                { key: "offertory", label: "Sunday offertory", value: sum(rows.map((row) => row.offertory)) },
                { key: "sound", label: "Sound system fund", value: sum(rows.map((row) => row.sound)) },
                { key: "outreach", label: "Outreach for the poor", value: sum(rows.map((row) => row.outreach)) },
              ]}
            />
          )}
        </ChartPanel>
        <ChartPanel title="By type">
          {total === 0 ? (
            <ChartEmpty message={`No donations for ${period}.`} />
          ) : (
            <ReportRowChart
              formatValue={formatPeso}
              points={[
                { key: "cash", label: "Cash", value: sum(rows.map((row) => row.cash)) },
                { key: "gcash", label: "GCash", value: sum(rows.map((row) => row.gcash)) },
              ]}
            />
          )}
        </ChartPanel>
      </div>
    </div>
  );
}
