import { CERT_PAPER } from "@/features/parish-admin/components/certificate/constants";

/** Save the on-screen certificate sheet as a PDF at its real paper size. */
export async function saveCertificatePdf(element: HTMLElement, filename: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
  // The Certificate of Marriage (Form 97) is two pages of 8.5 × 13 in: one PDF page each.
  const formPages = Array.from(element.querySelectorAll<HTMLElement>(".mcert__page"));
  if (formPages.length > 0) {
    const sheet = new jsPDF({ orientation: "portrait", unit: "pt", format: [612, 936] });
    for (const [i, page] of formPages.entries()) {
      const canvas = await html2canvas(page, { scale: 3, backgroundColor: "#ffffff", logging: false });
      if (i > 0) sheet.addPage([612, 936], "portrait");
      sheet.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 612, 936);
    }
    sheet.save(filename);
    return;
  }
  // The parish certificates are drawn at their real paper size: fill one page of that size.
  const paper = element.matches(".pcert--a5") ? "a5" : element.matches(".pcert--letter") ? "letter" : null;
  const canvas = await html2canvas(element, {
    scale: paper ? 3 : 2,
    backgroundColor: paper ? "#ffffff" : CERT_PAPER,
    logging: false,
  });
  const image = canvas.toDataURL("image/png");
  if (paper) {
    const sheet = new jsPDF({ orientation: "portrait", unit: "pt", format: paper });
    const w = sheet.internal.pageSize.getWidth();
    const h = sheet.internal.pageSize.getHeight();
    sheet.addImage(image, "PNG", 0, 0, w, h);
    sheet.save(filename);
    return;
  }
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 28;
  const maxWidth = pageWidth - margin * 2;
  const maxHeight = pageHeight - margin * 2;
  const scale = Math.min(maxWidth / canvas.width, maxHeight / canvas.height);
  const width = canvas.width * scale;
  const height = canvas.height * scale;
  const x = (pageWidth - width) / 2;
  const y = margin;
  pdf.addImage(image, "PNG", x, y, width, height);
  pdf.save(filename);
}
