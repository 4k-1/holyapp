import { useState, type FormEvent } from "react";
import { AdminDialog, AdminDialogFooter, AdminDialogHeader } from "@/features/parish-admin/components/AdminDialog";
import {
  AdminButton,
  AdminField,
  AdminInput,
  AdminSelect,
  AdminTextarea,
} from "@/features/parish-admin/components/AdminForm";
import {
  annotationTagClass,
  baptismCertificateNotationLine,
  formatRecordDate,
  todayIsoDate,
} from "@/features/parish-admin/records/baptismalHelpers";
import {
  ANNOTATION_CATEGORIES,
  LINKABLE_ANNOTATION_CATEGORIES,
  type AnnotationCategory,
  type LinkableAnnotationCategory,
  type RecordAnnotation,
} from "@/features/parish-admin/records/types";

const notePlaceholders: Record<AnnotationCategory, string> = {
  Confirmation: "Confirmed at Sto. Niño de Cebu Parish. Sponsor: Paula Bracho.",
  Marriage: "Married to Ana Marie Lopez at Sto. Niño de Cebu Parish.",
  Death: "Deceased on March 12, 2024. Buried at Carreta Cemetery.",
  Other: "Name corrected per civil registry; see attached document.",
};

export type AddAnnotationInput = Omit<RecordAnnotation, "id" | "by">;

interface AdminAddAnnotationModalProps {
  subjectName: string;
  baptismDate?: string;
  existingCategories?: AnnotationCategory[];
  onClose: () => void;
  onSubmit: (input: AddAnnotationInput) => Promise<void>;
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
  const [linkedCategory, setLinkedCategory] = useState<LinkableAnnotationCategory>("Confirmation");
  const [linkedBook, setLinkedBook] = useState("");
  const [linkedPage, setLinkedPage] = useState("");
  const [linkedLine, setLinkedLine] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const alreadyNoted = category !== "Other" && existingCategories.includes(category);
  const formattedDate = formatRecordDate(date, "");
  const certificateLine = baptismCertificateNotationLine({
    category,
    date: formattedDate || "—",
    note: note.trim(),
  });
  const linkReady = !linkEntry || Boolean(linkedBook.trim() && linkedPage.trim());
  const canSave = Boolean(note.trim() && date && linkReady && !submitting);

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
    <AdminDialog onClose={onClose} busy={submitting} panelClassName="max-w-[520px]">
      <AdminDialogHeader
        title="Add annotation"
        subtitle={`Later sacraments noted here print on the next baptismal certificate for ${subjectName}.`}
        onClose={onClose}
        busy={submitting}
      />

      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <AdminField label="Sacrament">
            <div role="radiogroup" aria-label="Sacrament" className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {ANNOTATION_CATEGORIES.map((c) => {
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
              max={todayIsoDate()}
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
                    <AdminSelect
                      value={linkedCategory}
                      onChange={(e) => setLinkedCategory(e.target.value as LinkableAnnotationCategory)}
                    >
                      {LINKABLE_ANNOTATION_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </AdminSelect>
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

        <AdminDialogFooter>
          <AdminButton variant="secondary" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </AdminButton>
          <AdminButton type="submit" disabled={!canSave}>
            {submitting ? "Saving…" : "Save annotation"}
          </AdminButton>
        </AdminDialogFooter>
      </form>
    </AdminDialog>
  );
}
