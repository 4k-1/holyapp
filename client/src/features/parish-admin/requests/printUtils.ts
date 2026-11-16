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
/** Class names used only by the printed certificates, their specimen mark and the preview frame. */
const CERTIFICATE_SELECTOR = /\.(pcert|mcert|mf-|cert-specimen|cert-fit-sheet)/;
/** The certificates' named paper sizes (parish-cert-a5, parish-cert-letter, marriage-cert-long). */
const CERTIFICATE_PAGE = /cert/;

/**
 * The certificate rules from a list of CSS rules, keeping the @media / @layer / @supports blocks around them.
 * Everything else is left out: on the built site all the app's CSS is one file, and its print rules for
 * other sheets ("hide everything that isn't a .print-sheet", A4 page sizes) would blank or resize the
 * certificate when it prints, so the browser's print preview wouldn't match the screen.
 */
function certificateRules(rules: CSSRuleList): string[] {
  const kept: string[] = [];
  for (const rule of Array.from(rules)) {
    if (rule instanceof CSSStyleRule) {
      if (CERTIFICATE_SELECTOR.test(rule.selectorText)) kept.push(rule.cssText);
    } else if (rule instanceof CSSPageRule) {
      if (CERTIFICATE_PAGE.test(rule.selectorText)) kept.push(rule.cssText);
    } else if ("cssRules" in rule && rule.cssRules instanceof CSSRuleList) {
      // @media, @supports, @layer, @container: keep the block if anything inside it is kept.
      const inner = certificateRules(rule.cssRules);
      if (inner.length) kept.push(`${rule.cssText.slice(0, rule.cssText.indexOf("{"))}{\n${inner.join("\n")}\n}`);
    }
  }
  return kept;
}

/**
 * The printed certificates (ParishCertificate, and Form 97 for marriage) are styled by class, with their
 * own paper size, so their rules go into the print document with them, and nothing else from the app.
 */
function parishCertificateCss(el: HTMLElement) {
  if (!el.matches(CERTIFICATE_SHEETS) && !el.querySelector(CERTIFICATE_SHEETS)) return "";
  const css: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      css.push(...certificateRules(sheet.cssRules));
    } catch {
      continue; // a stylesheet from another origin
    }
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

/**
 * Resolves once the print document's fonts and images have loaded (the blackletter title, the parish logo,
 * the signature, the QR code), so the browser's print preview shows the finished certificate. Gives up
 * after `timeoutMs` rather than never printing.
 */
async function whenLoaded(doc: Document, timeoutMs = 4000) {
  const images = Array.from(doc.images).map((img) =>
    img.complete
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        })
  );
  const fonts = doc.fonts ? doc.fonts.ready.then(() => undefined) : Promise.resolve();
  await Promise.race([
    Promise.all([fonts, ...images]),
    new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
  ]);
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
  void whenLoaded(doc).then(() => {
    win.focus();
    win.print();
    iframe.remove();
  });
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
  void whenLoaded(w.document).then(() => {
    w.focus();
    w.print();
    w.close();
  });
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
