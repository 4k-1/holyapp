import { useState, type FormEvent } from "react";
import { AdminDialog, AdminDialogFooter, AdminDialogHeader } from "@/features/parish-admin/components/AdminDialog";
import { AdminButton, AdminField, AdminInput, AdminSelect } from "@/features/parish-admin/components/AdminForm";
import { ledgerSacramentLabel, ledgerYearRange } from "@/features/parish-admin/ledgers/ledgersHelpers";
import type { LedgerBook } from "@/features/parish-admin/ledgers/types";

interface UploadLedgerPageModalProps {
  books: LedgerBook[];
  defaultBookId?: string;
  onClose: () => void;
  onSubmit: (input: { bookId: string; pageNumber: number; fileName: string }) => Promise<void>;
}

export function UploadLedgerPageModal({
  books,
  defaultBookId,
  onClose,
  onSubmit,
}: UploadLedgerPageModalProps) {
  const readyBooks = books.filter((b) => b.status === "ready" || b.status === "scanning");
  const [bookId, setBookId] = useState(defaultBookId ?? readyBooks[0]?.id ?? "");
  const [pageNumber, setPageNumber] = useState("");
  const [fileName, setFileName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canSave = Boolean(bookId && pageNumber && fileName && !submitting);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSubmitting(true);
    setError("");
    try {
      await onSubmit({ bookId, pageNumber: Number(pageNumber), fileName });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't attach this scan.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminDialog onClose={onClose} busy={submitting} panelClassName="max-w-[520px]">
      <AdminDialogHeader
        title="Upload scanned page"
        subtitle="Attach a register scan to a book. OCR runs on the server later — this only files the page."
        onClose={onClose}
        busy={submitting}
      />
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <AdminField label="Register book">
            <AdminSelect value={bookId} onChange={(e) => setBookId(e.target.value)} required>
              {readyBooks.length === 0 && <option value="">No books in this parish</option>}
              {readyBooks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} · {ledgerSacramentLabel(b.sacramentType)} · {ledgerYearRange(b)}
                </option>
              ))}
            </AdminSelect>
          </AdminField>
          <AdminField label="Page number">
            <AdminInput
              type="number"
              min={1}
              max={999}
              value={pageNumber}
              onChange={(e) => setPageNumber(e.target.value)}
              placeholder="14"
              required
            />
          </AdminField>
          <AdminField label="Scan file" className="mb-0">
            <input
              type="file"
              accept="image/*,.pdf"
              required
              className="w-full text-admin-body text-admin-ink file:mr-3 file:rounded-lg file:border file:border-admin-border-strong file:bg-admin-surface file:px-3 file:py-1.5 file:text-admin-support file:font-semibold file:text-admin-ink hover:file:bg-admin-surface-alt"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
            />
            <p className="mt-1.5 text-admin-label text-admin-ink-faint">
              JPG, PNG, or PDF. The file stays on this device in the prototype.
            </p>
          </AdminField>
          {error && (
            <p className="mt-4 rounded-[9px] border border-[#E3C3BC] bg-admin-red-100 px-3.5 py-2.5 text-admin-support text-admin-red-700">
              {error}
            </p>
          )}
        </div>
        <AdminDialogFooter>
          <AdminButton variant="secondary" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" disabled={!canSave}>
            {submitting ? "Uploading…" : "Attach page"}
          </AdminButton>
        </AdminDialogFooter>
      </form>
    </AdminDialog>
  );
}
