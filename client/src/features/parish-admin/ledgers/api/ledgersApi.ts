import { apiFetch, apiFetchBlob } from "@/lib/api";
import { searchLedgerPages } from "@/features/parish-admin/ledgers/ledgersHelpers";
import type {
  LedgerBook,
  LedgerBookCreateInput,
  LedgerPage,
  LedgerPageUploadInput,
  LedgerSearchField,
  LedgerSearchHit,
  LedgerSearchPage,
} from "@/features/parish-admin/ledgers/types";
import type { SacramentType } from "@/types";

const parishHeader = (parishId: string) => ({ "x-parish-id": parishId });

export async function listLedgerBooks(parishId: string): Promise<LedgerBook[]> {
  const data = await apiFetch<{ books: LedgerBook[] }>("/ledgers/books", { headers: parishHeader(parishId) });
  return data.books;
}

export async function getLedgerBook(parishId: string, bookId: string): Promise<LedgerBook | undefined> {
  try {
    const data = await apiFetch<{ book: LedgerBook }>(`/ledgers/books/${encodeURIComponent(bookId)}`, {
      headers: parishHeader(parishId),
    });
    return data.book;
  } catch (err) {
    if (err instanceof Error && "status" in err && (err as { status: number }).status === 404) return undefined;
    throw err;
  }
}

export async function listLedgerPages(parishId: string, bookId: string): Promise<LedgerPage[]> {
  const data = await apiFetch<{ pages: LedgerPage[] }>(`/ledgers/books/${encodeURIComponent(bookId)}/pages`, {
    headers: parishHeader(parishId),
  });
  return data.pages;
}

/** Searches the read text of every page (only pages that have been read have any). */
export async function searchLedgers(
  parishId: string,
  query: string,
  options?: { field?: LedgerSearchField; bookId?: string; sacrament?: SacramentType | "all" }
): Promise<LedgerSearchHit[]> {
  const [books, data] = await Promise.all([
    listLedgerBooks(parishId),
    apiFetch<{ pages: LedgerSearchPage[] }>("/ledgers/search-text", { headers: parishHeader(parishId) }),
  ]);
  return searchLedgerPages(books, data.pages, query, options);
}

/** Starts a new, empty register book to upload pages into. */
export async function createLedgerBook(parishId: string, input: LedgerBookCreateInput): Promise<LedgerBook> {
  const data = await apiFetch<{ book: LedgerBook }>("/ledgers/books", {
    method: "POST",
    body: input,
    headers: parishHeader(parishId),
  });
  return data.book;
}

/** Uploads one photo as a page of a book. */
export async function uploadLedgerPage(parishId: string, input: LedgerPageUploadInput): Promise<LedgerPage> {
  const data = await apiFetch<{ page: LedgerPage }>(
    `/ledgers/books/${encodeURIComponent(input.bookId)}/pages?pageNumber=${input.pageNumber}`,
    {
      method: "POST",
      rawBody: input.file,
      headers: { ...parishHeader(parishId), "Content-Type": input.file.type || "image/jpeg" },
    }
  );
  return data.page;
}

/**
 * Uploads photos one after another (each can be several MB). Stops at the first failure;
 * the pages uploaded before it stay in the book.
 */
export async function uploadLedgerPages(
  parishId: string,
  inputs: LedgerPageUploadInput[],
  onProgress?: (done: number) => void
): Promise<LedgerPage[]> {
  if (inputs.length === 0) throw new Error("Add at least one photo.");
  const pages: LedgerPage[] = [];
  for (const input of inputs) {
    try {
      pages.push(await uploadLedgerPage(parishId, input));
    } catch (err) {
      const reason = err instanceof Error ? err.message : "It couldn't be saved.";
      const before = pages.length ? ` The ${pages.length} before it ${pages.length === 1 ? "was" : "were"} saved.` : "";
      throw new Error(`Page ${input.pageNumber}: ${reason}${before}`, { cause: err });
    }
    onProgress?.(pages.length);
  }
  return pages;
}

export function getLedgerPageImage(parishId: string, pageId: string, size: "thumb" | "full" = "full") {
  return apiFetchBlob(`/ledgers/pages/${encodeURIComponent(pageId)}/image${size === "thumb" ? "?size=thumb" : ""}`, {
    headers: parishHeader(parishId),
  });
}

export async function deleteLedgerPage(parishId: string, pageId: string): Promise<void> {
  await apiFetch(`/ledgers/pages/${encodeURIComponent(pageId)}`, {
    method: "DELETE",
    headers: parishHeader(parishId),
  });
}
