import { delay } from "@/services/delay";
import { MOCK_LEDGER_BOOKS, MOCK_LEDGER_PAGES } from "@/services/mocks/ledgers.mock";
import { makeLedgerScanDataUrl } from "@/features/parish-admin/ledgers/ledgerScanImage";
import { searchLedgerPages } from "@/features/parish-admin/ledgers/ledgersHelpers";
import { LEDGER_SACRAMENT_LABELS } from "@/features/parish-admin/ledgers/types";
import type {
  LedgerBook,
  LedgerBookCreateInput,
  LedgerPage,
  LedgerPageUploadInput,
  LedgerSearchField,
  LedgerSearchHit,
} from "@/features/parish-admin/ledgers/types";
import type { SacramentType } from "@/types";

export async function listLedgerBooks(parishId: string): Promise<LedgerBook[]> {
  await delay(220);
  return MOCK_LEDGER_BOOKS.filter((b) => b.parishId === parishId);
}

export async function getLedgerBook(parishId: string, bookId: string): Promise<LedgerBook | undefined> {
  await delay(150);
  return MOCK_LEDGER_BOOKS.find((b) => b.id === bookId && b.parishId === parishId);
}

export async function listLedgerPages(parishId: string, bookId: string): Promise<LedgerPage[]> {
  await delay(180);
  return MOCK_LEDGER_PAGES.filter((p) => p.parishId === parishId && p.bookId === bookId).sort(
    (a, b) => a.pageNumber - b.pageNumber
  );
}

export async function getLedgerPage(
  parishId: string,
  bookId: string,
  pageNumber: number
): Promise<LedgerPage | undefined> {
  await delay(140);
  return MOCK_LEDGER_PAGES.find(
    (p) => p.parishId === parishId && p.bookId === bookId && p.pageNumber === pageNumber
  );
}

export async function searchLedgers(
  parishId: string,
  query: string,
  options?: { field?: LedgerSearchField; bookId?: string; sacrament?: SacramentType | "all" }
): Promise<LedgerSearchHit[]> {
  await delay(260);
  const books = MOCK_LEDGER_BOOKS.filter((b) => b.parishId === parishId);
  const pages = MOCK_LEDGER_PAGES.filter((p) => p.parishId === parishId);
  return searchLedgerPages(books, pages, query, options);
}

/**
 * Stub for starting a new register book shell before any pages are scanned.
 * TODO: POST /parishes/:parishId/ledgers with the book metadata.
 */
export async function createLedgerBook(parishId: string, input: LedgerBookCreateInput): Promise<LedgerBook> {
  await delay(350);
  const book: LedgerBook = {
    id: `led-${input.sacramentType.slice(0, 3)}-${Date.now()}`,
    parishId,
    sacramentType: input.sacramentType,
    title: input.title,
    volumeLabel: input.volumeLabel,
    yearStart: input.yearStart,
    yearEnd: input.yearEnd,
    pageCount: 0,
    status: "scanning",
  };
  MOCK_LEDGER_BOOKS.push(book);
  return book;
}

/**
 * Stub for attaching a newly scanned page to a book.
 * TODO: POST /parishes/:parishId/ledgers/:bookId/pages with multipart scan file.
 */
export async function uploadLedgerPage(
  parishId: string,
  input: LedgerPageUploadInput
): Promise<LedgerPage> {
  await delay(400);
  const book = MOCK_LEDGER_BOOKS.find((b) => b.id === input.bookId && b.parishId === parishId);
  if (!book) throw new Error(`Book ${input.bookId} not found`);

  const existing = MOCK_LEDGER_PAGES.find(
    (p) => p.bookId === input.bookId && p.pageNumber === input.pageNumber
  );
  if (existing) throw new Error(`Page ${input.pageNumber} is already in this book`);

  const heading = `Liber ${LEDGER_SACRAMENT_LABELS[book.sacramentType]}`;
  const page: LedgerPage = {
    id: `${book.id}-p${String(input.pageNumber).padStart(2, "0")}-${Date.now()}`,
    parishId,
    bookId: book.id,
    pageNumber: input.pageNumber,
    scannedAt: new Date().toISOString().slice(0, 10),
    ocrText: `Uploaded scan ${input.fileName} — OCR pending`,
    imageUrl: makeLedgerScanDataUrl({
      heading,
      volume: book.volumeLabel,
      pageNumber: input.pageNumber,
      lines: [`Scan file: ${input.fileName}`, "OCR text will appear here after backend processing."],
    }),
  };

  MOCK_LEDGER_PAGES.push(page);
  book.pageCount = Math.max(book.pageCount, input.pageNumber);
  book.status = "ready";
  return page;
}
