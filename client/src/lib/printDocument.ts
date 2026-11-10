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
  header .parish { font-size: 15pt; font-weight: bold; letter-spacing: 0.02em; }
  header .small { font-size: 10.5pt; color: #444; }
  h1 { text-align: center; font-size: 17pt; letter-spacing: 0.08em; text-transform: uppercase; margin: 18px 0 6px; }
  .sub { text-align: center; color: #444; margin: 0 0 22px; }
  .couple { margin: 0 0 16px; }
  .names { font-weight: bold; text-transform: uppercase; }
  .notice { margin-top: 26px; font-style: italic; }
  .sign { margin-top: 64px; width: 260px; margin-left: auto; text-align: center; border-top: 1px solid #1a1a1a; padding-top: 6px; }
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
