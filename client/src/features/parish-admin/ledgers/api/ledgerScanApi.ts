// Reading a stored register page: the server reads the photo with Gemini and keeps the
// reading; each row is a draft to check and save as a record.
import { apiFetch } from "@/lib/api";
import type { LedgerBook, LedgerPage } from "@/features/parish-admin/ledgers/types";

export type OcrPageSide = "left" | "right";

export interface OcrBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface OcrCell {
  entry: number;
  field: string;
  kind: "digits" | "text" | "block" | "date" | "tick";
  /** Which page of the spread the cell is on. */
  side: OcrPageSide;
  box: OcrBox;
  /** Share of dark pixels in the cell (blank ≈ 0, written 0.04+). */
  ink: number;
}

/** Something the app's own checks found. field null means the whole row. */
export interface OcrCheck {
  field: string | null;
  message: string;
}

/** One row of the page. Field values are strings or null; plus the bookkeeping below. */
export interface OcrEntry {
  row: number;
  entryNumber: string | null;
  confidence: Record<string, number>;
  /** What Gemini itself is unsure of. */
  uncertainFields: string[];
  /** What the app's checks found (blank cells, tick boxes, dates…). */
  checks: OcrCheck[];
  [field: string]:
    string | number | null | Record<string, number> | string[] | OcrCheck[];
}

export interface LedgerScanResult {
  side: "spread";
  engine: "gemini";
  model?: string;
  cached?: boolean;
  templateVersion: string;
  seconds: number;
  page: { width: number; height: number };
  /** Where each cell was found, in the uploaded photo's pixels. */
  cells: OcrCell[];
  /** Why there are no cells, when the grid couldn't be matched. */
  layoutNote?: string | null;
  entries: OcrEntry[];
  /** Where the photo was cut into the two pages. */
  split?: OcrSplit;
}

export interface OcrSplit {
  /** The cut, in pixels from the photo's left edge. */
  x: number;
  width: number;
  height: number;
  leftColumns: number;
  rightColumns: number;
  /** False when the halves don't have the expected 6 and 5 columns. */
  confirmed: boolean;
  note: string | null;
}

/** A page, its book, its last reading (null until read) and the rows already saved as records. */
export interface LedgerPageReading {
  book: LedgerBook;
  page: LedgerPage;
  reading: LedgerScanResult | null;
  /** Rows already saved as records, with the person's name and baptism date for listing them. */
  records: { row: number; recordId: string; name: string; date: string }[];
  /** False when reading isn't set up on the server. */
  readerAvailable: boolean;
}

export function getLedgerPageReading(parishId: string, pageId: string) {
  return apiFetch<LedgerPageReading>(`/ledgers/pages/${encodeURIComponent(pageId)}/reading`, {
    headers: { "x-parish-id": parishId },
  });
}

/** Reads the stored page with Gemini (both pages of the spread) and keeps the reading. */
export function readLedgerPage(parishId: string, pageId: string) {
  return apiFetch<LedgerPageReading>(`/ledgers/pages/${encodeURIComponent(pageId)}/read`, {
    method: "POST",
    headers: { "x-parish-id": parishId },
  });
}
