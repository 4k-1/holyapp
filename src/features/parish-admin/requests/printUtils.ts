// src/features/parish-admin/requests/printUtils.ts

/**
 * Prints an element's HTML. Prefers a popup so staff can see the copy;
 * falls back to a hidden iframe when the browser blocks window.open.
 * Because the print document doesn't inherit the app's stylesheet, only INLINE
 * styles on the element (and its children) will render correctly.
 */
function printDocumentHtml(el: HTMLElement, docTitle: string) {
  return `<!DOCTYPE html>
<html>
<head>
<title>${docTitle}</title>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link
  href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&display=swap"
  rel="stylesheet"
/>
<style>
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #ececec;
    font-family: "Cormorant Garamond", ui-serif, Georgia, "Times New Roman", serif;
  }
  .print-shell { max-width: 660px; margin: 32px auto; }
  @media print {
    html, body { background: #fff; }
    .print-shell { margin: 0 auto; }
  }
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