import type { ReportPdfDocument } from "@/features/parish-admin/reports/reportDocument";

/**
 * Tiny text PDF writer for office reports — no third-party PDF library.
 * Uses Helvetica / WinAnsi so stick to ASCII-friendly values in the document.
 */

function pdfEscape(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function toWinAnsi(text: string) {
  return text
    .replace(/₱/g, "PHP ")
    .replace(/–/g, "-")
    .replace(/—/g, "-")
    .replace(/’/g, "'")
    .replace(/‘/g, "'")
    .replace(/“/g, '"')
    .replace(/”/g, '"')
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E]/g, "?");
}

function wrapText(text: string, maxChars: number) {
  const words = toWinAnsi(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function buildPageContents(doc: ReportPdfDocument) {
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 48;
  const maxWidth = pageWidth - margin * 2;
  const pages: string[] = [];
  let ops: string[] = [];
  let y = pageHeight - margin;

  function flushPage() {
    pages.push(ops.join("\n"));
    ops = [];
    y = pageHeight - margin;
  }

  function ensureSpace(needed: number) {
    if (y - needed < margin) flushPage();
  }

  function writeText(text: string, size: number, opts?: { bold?: boolean; gap?: number }) {
    const font = opts?.bold ? "F2" : "F1";
    const wrapped = wrapText(text, Math.floor(maxWidth / (size * 0.5)));
    for (const line of wrapped) {
      ensureSpace(size + 4);
      ops.push("BT", `/${font} ${size} Tf`, `${margin} ${y} Td`, `(${pdfEscape(line)}) Tj`, "ET");
      y -= size + 4;
    }
    if (opts?.gap) y -= opts.gap;
  }

  function writeTable(headers: string[], rows: string[][]) {
    const colCount = Math.max(headers.length, 1);
    const colWidth = maxWidth / colCount;
    const rowHeight = 16;

    const drawRow = (cells: string[], header: boolean) => {
      ensureSpace(rowHeight + 2);
      let x = margin;
      for (const cell of cells) {
        const clipped = toWinAnsi(cell).slice(0, Math.max(4, Math.floor(colWidth / 5.2)));
        ops.push(
          "BT",
          `/${header ? "F2" : "F1"} 9 Tf`,
          `${x + 2} ${y - 11} Td`,
          `(${pdfEscape(clipped)}) Tj`,
          "ET"
        );
        x += colWidth;
      }
      y -= rowHeight;
    };

    y -= 2;
    drawRow(headers, true);
    ops.push(`${margin} ${y + 2} m ${margin + maxWidth} ${y + 2} l S`);
    y -= 4;
    for (const row of rows) drawRow(row, false);
    y -= 10;
  }

  writeText(doc.parishName, 11, { bold: true, gap: 2 });
  writeText(`${doc.title} report`, 18, { bold: true, gap: 4 });
  writeText(`Period: ${doc.period}`, 10, { gap: 1 });
  writeText(`Generated: ${doc.generatedOn}`, 10, { gap: 8 });
  writeText(doc.summary, 11, { gap: 14 });

  if (doc.sections.every((section) => section.rows.length === 0)) {
    writeText("No entries for this period.", 11);
  } else {
    for (const section of doc.sections) {
      writeText(section.title, 13, { bold: true, gap: 6 });
      if (section.rows.length === 0) {
        writeText("No entries.", 10, { gap: 10 });
      } else {
        writeTable(section.headers, section.rows);
      }
    }
  }

  flushPage();
  return { pages, pageWidth, pageHeight };
}

export function buildReportPdfBlob(doc: ReportPdfDocument): Blob {
  const { pages, pageWidth, pageHeight } = buildPageContents(doc);
  const encoder = new TextEncoder();

  type Piece = { id: number; body: Uint8Array };
  const pieces: Piece[] = [];
  let nextId = 1;

  function add(body: string) {
    const id = nextId++;
    pieces.push({ id, body: encoder.encode(body) });
    return id;
  }

  const catalogId = add(""); // fill later
  const pagesId = add(""); // fill later
  const fontRegularId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const fontBoldId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  const pageIds: number[] = [];
  for (const content of pages) {
    const streamBytes = encoder.encode(content);
    const contentId = add(
      `<< /Length ${streamBytes.length} >>\nstream\n${content}\nendstream`
    );
    const pageId = add(
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] ` +
        `/Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> ` +
        `/Contents ${contentId} 0 R >>`
    );
    pageIds.push(pageId);
    void contentId;
  }

  const catalogBody = encoder.encode(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  const pagesBody = encoder.encode(
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`
  );
  pieces[0] = { id: catalogId, body: catalogBody };
  pieces[1] = { id: pagesId, body: pagesBody };

  const header = encoder.encode("%PDF-1.4\n");
  const chunks: Uint8Array[] = [header];
  let offset = header.length;
  const offsets: number[] = [0];

  for (const piece of pieces) {
    offsets[piece.id] = offset;
    const objHeader = encoder.encode(`${piece.id} 0 obj\n`);
    const objFooter = encoder.encode("\nendobj\n");
    chunks.push(objHeader, piece.body, objFooter);
    offset += objHeader.length + piece.body.length + objFooter.length;
  }

  const xrefStart = offset;
  let xref = `xref\n0 ${pieces.length + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= pieces.length; id++) {
    xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${pieces.length + 1} /Root ${catalogId} 0 R >>\n`;
  xref += `startxref\n${xrefStart}\n%%EOF`;
  chunks.push(encoder.encode(xref));

  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let cursor = 0;
  for (const chunk of chunks) {
    out.set(chunk, cursor);
    cursor += chunk.length;
  }
  return new Blob([out], { type: "application/pdf" });
}

export function downloadReportPdf(doc: ReportPdfDocument) {
  const blob = buildReportPdfBlob(doc);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = doc.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function reportPdfObjectUrl(doc: ReportPdfDocument) {
  return URL.createObjectURL(buildReportPdfBlob(doc));
}
