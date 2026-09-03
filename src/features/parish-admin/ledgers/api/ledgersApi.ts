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
 * Stub for attaching newly scanned pages to a book.
 * TODO: POST /parishes/:parishId/ledgers/:bookId/pages with multipart scan files.
 */
export async function uploadLedgerPages(
  parishId: string,
  inputs: LedgerPageUploadInput[]
): Promise<LedgerPage[]> {
  await delay(450);
  if (inputs.length === 0) throw new Error("Add at least one photo.");

  const bookId = inputs[0].bookId;
  const book = MOCK_LEDGER_BOOKS.find((b) => b.id === bookId && b.parishId === parishId);
  if (!book) throw new Error(`Book ${bookId} not found`);
  if (inputs.some((input) => input.bookId !== bookId)) {
    throw new Error("All photos must go into the same book.");
  }

  const numbers = inputs.map((input) => input.pageNumber);
  const duplicate = numbers.find((n, i) => numbers.indexOf(n) !== i);
  if (duplicate != null) throw new Error(`Page ${duplicate} is used more than once.`);

  for (const input of inputs) {
    if (!Number.isInteger(input.pageNumber) || input.pageNumber < 1) {
      throw new Error("Page numbers start at 1.");
    }
    const existing = MOCK_LEDGER_PAGES.find(
      (p) => p.bookId === bookId && p.pageNumber === input.pageNumber
    );
    if (existing) throw new Error(`Page ${input.pageNumber} is already in this book`);
  }

  const heading = `Liber ${LEDGER_SACRAMENT_LABELS[book.sacramentType]}`;
  const scannedAt = new Date().toISOString().slice(0, 10);
  const pages = inputs.map((input, i) => {
    const page: LedgerPage = {
      id: `${book.id}-p${String(input.pageNumber).padStart(2, "0")}-${Date.now()}-${i}`,
      parishId,
      bookId: book.id,
      pageNumber: input.pageNumber,
      scannedAt,
      ocrText: `Uploaded scan ${input.fileName} — OCR pending`,
      imageUrl:
        input.imageUrl ??
        makeLedgerScanDataUrl({
          heading,
          volume: book.volumeLabel,
          pageNumber: input.pageNumber,
          lines: [`Scan file: ${input.fileName}`, "OCR text will appear here after backend processing."],
        }),
    };
    return page;
  });

  MOCK_LEDGER_PAGES.push(...pages);
  book.pageCount = MOCK_LEDGER_PAGES.filter((p) => p.bookId === book.id).length;
  book.status = "ready";
  return pages;
}

export async function uploadLedgerPage(
  parishId: string,
  input: LedgerPageUploadInput
): Promise<LedgerPage> {
  const [page] = await uploadLedgerPages(parishId, [input]);
  return page;
}
