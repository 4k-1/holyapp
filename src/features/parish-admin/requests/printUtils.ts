// src/features/parish-admin/requests/printUtils.ts

/**
 * Opens a popup window and prints an element's HTML.
 * Because the popup doesn't inherit the app's stylesheet, only INLINE
 * styles on the element (and its children) will render correctly.
 * We forward the app's live --color-primary / --color-accent as CSS
 * custom properties on <html> so inline `var(--color-primary, #fallback)`
 * references inside the printed content resolve to the parish's actual theme.
 */
export function printElement(el: HTMLElement, docTitle: string) {
    const computed = getComputedStyle(document.documentElement);
    const primary = computed.getPropertyValue("--color-primary").trim();
    const accent = computed.getPropertyValue("--color-accent").trim();
  
    const rootStyle = [primary && `--color-primary:${primary};`, accent && `--color-accent:${accent};`]
      .filter(Boolean)
      .join("");
  
    const w = window.open("", "_blank", "width=860,height=1000");
    if (!w) return;
  
    w.document.write(`<!DOCTYPE html>
  <html style="${rootStyle}">
  <head>
  <title>${docTitle}</title>
  <meta charset="utf-8" />
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #ececec; font-family: Georgia, "Times New Roman", serif; }
    .print-shell { max-width: 640px; margin: 32px auto; }
    @media print {
      html, body { background: #fff; }
      .print-shell { margin: 0 auto; }
    }
  </style>
  </head>
  <body><div class="print-shell">${el.innerHTML}</div></body>
  </html>`);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
      w.close();
    }, 250);
  }