import { useOutletContext } from "react-router-dom";
import { getSacramentYearly } from "@/features/parish-admin/reports/api/reportsApi";
import {
  ChartEmpty,
  ChartPanel,
  ReportRowChart,
  ReportStackedBarChart,
} from "@/features/parish-admin/reports/ReportCharts";
import type { ReportsOutletContext } from "@/features/parish-admin/reports/AdminReportsLayout";
import { countPhrase, SACRAMENT_SERIES, sum } from "@/features/parish-admin/reports/reportsHelpers";
import { useAsync } from "@/hooks/useAsync";

export function AdminSacramentsReportPage() {
  const { parish, range, period } = useOutletContext<ReportsOutletContext>();
  const { data: rows = [], loading } = useAsync(() => getSacramentYearly(parish.id, range), [
    parish.id,
    range.from,
    range.to,
  ]);

  const totals = {
    baptism: sum(rows.map((row) => row.baptism)),
    confirmation: sum(rows.map((row) => row.confirmation)),
    marriage: sum(rows.map((row) => row.marriage)),
    death: sum(rows.map((row) => row.death)),
  };
  const all = totals.baptism + totals.confirmation + totals.marriage + totals.death;

  if (loading) {
    return <p className="text-admin-body text-admin-ink-muted">Loading this report…</p>;
  }

  return (
    <div className="grid gap-4">
      <p className="text-admin-body text-admin-ink-muted">
        {countPhrase(totals.baptism, "baptism")}, {countPhrase(totals.confirmation, "confirmation")},{" "}
        {countPhrase(totals.marriage, "marriage")}, and {countPhrase(totals.death, "death")} for {period}.
      </p>

      <ChartPanel
        title="By year"
        caption="Each column is a year in the register. Hover a band to read that sacrament’s count."
      >
        {all === 0 ? (
          <ChartEmpty message={`No sacraments for ${period}. Widen the dates, or leave them empty.`} />
        ) : (
          <ReportStackedBarChart
            series={[...SACRAMENT_SERIES]}
            points={rows.map((row) => ({
              key: String(row.year),
              label: String(row.year),
              values: {
                baptism: row.baptism,
                confirmation: row.confirmation,
                marriage: row.marriage,
                death: row.death,
              },
            }))}
          />
        )}
      </ChartPanel>

      <ChartPanel title="Totals in this period">
        {all === 0 ? (
          <ChartEmpty message={`No sacraments for ${period}.`} />
        ) : (
          <ReportRowChart
            points={SACRAMENT_SERIES.map((item) => ({
              key: item.id,
              label: item.label,
              value: totals[item.id],
            }))}
          />
        )}
      </ChartPanel>
    </div>
  );
}
