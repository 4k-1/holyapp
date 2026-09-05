function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Stylized register scan so the viewer has a readable image without real OCR files. */
export function makeLedgerScanDataUrl(opts: {
  heading: string;
  volume: string;
  pageNumber: number;
  lines: string[];
}): string {
  const rows = opts.lines
    .map((line, i) => {
      const y = 148 + i * 28;
      return `<text x="48" y="${y}" font-size="13" fill="#3a3428">${escapeXml(line)}</text>
        <line x1="40" y1="${y + 8}" x2="540" y2="${y + 8}" stroke="#d9c9a6" stroke-width="1"/>`;
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="580" height="780" viewBox="0 0 580 780">
    <rect width="580" height="780" fill="#f3ead4"/>
    <rect x="18" y="18" width="544" height="744" fill="none" stroke="#1a3d2b" stroke-width="2.2"/>
    <rect x="24" y="24" width="532" height="732" fill="none" stroke="#c49a1a" stroke-width="1"/>
    <text x="290" y="58" text-anchor="middle" font-family="Georgia, serif" font-size="13" letter-spacing="2.4" fill="#1a3d2b">${escapeXml(opts.heading.toUpperCase())}</text>
    <text x="290" y="82" text-anchor="middle" font-family="Georgia, serif" font-size="18" font-weight="700" fill="#1a3d2b">${escapeXml(opts.volume)}</text>
    <text x="290" y="106" text-anchor="middle" font-family="Georgia, serif" font-size="12" font-style="italic" fill="#6b6150">Page ${opts.pageNumber}</text>
    <line x1="80" y1="118" x2="500" y2="118" stroke="#c49a1a" stroke-width="1.2"/>
    ${rows}
    <text x="290" y="748" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="9" letter-spacing="1.4" fill="#8a7f6a">PARISH REGISTER · DIGITIZED COPY</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
