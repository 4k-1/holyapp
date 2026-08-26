import { useEffect, useState, type FormEvent } from "react";
import { AdminButton, AdminField, AdminInput, AdminTextarea } from "@/features/parish-admin/components/AdminForm";
import {
  annotationTagClass,
  baptismCertificateNotationLine,
} from "@/features/parish-admin/records/baptismalHelpers";
import type { AnnotationCategory, RecordAnnotation } from "@/features/parish-admin/records/types";

const CATEGORIES: AnnotationCategory[] = ["Confirmation", "Marriage", "Death", "Other"];
const LINKABLE: Exclude<AnnotationCategory, "Other">[] = ["Confirmation", "Marriage", "Death"];

const notePlaceholders: Record<AnnotationCategory, string> = {
  Confirmation: "Confirmed at Sto. Niño de Cebu Parish. Sponsor: Paula Bracho.",
  Marriage: "Married to Ana Marie Lopez at Sto. Niño de Cebu Parish.",
  Death: "Deceased on March 12, 2024. Buried at Carreta Cemetery.",
  Other: "Name corrected per civil registry; see attached document.",
};

const selectClass =
  "w-full rounded-[7px] border border-admin-border-strong bg-white px-[11px] py-[9px] text-admin-body text-admin-ink focus:border-admin-green-600 focus:outline-none focus:ring-2 focus:ring-admin-green-600/25";

export type AddAnnotationInput = Omit<RecordAnnotation, "id" | "by">;

interface AdminAddAnnotationModalProps {
  subjectName: string;
  baptismDate?: string;
  existingCategories?: AnnotationCategory[];
  onClose: () => void;
  onSubmit: (input: AddAnnotationInput) => Promise<void>;
}

function formatAnnotationDate(iso: string) {
  if (!iso) return "";
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function todayIso() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

export function AdminAddAnnotationModal({
  subjectName,
  baptismDate,
  existingCategories = [],
  onClose,
  onSubmit,
}: AdminAddAnnotationModalProps) {
  const [category, setCategory] = useState<AnnotationCategory>("Confirmation");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [linkEntry, setLinkEntry] = useState(false);
  const [linkedCategory, setLinkedCategory] = useState("Confirmation");
  const [linkedBook, setLinkedBook] = useState("");
  const [linkedPage, setLinkedPage] = useState("");
  const [linkedLine, setLinkedLine] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const alreadyNoted = category !== "Other" && existingCategories.includes(category);
  const formattedDate = formatAnnotationDate(date);
  const certificateLine = baptismCertificateNotationLine({
    category,
    date: formattedDate || "—",
    note: note.trim(),
  });
  const linkReady = !linkEntry || Boolean(linkedBook.trim() && linkedPage.trim());
  const canSave = Boolean(note.trim() && date && linkReady && !submitting);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) onClose();
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose, submitting]);

  function handleCategory(next: AnnotationCategory) {
    setCategory(next);
    if (next !== "Other") setLinkedCategory(next);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSave) return;

    setSubmitting(true);
    try {
      const input: AddAnnotationInput = {
        category,
        date: formattedDate,
        note: note.trim(),
        ...(linkEntry
          ? {
              linked: {
                category: linkedCategory,
                book: linkedBook.trim(),
                page: linkedPage.trim(),
                line: linkedLine.trim() || undefined,
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/45" onClick={submitting ? undefined : onClose} aria-hidden="true" />
      <div className="relative z-10 flex max-h-[min(92dvh,840px)] w-full max-w-[520px] flex-col overflow-hidden rounded-[var(--radius)] border border-admin-border bg-admin-surface shadow-[0_12px_40px_-6px_rgba(10,40,30,0.25)]">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-admin-border px-5 py-3.5">
          <div>
            <h3 className="font-serif text-admin-section font-semibold text-admin-ink">Add annotation</h3>
            <p className="mt-1 text-admin-support leading-relaxed text-admin-ink-muted">
              Later sacraments noted here print on the next baptismal certificate for {subjectName}.
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

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <AdminField label="Sacrament">
              <div role="radiogroup" aria-label="Sacrament" className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {CATEGORIES.map((c) => {
                  const selected = category === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => handleCategory(c)}
                      className={`rounded-[7px] border px-2 py-2 text-admin-label font-bold uppercase tracking-admin-label transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-green-600/25 ${
                        selected
                          ? `${annotationTagClass[c]} border-transparent`
                          : "border-admin-border-strong bg-admin-surface text-admin-ink-muted hover:bg-admin-surface-alt"
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </AdminField>

            {alreadyNoted && (
              <p className="mb-4 rounded-[9px] border border-admin-gold-700/25 bg-admin-gold-100 px-3.5 py-2.5 text-admin-support leading-relaxed text-admin-gold-700">
                {category} is already noted on this entry. Saving another will add a second line on the certificate.
              </p>
            )}

            <AdminField label="Date of sacrament">
              <AdminInput
                type="date"
                value={date}
                min={baptismDate}
                max={todayIso()}
                onChange={(e) => setDate(e.target.value)}
                required
                autoFocus
              />
            </AdminField>

            <AdminField label="Annotation note">
              <AdminTextarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={notePlaceholders[category]}
                required
              />
              <p className="mt-1.5 text-admin-label text-admin-ink-faint">
                Kept on the baptismal record. Confirmation, marriage, and death print as a date line; other notes print in
                full.
              </p>
            </AdminField>

            <div className="mb-4 rounded-[9px] border border-admin-border bg-admin-surface-alt px-3.5 py-3">
              <p className="text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">
                On the certificate
              </p>
              <p className="mt-1.5 font-serif text-admin-body italic leading-relaxed text-admin-ink">
                {!date
                  ? "Choose a date to see the line that will print."
                  : category === "Other" && !note.trim()
                    ? "Write the note that will print."
                    : certificateLine}
              </p>
            </div>

            <div className="rounded-[9px] border border-admin-border bg-admin-surface-alt p-3.5">
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={linkEntry}
                  onChange={(e) => setLinkEntry(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-admin-border-strong accent-admin-green-700"
                />
                <span>
                  <span className="block text-admin-body font-semibold text-admin-ink">Link to register entry</span>
                  <span className="mt-0.5 block text-admin-support leading-relaxed text-admin-ink-muted">
                    Optional. Book, page, and line in the {category === "Other" ? "related" : category.toLowerCase()}{" "}
                    register.
                  </span>
                </span>
              </label>

              {linkEntry && (
                <div className="mt-3.5 space-y-3 border-t border-admin-border pt-3.5">
                  {category === "Other" ? (
                    <AdminField label="Register type" className="mb-0">
                      <select
                        value={linkedCategory}
                        onChange={(e) => setLinkedCategory(e.target.value)}
                        className={selectClass}
                      >
                        {LINKABLE.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </AdminField>
                  ) : (
                    <p className="text-admin-support text-admin-ink-muted">{category} register</p>
                  )}
                  <div className="grid grid-cols-3 gap-2.5">
                    <AdminField label="Book" className="mb-0">
                      <AdminInput
                        placeholder="2"
                        value={linkedBook}
                        onChange={(e) => setLinkedBook(e.target.value)}
                        required={linkEntry}
                      />
                    </AdminField>
                    <AdminField label="Page" className="mb-0">
                      <AdminInput
                        placeholder="08"
                        value={linkedPage}
                        onChange={(e) => setLinkedPage(e.target.value)}
                        required={linkEntry}
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
          </div>

          <div className="flex shrink-0 justify-end gap-2.5 border-t border-admin-border px-5 py-3">
            <AdminButton variant="secondary" type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </AdminButton>
            <AdminButton type="submit" disabled={!canSave}>
              {submitting ? "Saving…" : "Save annotation"}
            </AdminButton>
          </div>
        </form>
      </div>
    </div>
  );
}
