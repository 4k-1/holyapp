import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import { AdminDialog, AdminDialogFooter, AdminDialogHeader } from "@/features/parish-admin/components/AdminDialog";
import { AdminButton, AdminField, AdminInput, AdminSelect } from "@/features/parish-admin/components/AdminForm";
import { listLedgerPages } from "@/features/parish-admin/ledgers/api/ledgersApi";
import { ledgerSacramentLabel, ledgerYearRange } from "@/features/parish-admin/ledgers/ledgersHelpers";
import type { LedgerBook, LedgerPageUploadInput } from "@/features/parish-admin/ledgers/types";

interface DraftScan {
  id: string;
  file: File;
  previewUrl: string;
  pageNumber: string;
}

interface UploadLedgerPageModalProps {
  parishId: string;
  books: LedgerBook[];
  defaultBookId?: string;
  onClose: () => void;
  onSubmit: (pages: LedgerPageUploadInput[]) => Promise<void>;
}

function isImageFile(file: File) {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Couldn't read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

function pageIssues(drafts: DraftScan[], taken: Set<number>) {
  const issues = new Map<string, string>();
  const seen = new Map<number, string>();

  for (const draft of drafts) {
    if (!draft.pageNumber.trim()) {
      issues.set(draft.id, "Enter the page number written in the book.");
      continue;
    }
    const n = Number(draft.pageNumber);
    if (!Number.isInteger(n) || n < 1) {
      issues.set(draft.id, "Page numbers start at 1.");
      continue;
    }
    if (taken.has(n)) {
      issues.set(draft.id, `Page ${n} is already in this book.`);
      continue;
    }
    const firstId = seen.get(n);
    if (firstId) {
      issues.set(draft.id, `Page ${n} is used more than once.`);
      issues.set(firstId, `Page ${n} is used more than once.`);
    } else {
      seen.set(n, draft.id);
    }
  }

  return issues;
}

export function UploadLedgerPageModal({
  parishId,
  books,
  defaultBookId,
  onClose,
  onSubmit,
}: UploadLedgerPageModalProps) {
  const readyBooks = books.filter((b) => b.status === "ready" || b.status === "scanning");
  const [bookId, setBookId] = useState(defaultBookId ?? readyBooks[0]?.id ?? "");
  const [drafts, setDrafts] = useState<DraftScan[]>([]);
  const [takenPages, setTakenPages] = useState<Set<number>>(new Set());
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showIssues, setShowIssues] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftsRef = useRef<DraftScan[]>([]);
  draftsRef.current = drafts;

  useEffect(() => {
    return () => {
      draftsRef.current.forEach((draft) => URL.revokeObjectURL(draft.previewUrl));
    };
  }, []);

  useEffect(() => {
    if (!bookId) {
      setTakenPages(new Set());
      return;
    }
    let cancelled = false;
    listLedgerPages(parishId, bookId).then((pages) => {
      if (cancelled) return;
      setTakenPages(new Set(pages.map((p) => p.pageNumber)));
    });
    return () => {
      cancelled = true;
    };
  }, [parishId, bookId]);

  const issues = pageIssues(drafts, takenPages);
  const canSave = Boolean(bookId && drafts.length > 0 && issues.size === 0 && !submitting);

  function addFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList).filter(isImageFile);
    if (incoming.length === 0) {
      setError("Choose photos of the register pages (JPG or PNG).");
      return;
    }
    const next = incoming.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      pageNumber: "",
    }));
    const shouldFocusFirst = !activeId;
    setDrafts((current) => [...current, ...next]);
    setActiveId((id) => id ?? next[0].id);
    setError("");
    setShowIssues(false);
    if (shouldFocusFirst) {
      window.setTimeout(() => {
        document.getElementById(`page-num-${next[0].id}`)?.focus();
      }, 40);
    }
  }

  function removeDraft(id: string) {
    const current = draftsRef.current;
    const index = current.findIndex((d) => d.id === id);
    const draft = current[index];
    if (draft) URL.revokeObjectURL(draft.previewUrl);
    const remaining = current.filter((d) => d.id !== id);
    setDrafts(remaining);
    if (id === activeId) {
      setActiveId(remaining[index]?.id ?? remaining[index - 1]?.id ?? null);
    }
  }

  function setDraftPage(id: string, pageNumber: string) {
    setDrafts((current) => current.map((d) => (d.id === id ? { ...d, pageNumber } : d)));
  }

  function handleDrop(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (drafts.length === 0) {
      setError("Add photos of the register pages first.");
      return;
    }
    if (issues.size > 0) {
      setShowIssues(true);
      const firstIssue = drafts.find((d) => issues.has(d.id));
      if (firstIssue) document.getElementById(`page-num-${firstIssue.id}`)?.focus();
      return;
    }
    if (!canSave) return;
    setSubmitting(true);
    setError("");
    try {
      const pages = await Promise.all(
        drafts.map(async (draft) => ({
          bookId,
          pageNumber: Number(draft.pageNumber),
          fileName: draft.file.name,
          imageUrl: await readFileAsDataUrl(draft.file),
        }))
      );
      await onSubmit(pages);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't attach these scans.");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedBook = readyBooks.find((b) => b.id === bookId);
  const photoLabel = drafts.length === 1 ? "1 photo" : `${drafts.length} photos`;
  const active = drafts.find((d) => d.id === activeId) ?? drafts[0];
  const activeIndex = active ? drafts.findIndex((d) => d.id === active.id) : -1;
  const activeIssue = active ? issues.get(active.id) : undefined;
  const typedActive = Boolean(active?.pageNumber.trim());
  const liveIssue =
    activeIssue &&
    (showIssues || (typedActive && activeIssue !== "Enter the page number written in the book."))
      ? activeIssue
      : undefined;

  function goToScan(index: number) {
    const next = drafts[index];
    if (!next) return;
    setActiveId(next.id);
    window.setTimeout(() => {
      document.getElementById(`page-num-${next.id}`)?.focus();
    }, 40);
  }

  return (
    <AdminDialog
      onClose={onClose}
      busy={submitting}
      panelClassName={drafts.length > 0 ? "h-[92dvh] max-w-[1100px]" : "max-w-[640px]"}
    >
      <AdminDialogHeader
        title="Add scanned pages"
        subtitle={
          drafts.length === 0
            ? "Drop photos of the register. You will number each page from the book next."
            : `${photoLabel}. Read the scan and enter the page number written in the book.`
        }
        onClose={onClose}
        busy={submitting}
      />
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = "";
          }}
        />

        {drafts.length === 0 ? (
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <BookField
              readyBooks={readyBooks}
              selectedBook={selectedBook}
              bookId={bookId}
              onBookId={setBookId}
            />
            {takenPages.size > 0 && (
              <p className="mb-4 text-admin-support text-admin-ink-muted">
                Already in this book: {Array.from(takenPages).sort((a, b) => a - b).join(", ")}
              </p>
            )}
            <DropZone
              dragging={dragging}
              setDragging={setDragging}
              onPick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              compact={false}
            />
            {error && <ErrorNote>{error}</ErrorNote>}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <div className="min-h-[62vh] flex-1 overflow-auto bg-[#f4efe6] lg:min-h-0">
              {active && (
                <img
                  src={active.previewUrl}
                  alt={`Scan ${activeIndex + 1}, ${active.file.name}`}
                  className="mx-auto block w-full max-w-[860px]"
                />
              )}
            </div>

            <aside className="flex w-full shrink-0 flex-col border-t border-admin-border lg:w-[300px] lg:border-l lg:border-t-0">
              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                <BookField
                  readyBooks={readyBooks}
                  selectedBook={selectedBook}
                  bookId={bookId}
                  onBookId={setBookId}
                />
                {takenPages.size > 0 && (
                  <p className="mb-4 text-admin-support text-admin-ink-muted">
                    Already in this book: {Array.from(takenPages).sort((a, b) => a - b).join(", ")}
                  </p>
                )}

                <p className="text-admin-body font-semibold text-admin-ink">
                  Scan {activeIndex + 1} of {drafts.length}
                </p>
                <p className="mb-3 truncate text-admin-label text-admin-ink-muted">{active?.file.name}</p>

                {active && (
                  <AdminField label="Page number" className="mb-2">
                    <AdminInput
                      id={`page-num-${active.id}`}
                      type="number"
                      min={1}
                      max={9999}
                      value={active.pageNumber}
                      onChange={(e) => setDraftPage(active.id, e.target.value)}
                      placeholder="As written in the book"
                      required
                      aria-invalid={Boolean(liveIssue)}
                      aria-describedby={liveIssue ? `page-num-${active.id}-error` : undefined}
                    />
                  </AdminField>
                )}
                {liveIssue && (
                  <p
                    id={active ? `page-num-${active.id}-error` : undefined}
                    className="mb-3 text-admin-support text-admin-red-700"
                  >
                    {liveIssue}
                  </p>
                )}

                <div className="mb-4 flex gap-2">
                  <AdminButton
                    variant="secondary"
                    type="button"
                    size="sm"
                    disabled={activeIndex <= 0}
                    onClick={() => goToScan(activeIndex - 1)}
                  >
                    Previous
                  </AdminButton>
                  <AdminButton
                    variant="secondary"
                    type="button"
                    size="sm"
                    disabled={activeIndex >= drafts.length - 1}
                    onClick={() => goToScan(activeIndex + 1)}
                  >
                    Next
                  </AdminButton>
                </div>

                <button
                  type="button"
                  onClick={() => active && removeDraft(active.id)}
                  className="mb-4 text-admin-support font-semibold text-admin-ink-muted hover:text-admin-red-700 hover:underline"
                >
                  Remove this photo
                </button>

                <DropZone
                  dragging={dragging}
                  setDragging={setDragging}
                  onPick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  compact
                />

                {drafts.length > 1 && (
                  <ol className="mt-4 flex flex-wrap gap-2">
                    {drafts.map((draft, i) => (
                      <li key={draft.id}>
                        <button
                          type="button"
                          onClick={() => goToScan(i)}
                          className={`block overflow-hidden rounded-[7px] border ${
                            draft.id === active?.id
                              ? "border-admin-green-700 ring-2 ring-admin-green-600/30"
                              : "border-admin-border hover:border-admin-green-600"
                          }`}
                          aria-label={`Scan ${i + 1}${draft.pageNumber ? `, page ${draft.pageNumber}` : ""}`}
                          aria-current={draft.id === active?.id ? "true" : undefined}
                        >
                          <img
                            src={draft.previewUrl}
                            alt=""
                            className="h-16 w-12 bg-white object-cover object-top"
                          />
                        </button>
                      </li>
                    ))}
                  </ol>
                )}

                {error && <ErrorNote>{error}</ErrorNote>}
              </div>
            </aside>
          </div>
        )}

        <AdminDialogFooter>
          <AdminButton variant="secondary" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" disabled={submitting || drafts.length === 0 || !bookId}>
            {submitting
              ? "Attaching…"
              : drafts.length === 0
                ? "Attach pages"
                : drafts.length === 1
                  ? "Attach 1 page"
                  : `Attach ${drafts.length} pages`}
          </AdminButton>
        </AdminDialogFooter>
      </form>
    </AdminDialog>
  );
}

function BookField({
  readyBooks,
  selectedBook,
  bookId,
  onBookId,
}: {
  readyBooks: LedgerBook[];
  selectedBook?: LedgerBook;
  bookId: string;
  onBookId: (id: string) => void;
}) {
  return (
    <AdminField label="Register book">
      {readyBooks.length <= 1 && selectedBook ? (
        <p className="text-admin-body text-admin-ink">
          {selectedBook.title} · {ledgerSacramentLabel(selectedBook.sacramentType)} ·{" "}
          {ledgerYearRange(selectedBook)}
        </p>
      ) : (
        <AdminSelect value={bookId} onChange={(e) => onBookId(e.target.value)} required>
          {readyBooks.length === 0 && <option value="">No books in this parish</option>}
          {readyBooks.map((b) => (
            <option key={b.id} value={b.id}>
              {b.title} · {ledgerSacramentLabel(b.sacramentType)} · {ledgerYearRange(b)}
            </option>
          ))}
        </AdminSelect>
      )}
    </AdminField>
  );
}

function DropZone({
  dragging,
  setDragging,
  onPick,
  onDrop,
  compact,
}: {
  dragging: boolean;
  setDragging: (value: boolean) => void;
  onPick: () => void;
  onDrop: (e: DragEvent<HTMLElement>) => void;
  compact: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`w-full rounded-[var(--radius)] border border-dashed text-center transition-colors ${
        compact ? "px-3 py-3" : "mb-4 px-4 py-6"
      } ${
        dragging
          ? "border-admin-green-700 bg-admin-green-050"
          : "border-admin-border-strong bg-admin-surface-alt hover:border-admin-green-600 hover:bg-admin-green-050/50"
      }`}
    >
      <span className="block text-admin-body font-semibold text-admin-ink">
        {compact ? "Add more photos" : "Drop photos here, or choose files"}
      </span>
      {!compact && (
        <span className="mt-1 block text-admin-support text-admin-ink-muted">
          JPG or PNG. Several pages at once is fine — you will number them below.
        </span>
      )}
    </button>
  );
}

function ErrorNote({ children }: { children: string }) {
  return (
    <p className="mt-4 rounded-[9px] border border-[#E3C3BC] bg-admin-red-100 px-3.5 py-2.5 text-admin-support text-admin-red-700">
      {children}
    </p>
  );
}
