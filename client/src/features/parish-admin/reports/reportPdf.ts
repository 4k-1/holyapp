import type { CsvCell, ReportDocument } from "@/features/parish-admin/reports/reportDocument";

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value: CsvCell) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** The report's rows as a CSV file. The BOM lets Excel read it as UTF-8. */
export function downloadReportCsv(doc: ReportDocument) {
  const lines = [doc.csv.headers, ...doc.csv.rows].map((row) => row.map(csvCell).join(","));
  saveBlob(new Blob([`\uFEFF${lines.join("\r\n")}\r\n`], { type: "text/csv;charset=utf-8" }), `${doc.filename}.csv`);
}

const PAGE_BG = "#f2f7f8";
/** Space above the content on every page after the first, in points. */
const CONTINUED_TOP = 28;

/**
 * Save the report sheet as a landscape A4 PDF, the shape of the on-screen dashboard. Pages break at the bottom of a card or table row
 * (anything marked `data-pdf-break`) so nothing is cut through the middle of a line.
 */
export async function saveReportPdf(element: HTMLElement, filename: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
  const scale = 2;
  const canvas = await html2canvas(element, {
    scale,
    backgroundColor: PAGE_BG,
    logging: false,
    useCORS: true,
    // html2canvas sets small text a little low against flex-centred dots and pills; nudge those back in its copy.
    onclone: (clone) => {
      clone.querySelectorAll<HTMLElement>("[data-pdf-nudge]").forEach((node) => {
        node.style.position = "relative";
        node.style.top = `${node.dataset.pdfNudge}px`;
      });
    },
  });

  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const ptPerPx = pageWidth / element.offsetWidth;
  const totalPx = element.offsetHeight;

  // A sheet only a little taller than the page is shrunk onto one page rather than spilling a row or two.
  if (totalPx * ptPerPx <= pageHeight * 1.15) {
    const fit = Math.min(1, pageHeight / (totalPx * ptPerPx));
    const width = pageWidth * fit;
    pdf.setFillColor(PAGE_BG);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");
    pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", (pageWidth - width) / 2, 0, width, totalPx * ptPerPx * fit);
    pdf.save(`${filename}.pdf`);
    return;
  }

  const top = element.getBoundingClientRect().top;
  const breaks = Array.from(element.querySelectorAll<HTMLElement>("[data-pdf-break]"))
    .map((node) => node.getBoundingClientRect().bottom - top)
    .sort((a, b) => a - b);

  let start = 0;
  let page = 0;
  while (start < totalPx - 1) {
    const offsetPt = page === 0 ? 0 : CONTINUED_TOP;
    const room = (pageHeight - offsetPt) / ptPerPx;
    let end = start + room;
    if (end >= totalPx) {
      end = totalPx;
    } else {
      const fit = breaks.filter((b) => b > start + 40 && b <= end);
      if (fit.length) end = fit[fit.length - 1] + 1;
    }

    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    slice.height = Math.ceil((end - start) * scale);
    const ctx = slice.getContext("2d");
    if (!ctx) throw new Error("Could not draw the PDF page.");
    ctx.fillStyle = PAGE_BG;
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, Math.floor(start * scale), canvas.width, slice.height, 0, 0, slice.width, slice.height);

    if (page > 0) pdf.addPage();
    pdf.setFillColor(PAGE_BG);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");
    // JPEG keeps a page to a few hundred KB; PNG at this scale runs to megabytes.
    pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", 0, offsetPt, pageWidth, (end - start) * ptPerPx);

    start = end;
    page += 1;
  }

  pdf.save(`${filename}.pdf`);
}
