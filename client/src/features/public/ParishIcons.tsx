// HolyApp's own icons for the public site: solid shapes in logo teal, a pale teal second layer, and one touch of
// candle gold, each one a thing from parish life rather than a stock outline. Drawn on a 32 × 32 grid.
import type { ReactNode } from "react";

const T = "#16798c"; // logo teal
const D = "#0e3b46"; // deep teal
const M = "#2a9d9c"; // lighter teal, for the lit side of a shape
const L = "#bde3e0"; // pale teal layer, dark enough to show on a white tile
const G = "#eeb531"; // candle gold
const W = "#ffffff";

const round = { strokeLinecap: "round", strokeLinejoin: "round", fill: "none" } as const;

const DRAWINGS = {
  /** A register book with a cross on the cover and a ribbon bookmark. */
  book: (
    <>
      <rect x="8" y="4" width="18" height="23" rx="2.5" fill={L} />
      <rect x="5" y="3" width="19" height="24" rx="2.5" fill={T} />
      <rect x="5" y="3" width="4.5" height="24" rx="2.2" fill={D} />
      <path d="M16.5 9v8M13 12.5h7" stroke={W} strokeWidth="2.2" {...round} />
      <path d="M18 26v4.5l1.7-1.4 1.8 1.4V26z" fill={G} />
    </>
  ),
  /** An open register being scanned. */
  scan: (
    <>
      <path d="M3.5 8.5c4.2-1.6 8.3-1.6 12.5 0v18c-4.2-1.6-8.3-1.6-12.5 0z" fill={L} />
      <path d="M16 8.5c4.2-1.6 8.3-1.6 12.5 0v18c-4.2-1.6-8.3-1.6-12.5 0z" fill="#a6d8d4" />
      <path d="M6.5 12.5h6M6.5 15.5h6M6.5 21h4M19.5 12.5h6M19.5 21h6M19.5 24h3" stroke={T} strokeWidth="1.6" {...round} />
      <path d="M16 8.5v18" stroke={D} strokeWidth="1.6" {...round} />
      <rect x="1.5" y="15.5" width="29" height="6" rx="3" fill={G} opacity="0.25" />
      <rect x="1.5" y="17.3" width="29" height="2.4" rx="1.2" fill={G} />
    </>
  ),
  /** A request arriving in the office tray. */
  inbox: (
    <>
      <rect x="9" y="3" width="14" height="17" rx="1.6" fill={L} />
      <path d="M12 7.5h8M12 10.5h8M12 13.5h5" stroke={T} strokeWidth="1.6" {...round} />
      <path d="M3 17h7.2l2 3h7.6l2-3H29v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z" fill={T} />
      <circle cx="25.5" cy="5.5" r="3.2" fill={G} />
    </>
  ),
  /** A certificate's QR code with the parish's gold seal. */
  qr: (
    <>
      <rect x="3" y="3" width="24" height="24" rx="4.5" fill={L} />
      <rect x="6" y="6" width="7.5" height="7.5" rx="1.8" fill={T} />
      <rect x="8.6" y="8.6" width="2.3" height="2.3" rx="0.5" fill={W} />
      <rect x="16.5" y="6" width="7.5" height="7.5" rx="1.8" fill={T} />
      <rect x="19.1" y="8.6" width="2.3" height="2.3" rx="0.5" fill={W} />
      <rect x="6" y="16.5" width="7.5" height="7.5" rx="1.8" fill={T} />
      <rect x="8.6" y="19.1" width="2.3" height="2.3" rx="0.5" fill={W} />
      <rect x="16.5" y="16.5" width="3" height="3" rx="0.7" fill={D} />
      <rect x="16.5" y="21" width="2.5" height="2.5" rx="0.6" fill={D} />
      <circle cx="25" cy="25" r="5.5" fill={G} stroke={W} strokeWidth="1.5" />
      <path d="M22.6 25.1l1.6 1.6 3.2-3.3" stroke={W} strokeWidth="1.8" {...round} />
    </>
  ),
  /** The parish calendar, with a cross for the feast. */
  calendar: (
    <>
      <rect x="4" y="6" width="24" height="22" rx="3.5" fill={L} />
      <path d="M4 9.5A3.5 3.5 0 0 1 7.5 6h17A3.5 3.5 0 0 1 28 9.5V12.5H4z" fill={T} />
      <rect x="9" y="3" width="2.8" height="6.5" rx="1.4" fill={D} />
      <rect x="20.2" y="3" width="2.8" height="6.5" rx="1.4" fill={D} />
      <path d="M14 15.5v9M10.5 19h7" stroke={T} strokeWidth="2.4" {...round} />
      <circle cx="22.5" cy="22.5" r="2.6" fill={G} />
    </>
  ),
  /** A lit votive candle. */
  candle: (
    <>
      <circle cx="16" cy="7.5" r="6.5" fill={G} opacity="0.2" />
      <rect x="7" y="26" width="18" height="3.2" rx="1.6" fill={L} />
      <rect x="11.5" y="12" width="9" height="15" rx="1.6" fill={T} />
      <path d="M11.5 13.6A1.6 1.6 0 0 1 13.1 12h5.8a1.6 1.6 0 0 1 1.6 1.6V16h-1.6v2.2a1.1 1.1 0 0 1-2.2 0V16h-2.6v1.2a1.1 1.1 0 0 1-2.2 0V16h-.4z" fill={M} />
      <path d="M16 12V9.6" stroke={D} strokeWidth="1.4" {...round} />
      <path d="M16 2.2c2.3 2.7 3.3 4.4 3.3 5.9a3.3 3.3 0 0 1-6.6 0c0-1.5 1-3.2 3.3-5.9z" fill={G} />
      <path d="M16 5.8c.9 1.1 1.3 1.8 1.3 2.4a1.3 1.3 0 0 1-2.6 0c0-.6.4-1.3 1.3-2.4z" fill={W} />
    </>
  ),
  /** A receipt and a peso coin. */
  heart: (
    <>
      <path d="M5 3h15v24.5l-2.5-1.7-2.5 1.7-2.5-1.7-2.5 1.7L7.5 25.8 5 27.5z" fill={L} />
      <path d="M8.5 8h8M8.5 11.5h8M8.5 15h5" stroke={T} strokeWidth="1.6" {...round} />
      <circle cx="22" cy="21.5" r="7.5" fill={G} stroke={W} strokeWidth="1.5" />
      <path d="M20.2 25.6v-8.2h2.5a2.3 2.3 0 0 1 0 4.6h-2.5M18.6 19.1h6.4M18.6 20.9h6.4" stroke={W} strokeWidth="1.5" {...round} />
    </>
  ),
  /** Two wedding rings, one with a stone. */
  rings: (
    <>
      <circle cx="12" cy="19" r="7.2" stroke={T} strokeWidth="3.4" fill="none" />
      <circle cx="20" cy="19" r="7.2" stroke={G} strokeWidth="3.4" fill="none" />
      <path d="M14.3 12.2a7.2 7.2 0 0 1 3.4 0" stroke={T} strokeWidth="3.4" fill="none" />
      <path d="M17.6 8.3l2.4-3.3 2.4 3.3-2.4 2.6z" fill={L} stroke={T} strokeWidth="1.2" strokeLinejoin="round" />
    </>
  ),
  /** The parish staff and their monthly report. */
  people: (
    <>
      <rect x="11" y="4" width="18" height="18" rx="3.5" fill={L} />
      <rect x="15" y="13" width="2.8" height="5.5" rx="1" fill={T} />
      <rect x="19.6" y="10" width="2.8" height="8.5" rx="1" fill={T} />
      <rect x="24.2" y="7" width="2.8" height="11.5" rx="1" fill={G} />
      <circle cx="9" cy="17.5" r="4.2" fill={T} stroke={W} strokeWidth="1.6" />
      <path d="M1.8 29.5a7.2 7.2 0 0 1 14.4 0z" fill={T} stroke={W} strokeWidth="1.6" strokeLinejoin="round" />
    </>
  ),
  /** A certificate with a wax seal and ribbons. */
  request: (
    <>
      <path d="M7 3h13l6 6v17a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" fill={L} />
      <path d="M20 3v4a2 2 0 0 0 2 2h4z" fill="#98d0cb" />
      <path d="M9 9h7.5" stroke={T} strokeWidth="2.2" {...round} />
      <path d="M9 13h12M9 16.5h8" stroke={T} strokeWidth="1.6" {...round} />
      <path d="M17.2 24.5l-1.2 5.3 2.4-1.3 1.6 2 .9-5.4zM22.8 24.5l1.2 5.3-2.4-1.3-1.6 2-.9-5.4z" fill={T} />
      <circle cx="20" cy="22.5" r="4.8" fill={G} stroke={W} strokeWidth="1.4" />
      <circle cx="20" cy="22.5" r="2" fill="none" stroke={W} strokeWidth="1.2" />
    </>
  ),
  /** A request on its way: most of the ring done, a gold dot where it has reached. */
  track: (
    <>
      <circle cx="16" cy="16" r="11.5" stroke={L} strokeWidth="3.6" fill="none" />
      <path d="M16 4.5a11.5 11.5 0 1 1-11.5 11.5" stroke={T} strokeWidth="3.6" {...round} />
      <circle cx="4.5" cy="16" r="3.4" fill={G} stroke={W} strokeWidth="1.4" />
      <path d="M11.5 16.3l3 3 6-6.4" stroke={D} strokeWidth="2.6" {...round} />
    </>
  ),
  /** A certificate tucked in a wallet. */
  wallet: (
    <>
      <rect x="8" y="3" width="15" height="14" rx="1.6" fill={L} />
      <path d="M11 7h9M11 10h6" stroke={T} strokeWidth="1.6" {...round} />
      <rect x="3" y="10.5" width="26" height="17.5" rx="3.5" fill={T} />
      <path d="M3 14a3.5 3.5 0 0 1 3.5-3.5h19A3.5 3.5 0 0 1 29 14v.5H3z" fill={M} />
      <rect x="20" y="17" width="9" height="6.5" rx="2.2" fill={D} />
      <circle cx="23.6" cy="20.25" r="1.5" fill={G} />
    </>
  ),
  /** An offering envelope with a heart going in. */
  gift: (
    <>
      <rect x="3" y="11" width="26" height="17" rx="3" fill={T} />
      <path d="M4.5 12.5L16 21l11.5-8.5" stroke={L} strokeWidth="2" {...round} />
      <path d="M16 3.8c-1.3-1.7-4.3-1.3-4.3 1.1 0 1.9 2.5 3.6 4.3 5.1 1.8-1.5 4.3-3.2 4.3-5.1 0-2.4-3-2.8-4.3-1.1z" fill={G} />
    </>
  ),
  /** A life's sacraments, one after another. */
  timeline: (
    <>
      <path d="M8 6v20" stroke={L} strokeWidth="3.2" {...round} />
      <rect x="13" y="4" width="16" height="6" rx="3" fill={L} />
      <rect x="13" y="13" width="13" height="6" rx="3" fill={L} />
      <rect x="13" y="22" width="15" height="6" rx="3" fill={L} />
      <circle cx="8" cy="7" r="3.6" fill={T} />
      <circle cx="8" cy="16" r="3.6" fill={T} />
      <circle cx="8" cy="25" r="3.6" fill={G} />
    </>
  ),
  /** A shield with a check: only the right people. */
  shield: (
    <>
      <path d="M16 2.5l11 4v8.5c0 7-4.8 11.8-11 14.5-6.2-2.7-11-7.5-11-14.5V6.5z" fill={T} />
      <path d="M16 2.5v27C9.8 26.8 5 22 5 15V6.5z" fill={M} />
      <path d="M11.3 16.2l3.2 3.2 6.3-6.8" stroke={W} strokeWidth="2.5" {...round} />
      <circle cx="25" cy="25" r="3" fill={G} stroke={W} strokeWidth="1.4" />
    </>
  ),
  /** A clock with a gold arrow turning back around it: every change is kept. */
  history: (
    <>
      <circle cx="17" cy="16.5" r="10.5" fill={L} />
      <path d="M10.4 28.3A13.5 13.5 0 0 1 6.4 7.6" stroke={G} strokeWidth="2.6" {...round} />
      <path d="M3.6 6.6l6.4-2.4-1.3 6.6z" fill={G} />
      <path d="M17 10.5v6l4.2 2.5" stroke={T} strokeWidth="2.6" {...round} />
      <circle cx="17" cy="16.5" r="2" fill={D} />
    </>
  ),
  /** A parish church with its cross. */
  church: (
    <>
      <path d="M5.5 29V16.5L16 9l10.5 7.5V29z" fill={T} />
      <path d="M16 9v20H5.5V16.5z" fill={M} />
      <path d="M12.8 29v-4.8a3.2 3.2 0 0 1 6.4 0V29z" fill={L} />
      <circle cx="16" cy="17.5" r="2.3" fill={L} />
      <path d="M16 2v6.2M13.3 4.6h5.4" stroke={G} strokeWidth="2.3" {...round} />
    </>
  ),
  /** A padlock: passwords stay secret. */
  lock: (
    <>
      <path d="M10.5 14.5V10a5.5 5.5 0 0 1 11 0v4.5" stroke={D} strokeWidth="3" {...round} />
      <rect x="6" y="13.5" width="20" height="15" rx="3.8" fill={T} />
      <path d="M6 17.3a3.8 3.8 0 0 1 3.8-3.8H26V17H6z" fill={M} />
      <circle cx="16" cy="20.3" r="2.3" fill={G} />
      <rect x="15" y="20.8" width="2" height="4.4" rx="1" fill={G} />
    </>
  ),
  /** A gold rosette seal: certificates can't be faked. */
  seal: (
    <>
      <path d="M11.5 18.5l-2.7 10 4.2-1.8 2.6 3.1 1.5-9.3z" fill={T} />
      <path d="M20.5 18.5l2.7 10-4.2-1.8-2.6 3.1-1.5-9.3z" fill={D} />
      <circle cx="16" cy="13" r="10" fill={G} opacity="0.25" />
      <circle cx="16" cy="13" r="8" fill={G} />
      <circle cx="16" cy="13" r="5.4" fill="none" stroke={W} strokeWidth="1.3" />
      <path d="M13.6 13.1l1.7 1.7 3.2-3.4" stroke={W} strokeWidth="1.9" {...round} />
    </>
  ),
  /** A person's own card: your data, your rights. */
  rights: (
    <>
      <rect x="3" y="7" width="26" height="18.5" rx="3.2" fill={L} />
      <circle cx="11" cy="14" r="3.2" fill={T} />
      <path d="M5.8 21.8a5.2 5.2 0 0 1 10.4 0z" fill={T} />
      <path d="M19 13h6.5M19 17h5" stroke={T} strokeWidth="1.8" {...round} />
      <circle cx="25.5" cy="24.5" r="4.6" fill={G} stroke={W} strokeWidth="1.4" />
      <path d="M23.4 24.6l1.4 1.4 2.8-2.9" stroke={W} strokeWidth="1.7" {...round} />
    </>
  ),
  /** A phone: nothing to download. */
  phone: (
    <>
      <rect x="8.5" y="2.5" width="15" height="27" rx="3.8" fill={T} />
      <rect x="11" y="6" width="10" height="17.5" rx="1.6" fill={L} />
      <rect x="14" y="25.4" width="4" height="1.7" rx="0.85" fill={L} />
      <circle cx="16" cy="14.7" r="3.3" fill={G} />
      <path d="M14.6 14.8l1 1 1.9-2" stroke={W} strokeWidth="1.4" {...round} />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type ParishIconName = keyof typeof DRAWINGS;

export function ParishIcon({ name, size = 28, className = "" }: { name: ParishIconName; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} aria-hidden="true">
      {DRAWINGS[name]}
    </svg>
  );
}
