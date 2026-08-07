import { useEffect, useState, type FormEvent } from "react";
import { AdminButton, AdminField, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { annotationTagClass } from "@/features/parish-admin/records/baptismalHelpers";
import type { AnnotationCategory, RecordAnnotation } from "@/features/parish-admin/records/types";

const CATEGORIES: AnnotationCategory[] = ["Confirmation", "Marriage", "Death", "Other"];

const notePlaceholders: Record<AnnotationCategory, string> = {
  Confirmation: "e.g. Confirmed at Sto. Niño de Cebu Parish. Sponsor: Paula Bracho.",
  Marriage: "e.g. Married to Ana Marie Lopez at Sto. Niño de Cebu Parish.",
  Death: "e.g. Deceased on March 12, 2024. Buried at Carreta Cemetery.",
  Other: "e.g. Name corrected per civil registry; see attached document.",
};

const selectClass =
  "w-full rounded-[7px] border border-admin-border-strong bg-white px-[11px] py-[9px] text-[13.5px] text-admin-ink focus:border-admin-green-600 focus:outline-none focus:ring-2 focus:ring-admin-green-600/25";

const textareaClass =
  "min-h-[96px] w-full resize-y rounded-[7px] border border-admin-border-strong bg-white px-[11px] py-[9px] text-[13.5px] leading-relaxed text-admin-ink focus:border-admin-green-600 focus:outline-none focus:ring-2 focus:ring-admin-green-600/25";

export type AddAnnotationInput = Omit<RecordAnnotation, "by">;

interface AdminAddAnnotationModalProps {
  subjectName: string;
  onClose: () => void;
  onSubmit: (input: AddAnnotationInput) => Promise<void>;
}

function formatAnnotationDate(iso: string) {
  if (!iso) return "";
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function AdminAddAnnotationModal({ subjectName, onClose, onSubmit }: AdminAddAnnotationModalProps) {
  const [category, setCategory] = useState<AnnotationCategory>("Confirmation");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [linkEntry, setLinkEntry] = useState(false);
  const [linkedCategory, setLinkedCategory] = useState("Confirmation");
  const [linkedBook, setLinkedBook] = useState("");
  const [linkedPage, setLinkedPage] = useState("");
  const [linkedLine, setLinkedLine] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, submitting]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!note.trim() || !date) return;

    setSubmitting(true);
    try {
      const input: AddAnnotationInput = {
        category,
        date: formatAnnotationDate(date),
        note: note.trim(),
        ...(linkEntry && linkedBook && linkedPage
          ? {
              linked: {
                category: linkedCategory,
                book: linkedBook,
                page: linkedPage,
                line: linkedLine || undefined,
              },
            }
          : {}),
      };
      await onSubmit(input);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-10">
      <div className="absolute inset-0 bg-black/40" onClick={submitting ? undefined : onClose} aria-hidden="true" />
      <div className="relative z-10 flex w-full max-w-[520px] flex-col overflow-hidden rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_12px_40px_-6px_rgba(10,40,30,0.25)]">
        <div className="flex items-start justify-between gap-3 border-b border-admin-border px-6 py-4">
          <div>
            <h3 className="font-serif text-lg font-semibold text-admin-ink">Add annotation</h3>
            <p className="mt-1 text-[13px] text-admin-ink-muted">
              Record a later sacrament on <span className="font-semibold text-admin-ink">{subjectName}</span>'s
              baptismal entry.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-admin-ink-muted hover:bg-admin-surface-alt disabled:opacity-50"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4">
          <AdminField label="Sacrament">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as AnnotationCategory)}
              className={selectClass}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <span
              className={`mt-2 inline-flex rounded-[5px] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.3px] ${annotationTagClass[category]}`}
            >
              {category}
            </span>
          </AdminField>

          <AdminField label="Date of sacrament">
            <AdminInput type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </AdminField>

          <AdminField label="Annotation note">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={notePlaceholders[category]}
              className={textareaClass}
              required
            />
          </AdminField>

          <div className="mb-4 rounded-[9px] border border-admin-border bg-admin-surface-alt p-3.5">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={linkEntry}
                onChange={(e) => setLinkEntry(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-admin-border-strong text-admin-green-700 focus:ring-admin-green-600/25"
              />
              <span>
                <span className="block text-[13px] font-semibold text-admin-ink">Link to register entry</span>
                <span className="mt-0.5 block text-[12px] leading-relaxed text-admin-ink-muted">
                  Optional. Point to the book, page, and line in another sacramental register.
                </span>
              </span>
            </label>

            {linkEntry && (
              <div className="mt-3.5 space-y-3 border-t border-admin-border pt-3.5">
                <AdminField label="Register type" className="mb-0">
                  <select
                    value={linkedCategory}
                    onChange={(e) => setLinkedCategory(e.target.value)}
                    className={selectClass}
                  >
                    <option>Confirmation</option>
                    <option>Marriage</option>
                    <option>Death</option>
                  </select>
                </AdminField>
                <div className="grid grid-cols-3 gap-2.5">
                  <AdminField label="Book" className="mb-0">
                    <AdminInput
                      placeholder="2"
                      value={linkedBook}
                      onChange={(e) => setLinkedBook(e.target.value)}
                    />
                  </AdminField>
                  <AdminField label="Page" className="mb-0">
                    <AdminInput
                      placeholder="08"
                      value={linkedPage}
                      onChange={(e) => setLinkedPage(e.target.value)}
                    />
                  </AdminField>
                  <AdminField label="Line" className="mb-0">
                    <AdminInput
                      placeholder="14"
                      value={linkedLine}
                      onChange={(e) => setLinkedLine(e.target.value)}
                    />
                  </AdminField>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2.5 border-t border-admin-border pt-4">
            <AdminButton variant="secondary" type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </AdminButton>
            <AdminButton type="submit" disabled={submitting || !note.trim() || !date}>
              {submitting ? "Saving…" : "Save annotation"}
            </AdminButton>
          </div>
        </form>
      </div>
    </div>
  );
}
