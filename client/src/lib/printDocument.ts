/** Escapes text for HTML built by hand (printed papers). */
export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const PAPER_STYLES = `
  @page { size: A4; margin: 22mm 20mm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, "Times New Roman", serif; color: #1a1a1a; font-size: 12.5pt; line-height: 1.55; margin: 0; padding: 24px; }
  header { text-align: center; margin-bottom: 22px; }
  /* A long parish name breaks into lines of even length, not one stray word on the second line. */
  header .parish { font-size: 15pt; font-weight: bold; letter-spacing: 0.02em; text-wrap: balance; max-width: 34em; margin: 0 auto; }
  header .small { font-size: 10.5pt; color: #444; }
  h1 { text-align: center; font-size: 17pt; letter-spacing: 0.08em; text-transform: uppercase; margin: 18px 0 6px; }
  .sub { text-align: center; color: #444; margin: 0 0 22px; }
  .couple { margin: 0 0 16px; }
  .names { font-weight: bold; text-transform: uppercase; }
  .notice { margin-top: 26px; font-style: italic; }
  .sign { margin-top: 64px; width: 260px; margin-left: auto; text-align: center; border-top: 1px solid #1a1a1a; padding-top: 6px; }
  .signoff { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 48px; break-inside: avoid; }
  .signoff .sign { margin-top: 0; margin-left: 0; }
  .seal { width: 32mm; height: 32mm; border: 1px dashed #9a9a9a; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9pt; color: #8a8a8a; letter-spacing: 0.04em; }
  .sign .title { font-size: 10.5pt; color: #444; }
  @media print { body { padding: 0; } }
`;

/** Opens a paper in a new window and prints it. Text in `bodyHtml` must already be escaped. */
export function printDocument(title: string, bodyHtml: string) {
  const win = window.open("", "_blank", "width=820,height=1000");
  if (!win) throw new Error("Allow pop-ups for this site to print.");
  win.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>` +
      `<style>${PAPER_STYLES}</style></head><body>${bodyHtml}</body></html>`
  );
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}
