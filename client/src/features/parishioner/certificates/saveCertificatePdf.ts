import { CERT_PAPER } from "@/features/parish-admin/components/certificate/constants";

/** Save the on-screen certificate sheet as a one-page PDF. */
export async function saveCertificatePdf(element: HTMLElement, filename: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: CERT_PAPER,
    logging: false,
  });
  const image = canvas.toDataURL("image/png");
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
