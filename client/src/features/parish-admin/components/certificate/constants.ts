import type { SacramentType } from "@/types";

/**
 * A certificate is a fixed printed document — it must read the same regardless of the
 * admin app's own light/dark UI preference. These are the document's own ink colors,
 * not the app theme: a deep chancel green and a muted liturgical gold.
 */
export const CERT_PRIMARY = "#1a3d2b";
export const CERT_ACCENT = "#a9791f";
export const CERT_INK = "#211f1a";
export const CERT_INK_MUTED = "#5c5646";
export const CERT_INK_FAINT = "#8c8471";
export const CERT_PAPER = "#fbf7ea";
export const CERT_SHEET_WIDTH = 580;
export const CERT_PREVIEW_STAGE_BG = "#d8d3c4";

/** The certificate's own type voice — a classical book-serif, distinct from the admin app's UI font. */
export const CERT_SERIF = "'Cormorant Garamond', ui-serif, Georgia, 'Times New Roman', serif";
export const CERT_SERIF_STYLESHEET =
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&display=swap";

export const sacramentCertTitles: Record<SacramentType, string> = {
  baptism: "Certificate of Baptism",
  confirmation: "Certificate of Confirmation",
  marriage: "Certificate of Marriage",
  death: "Certificate of Death",
};
