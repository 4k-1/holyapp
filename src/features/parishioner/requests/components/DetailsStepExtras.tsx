import { useRef } from "react";

interface DetailsStepExtrasProps {
  relationship: string;
  sacramentDate: string;
  onRelationshipChange: (value: string) => void;
  onDateChange: (value: string) => void;
  documents: string[];
  onDocumentsChange: (docs: string[]) => void;
}

export function DetailsStepExtras({
  relationship,
  sacramentDate,
  onRelationshipChange,
  onDateChange,
  documents,
  onDocumentsChange,
}: DetailsStepExtrasProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    onDocumentsChange([...documents, ...files.map((f) => f.name)]);
    e.target.value = "";
  }

  function removeDoc(name: string) {
    onDocumentsChange(documents.filter((d) => d !== name));
  }

  return (
    <>
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide text-ink-muted">
            Relationship to the person on the record
          </label>
          <select
            value={relationship}
            onChange={(e) => onRelationshipChange(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option>Myself</option>
            <option>Parent</option>
            <option>Child</option>
            <option>Spouse</option>
            <option>Sibling</option>
            <option>Legal guardian</option>
            <option>Other</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide text-ink-muted">
            Approximate date of sacrament
          </label>
          <input
            type="date"
            value={sacramentDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wide text-ink-muted">
        Supporting documents <span className="font-medium normal-case tracking-normal text-ink-muted">(optional)</span>
      </label>
      <div className="rounded-2xl border-[1.5px] border-dashed border-border bg-surface-alt p-4">
        {documents.length === 0 ? (
          <p className="mb-2.5 text-xs leading-relaxed text-ink-muted">
            No documents attached yet — a photo of an old certificate or record can help staff match your record
            faster.
          </p>
        ) : (
          <div className="mb-2.5 flex flex-col gap-2">
            {documents.map((name) => (
              <div
                key={name}
                className="flex items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-sm"
              >
                <span className="text-accent">📎</span>
                <span className="flex-1 truncate">{name}</span>
                <button
                  type="button"
                  onClick={() => removeDoc(name)}
                  className="font-bold text-danger"
                  aria-label={`Remove ${name}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border border-border bg-surface px-4 py-2 text-[13.5px] font-semibold text-ink hover:bg-surface-alt"
        >
          + Add Document
        </button>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />
      </div>
    </>
  );
}