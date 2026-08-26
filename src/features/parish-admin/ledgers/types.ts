import type { SacramentType } from "@/types";

export type LedgerBookStatus = "ready" | "scanning";

export interface LedgerBook {
  id: string;
  parishId: string;
  sacramentType: SacramentType;
  title: string;
  volumeLabel: string;
  yearStart: number;
  yearEnd: number;
  pageCount: number;
  status: LedgerBookStatus;
}

export interface LedgerPage {
  id: string;
  parishId: string;
  bookId: string;
  pageNumber: number;
  imageUrl: string;
  scannedAt: string;
  /** Full-page OCR text used only for findability search — not structured fields. */
  ocrText: string;
}

export interface LedgerSearchHit {
  bookId: string;
  bookTitle: string;
  volumeLabel: string;
  sacramentType: SacramentType;
  pageNumber: number;
  pageId: string;
  snippet: string;
  yearStart: number;
  yearEnd: number;
}

export interface LedgerPageUploadInput {
  bookId: string;
  pageNumber: number;
  /** Filename only in the mock; a real upload would send the scan. */
  fileName: string;
}

export interface LedgerBookCreateInput {
  sacramentType: SacramentType;
  title: string;
  volumeLabel: string;
  yearStart: number;
  yearEnd: number;
}

/**
 * "Field" narrows a findability search to lines that look like they contain
 * that kind of detail. It is a text heuristic, not structured field
 * extraction — see searchLedgerPages.
 */
export type LedgerSearchField = "all" | "name" | "date" | "priest" | "sponsor";

export const LEDGER_SEARCH_FIELDS: { value: LedgerSearchField; label: string }[] = [
  { value: "all", label: "All fields" },
  { value: "name", label: "Name" },
  { value: "date", label: "Date" },
  { value: "priest", label: "Priest / minister" },
  { value: "sponsor", label: "Sponsor / witness" },
];

export const LEDGER_SACRAMENT_LABELS: Record<SacramentType, string> = {
  baptism: "Baptism",
  confirmation: "Confirmation",
  marriage: "Marriage",
  death: "Death",
};

export const LEDGER_SACRAMENT_ORDER: SacramentType[] = [
  "baptism",
  "confirmation",
  "marriage",
  "death",
];
