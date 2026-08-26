import type { SacramentType } from "@/types";
import {
  LEDGER_SACRAMENT_LABELS,
  LEDGER_SACRAMENT_ORDER,
  type LedgerBook,
  type LedgerPage,
  type LedgerSearchField,
  type LedgerSearchHit,
} from "@/features/parish-admin/ledgers/types";

export function ledgerYearRange(book: Pick<LedgerBook, "yearStart" | "yearEnd">) {
  return book.yearStart === book.yearEnd ? String(book.yearStart) : `${book.yearStart}–${book.yearEnd}`;
}

export function ledgerSacramentLabel(type: SacramentType) {
  return LEDGER_SACRAMENT_LABELS[type];
}

export function groupBooksBySacrament(books: LedgerBook[]) {
  return LEDGER_SACRAMENT_ORDER.map((type) => ({
    type,
    label: LEDGER_SACRAMENT_LABELS[type],
    books: books
      .filter((b) => b.sacramentType === type)
      .sort((a, b) => b.yearStart - a.yearStart || a.volumeLabel.localeCompare(b.volumeLabel)),
  })).filter((group) => group.books.length > 0);
}

export function bookOverlapsYears(
  book: Pick<LedgerBook, "yearStart" | "yearEnd">,
  yearFrom?: number,
  yearTo?: number
) {
  if (yearFrom && book.yearEnd < yearFrom) return false;
  if (yearTo && book.yearStart > yearTo) return false;
  return true;
}

export function filterLedgerBooks(
  books: LedgerBook[],
  filters: { sacrament?: SacramentType | "all"; yearFrom?: number; yearTo?: number }
) {
  return books.filter((book) => {
    if (filters.sacrament && filters.sacrament !== "all" && book.sacramentType !== filters.sacrament) {
      return false;
    }
    return bookOverlapsYears(book, filters.yearFrom, filters.yearTo);
  });
}

export function snippetAroundMatch(ocrText: string, query: string) {
  const q = query.trim();
  if (!q) return "";
  const lower = ocrText.toLowerCase();
  const at = lower.indexOf(q.toLowerCase());
  if (at < 0) return ocrText.slice(0, 140);
  const start = Math.max(0, at - 42);
  const end = Math.min(ocrText.length, at + q.length + 72);
  const slice = ocrText.slice(start, end).replace(/\s+/g, " ").trim();
  return `${start > 0 ? "…" : ""}${slice}${end < ocrText.length ? "…" : ""}`;
}

const LEDGER_FIELD_PATTERNS: Record<Exclude<LedgerSearchField, "all" | "name">, RegExp> = {
  date: /\b\d{1,2}\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s\d{4}\b/i,
  priest: /\b(Minister|Rev\.|Most Rev)\b/i,
  sponsor: /\b(Sponsor|Witness(?:es)?)\b/i,
};

/**
 * Heuristic-only line filter for the "Field" search narrowing. Real
 * field-scoped search would need structured OCR output rather than regex
 * over raw scanned text.
 * TODO: replace with structured field matching once OCR emits fields.
 */
function lineMatchesField(line: string, field: LedgerSearchField) {
  if (field === "all" || field === "name") return true;
  return LEDGER_FIELD_PATTERNS[field].test(line);
}

export function searchLedgerPages(
  books: LedgerBook[],
  pages: LedgerPage[],
  query: string,
  options: { field?: LedgerSearchField; bookId?: string; sacrament?: SacramentType | "all" } = {}
): LedgerSearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const field = options.field ?? "all";
  const byId = new Map(books.map((b) => [b.id, b]));
  const hits: LedgerSearchHit[] = [];

  for (const page of pages) {
    if (options.bookId && options.bookId !== "all" && page.bookId !== options.bookId) continue;
    const book = byId.get(page.bookId);
    if (!book) continue;
    if (options.sacrament && options.sacrament !== "all" && book.sacramentType !== options.sacrament) continue;

    const matchLine = page.ocrText
      .split(" · ")
      .find((line) => line.toLowerCase().includes(q) && lineMatchesField(line, field));
    if (!matchLine) continue;

    hits.push({
      bookId: book.id,
      bookTitle: book.title,
      volumeLabel: book.volumeLabel,
      sacramentType: book.sacramentType,
      pageNumber: page.pageNumber,
      pageId: page.id,
      snippet: snippetAroundMatch(matchLine, query),
      yearStart: book.yearStart,
      yearEnd: book.yearEnd,
    });
  }

  return hits;
}

export function ledgerPageAlt(book: LedgerBook, page: Pick<LedgerPage, "pageNumber">) {
  return `Scanned ${ledgerSacramentLabel(book.sacramentType).toLowerCase()} register ${book.title}, page ${page.pageNumber}`;
}
