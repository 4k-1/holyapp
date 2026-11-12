import type { AdminSectionTone } from "@/features/parish-admin/components/AdminForm";
import type { SacramentType } from "@/types";
import {
  LEDGER_SACRAMENT_LABELS,
  LEDGER_SACRAMENT_ORDER,
  type LedgerBook,
  type LedgerPage,
  type LedgerSearchField,
  type LedgerSearchPage,
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

// Each line of a page's read text holds one detail of one entry ("Entry 4: born 4 Mar 2016
// at ...", "Entry 4: Minister Rev. Fr. ..."; see ledgerController.searchTextOf on the
// server), so "Field" narrows the search to the lines of that kind.
function lineMatchesField(line: string, field: LedgerSearchField) {
  if (field === "all" || field === "name") return true;
  return LEDGER_FIELD_PATTERNS[field].test(line);
}

export function searchLedgerPages(
  books: LedgerBook[],
  pages: LedgerSearchPage[],
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

export function ledgerSacramentBadgeTone(type: SacramentType) {
  switch (type) {
    case "baptism":
      return "green" as const;
    case "confirmation":
      return "muted" as const;
    case "marriage":
      return "gold" as const;
    case "death":
      return "muted" as const;
  }
}

export function ledgerSacramentSectionTone(type: SacramentType): AdminSectionTone {
  switch (type) {
    case "baptism":
      return "green";
    case "confirmation":
      return "blue";
    case "marriage":
      return "gold";
    case "death":
      return "rose";
  }
}

const BOOK_COVER_GRADIENTS = [
  "from-[#5b3a29] to-[#2e1c14]",
  "from-[#1a3d2b] to-[#0c1f16]",
  "from-[#d4a017] to-[#8a6710]",
  "from-[#33475a] to-[#17232e]",
];

export function ledgerBookCoverClass(index: number) {
  return `bg-gradient-to-br ${BOOK_COVER_GRADIENTS[index % BOOK_COVER_GRADIENTS.length]}`;
}
