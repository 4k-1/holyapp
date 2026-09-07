import { formatAmount } from "@/features/parish-admin/donations/donationsHelpers";
import {
  getCertificateMonthly,
  getDonationMonthly,
  getIntentionMonthly,
  getSacramentYearly,
} from "@/features/parish-admin/reports/api/reportsApi";
import {
  countPhrase,
  formatMonthLabel,
  REPORT_SECTIONS,
  SACRAMENT_SERIES,
  sum,
  type ReportDateRange,
  type ReportKind,
} from "@/features/parish-admin/reports/reportsHelpers";

export interface ReportPdfSection {
  title: string;
  rows: string[][];
  headers: string[];
}

export interface ReportPdfDocument {
  kind: ReportKind;
  title: string;
  parishName: string;
  period: string;
  generatedOn: string;
  summary: string;
  sections: ReportPdfSection[];
  filename: string;
}

function slugDate() {
  return new Date().toISOString().slice(0, 10);
}

function pesoForPdf(amount: number) {
  return `PHP ${Math.round(amount).toLocaleString()}`;
}

export async function buildReportDocument(
  kind: ReportKind,
  parish: { id: string; name: string },
  range: ReportDateRange,
  period: string
): Promise<ReportPdfDocument> {
  const meta = REPORT_SECTIONS.find((section) => section.id === kind) ?? REPORT_SECTIONS[0];
  const generatedOn = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const filename = `${kind}-report-${slugDate()}.pdf`;

  if (kind === "sacraments") {
    const rows = await getSacramentYearly(parish.id, range);
    const totals = {
      baptism: sum(rows.map((row) => row.baptism)),
      confirmation: sum(rows.map((row) => row.confirmation)),
      marriage: sum(rows.map((row) => row.marriage)),
      death: sum(rows.map((row) => row.death)),
    };
    return {
      kind,
      title: meta.label,
      parishName: parish.name,
      period,
      generatedOn,
      summary: `${countPhrase(totals.baptism, "baptism")}, ${countPhrase(totals.confirmation, "confirmation")}, ${countPhrase(totals.marriage, "marriage")}, and ${countPhrase(totals.death, "death")} for ${period}.`,
      filename,
      sections: [
        {
          title: "By year",
          headers: ["Year", "Baptism", "Confirmation", "Marriage", "Death", "Total"],
          rows: rows.map((row) => [
            String(row.year),
            String(row.baptism),
            String(row.confirmation),
            String(row.marriage),
            String(row.death),
            String(row.baptism + row.confirmation + row.marriage + row.death),
          ]),
        },
        {
          title: "Totals in this period",
          headers: ["Sacrament", "Count"],
          rows: SACRAMENT_SERIES.map((item) => [item.label, String(totals[item.id])]),
        },
      ],
    };
  }

  if (kind === "certificates") {
    const rows = await getCertificateMonthly(parish.id, range);
    const total = sum(rows.map((row) => row.pending + row.processing + row.released + row.rejected));
    const released = sum(rows.map((row) => row.released));
    const inOffice = sum(rows.map((row) => row.pending + row.processing));
    return {
      kind,
      title: meta.label,
      parishName: parish.name,
      period,
      generatedOn,
      summary: `${countPhrase(total, "certificate request")} for ${period} — ${released} released, ${inOffice} still in the office.`,
      filename,
      sections: [
        {
          title: "Requests by month",
          headers: ["Month", "Pending", "Processing", "Released", "Rejected", "Total"],
          rows: rows.map((row) => [
            formatMonthLabel(row.month),
            String(row.pending),
            String(row.processing),
            String(row.released),
            String(row.rejected),
            String(row.pending + row.processing + row.released + row.rejected),
          ]),
        },
        {
          title: "By sacrament",
          headers: ["Sacrament", "Count"],
          rows: SACRAMENT_SERIES.map((item) => [item.label, String(sum(rows.map((row) => row[item.id])))]),
        },
        {
          title: "By status",
          headers: ["Status", "Count"],
          rows: [
            ["Released", String(released)],
            ["Processing", String(sum(rows.map((row) => row.processing)))],
            ["Pending", String(sum(rows.map((row) => row.pending)))],
            ["Rejected", String(sum(rows.map((row) => row.rejected)))],
          ],
        },
      ],
    };
  }

  if (kind === "donations") {
    const rows = await getDonationMonthly(parish.id, range);
    const total = sum(rows.map((row) => row.amount));
    return {
      kind,
      title: meta.label,
      parishName: parish.name,
      period,
      generatedOn,
      summary: `Gifts recorded for ${period} total ${formatAmount(total)}.`,
      filename,
      sections: [
        {
          title: "Amount by month",
          headers: ["Month", "Amount", "Cash", "GCash"],
          rows: rows.map((row) => [
            formatMonthLabel(row.month),
            pesoForPdf(row.amount),
            pesoForPdf(row.cash),
            pesoForPdf(row.gcash),
          ]),
        },
        {
          title: "By purpose",
          headers: ["Purpose", "Amount"],
          rows: [
            ["Church roof repair", pesoForPdf(sum(rows.map((row) => row.roof)))],
            ["Sunday offertory", pesoForPdf(sum(rows.map((row) => row.offertory)))],
            ["Sound system fund", pesoForPdf(sum(rows.map((row) => row.sound)))],
            ["Outreach for the poor", pesoForPdf(sum(rows.map((row) => row.outreach)))],
          ],
        },
        {
          title: "By type",
          headers: ["Type", "Amount"],
          rows: [
            ["Cash", pesoForPdf(sum(rows.map((row) => row.cash)))],
            ["GCash", pesoForPdf(sum(rows.map((row) => row.gcash)))],
          ],
        },
      ],
    };
  }

  const rows = await getIntentionMonthly(parish.id, range);
  const total = sum(rows.map((row) => row.pending + row.confirmed + row.said));
  const said = sum(rows.map((row) => row.said));
  const offering = sum(rows.map((row) => row.offering));
  return {
    kind,
    title: meta.label,
    parishName: parish.name,
    period,
    generatedOn,
    summary: `${countPhrase(total, "Mass intention")} for ${period} — ${said} already said. Offerings ${formatAmount(offering)}.`,
    filename,
    sections: [
      {
        title: "Intentions by month",
        headers: ["Month", "Pending", "Confirmed", "Said", "Total", "Offerings"],
        rows: rows.map((row) => [
          formatMonthLabel(row.month),
          String(row.pending),
          String(row.confirmed),
          String(row.said),
          String(row.pending + row.confirmed + row.said),
          pesoForPdf(row.offering),
        ]),
      },
      {
        title: "By status",
        headers: ["Status", "Count"],
        rows: [
          ["Said", String(said)],
          ["Confirmed", String(sum(rows.map((row) => row.confirmed)))],
          ["Pending", String(sum(rows.map((row) => row.pending)))],
        ],
      },
    ],
  };
}
