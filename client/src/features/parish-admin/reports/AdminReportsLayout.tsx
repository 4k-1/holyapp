import { useState } from "react";
import { Outlet, useOutletContext } from "react-router-dom";
import { emptyReportDateRange, type ReportDateRange } from "@/features/parish-admin/reports/reportsHelpers";
import type { Parish } from "@/types";

export interface ReportsOutletContext {
  parish: Parish;
  range: ReportDateRange;
  setRange: (range: ReportDateRange) => void;
}

/** Holds the date filter, so it stays put while moving between reports. */
export function AdminReportsLayout() {
  const { parish } = useOutletContext<{ parish: Parish }>();
  const [range, setRange] = useState<ReportDateRange>(emptyReportDateRange);

  return <Outlet context={{ parish, range, setRange } satisfies ReportsOutletContext} />;
}
