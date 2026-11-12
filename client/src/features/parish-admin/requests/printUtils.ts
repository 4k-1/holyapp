import {
  CERT_BLACKLETTER_STYLESHEET,
  CERT_SERIF,
  CERT_SERIF_STYLESHEET,
} from "@/features/parish-admin/components/certificate/constants";

/**
 * Prints an element's HTML. Prefers a popup so staff can see the copy;
 * falls back to a hidden iframe when the browser blocks window.open.
 * Because the print document doesn't inherit the app's stylesheet, only INLINE
 * styles on the element (and its children) will render correctly.
 */
function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const CERTIFICATE_SHEETS = ".pcert, .mcert";

/**
 * The printed certificates (ParishCertificate, and Form 97 for marriage) are styled by class,
 * with their own paper size, so their stylesheets go into the print document with them.
 */
function parishCertificateCss(el: HTMLElement) {
  if (!el.matches(CERTIFICATE_SHEETS) && !el.querySelector(CERTIFICATE_SHEETS)) return "";
  const css: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    let text: string;
    try {
      text = Array.from(sheet.cssRules, (rule) => rule.cssText).join("\n");
    } catch {
      continue; // a stylesheet from another origin
    }
    if (text.includes(".pcert") || text.includes(".mcert")) css.push(text);
  }
  return `${css.join("\n")}
  .print-shell { max-width: none; width: max-content; }
  @media print { .print-shell { margin: 0; } }`;
}

function printDocumentHtml(el: HTMLElement, docTitle: string) {
  return `<!DOCTYPE html>
<html>
<head>
<title>${escapeHtml(docTitle)}</title>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="${CERT_SERIF_STYLESHEET}" rel="stylesheet" />
<link href="${CERT_BLACKLETTER_STYLESHEET}" rel="stylesheet" />
<style>
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #ececec;
    font-family: ${CERT_SERIF};
  }
  .print-shell { max-width: 660px; margin: 32px auto; }
  @media print {
    html, body { background: #fff; }
    .print-shell { margin: 0 auto; }
  }
${parishCertificateCss(el)}
</style>
</head>
<body><div class="print-shell">${el.outerHTML}</div></body>
</html>`;
}

function printFromIframe(html: string) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();
  win.focus();
  setTimeout(() => {
    win.print();
    iframe.remove();
  }, 250);
}

export function printElement(el: HTMLElement, docTitle: string) {
  const html = printDocumentHtml(el, docTitle);
  const w = window.open("", "_blank", "width=860,height=1000");
  if (!w) {
    printFromIframe(html);
    return;
  }

  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => {
    w.print();
    w.close();
  }, 250);
}

/**
 * Waits until the issued copy has been drawn (QR code in place, no specimen watermark), so a copy
 * printed straight after issuing doesn't go out with a blank QR box. Gives up after `timeoutMs`.
 */
export async function waitForQrCode(getEl: () => HTMLElement | null, timeoutMs = 4000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const el = getEl();
    const box = el?.querySelector(".pcert__qr");
    const ready =
      el &&
      !el.querySelector(".cert-specimen") &&
      box &&
      !box.classList.contains("pcert__qr--placeholder") &&
      (box.querySelector("img") as HTMLImageElement | null)?.complete;
    if (ready) return;
    await new Promise((resolve) => setTimeout(resolve, 60));
  }
}
