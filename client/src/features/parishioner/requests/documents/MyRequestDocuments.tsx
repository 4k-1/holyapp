import { useEffect, useRef, useState } from "react";
import { askConfirm, notify, notifyError } from "@/lib/notify";
import { DocumentThumb } from "./DocumentPhoto";
import {
  DOCUMENT_ACCEPT,
  documentProblem,
  listRequestDocuments,
  MAX_DOCUMENTS,
  removeRequestDocument,
  uploadRequestDocument,
  type RequestDocument,
} from "./requestDocumentsApi";

/**
 * The photos attached to one of the parishioner's requests. They can add or remove photos until the
 * office starts on the request; after that the photos are only shown.
 */
export function MyRequestDocuments({ requestId, failedUploads = [] }: { requestId: string; failedUploads?: string[] }) {
  const [documents, setDocuments] = useState<RequestDocument[] | null>(null);
  const [canChange, setCanChange] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    listRequestDocuments(requestId)
      .then((data) => {
        if (cancelled) return;
        setDocuments(data.documents);
        setCanChange(data.canChange);
      })
      .catch(() => {
        if (!cancelled) setDocuments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  async function add(files: File[]) {
    setProblem(null);
    const room = MAX_DOCUMENTS - (documents?.length ?? 0);
    const problems: string[] = [];
    const ok = files.filter((file) => {
      const issue = documentProblem(file);
      if (issue) problems.push(issue);
      return !issue;
    });
    if (ok.length > room) problems.push(`You can attach up to ${MAX_DOCUMENTS} photos.`);
    setBusy(true);
    for (const file of ok.slice(0, Math.max(0, room))) {
      try {
        const doc = await uploadRequestDocument(requestId, file);
        setDocuments((prev) => [...(prev ?? []), doc]);
      } catch (err) {
        problems.push(err instanceof Error && err.message ? err.message : `Couldn't attach ${file.name}.`);
      }
    }
    setBusy(false);
    if (problems.length) setProblem([...new Set(problems)].join(" "));
  }

  async function remove(doc: RequestDocument) {
    const yes = await askConfirm({
      title: "Remove this photo?",
      message: `${doc.name} will be deleted and the office won't see it.`,
      confirmLabel: "Remove",
      danger: true,
    });
    if (!yes) return;
    try {
      await removeRequestDocument(requestId, doc.id);
      setDocuments((prev) => (prev ?? []).filter((d) => d.id !== doc.id));
      notify("Photo removed.");
    } catch (err) {
      notifyError(err, "Couldn't remove the photo.");
    }
  }

  if (documents === null) return null;
  if (documents.length === 0 && !canChange) return null;

  const full = documents.length >= MAX_DOCUMENTS;

  return (
    <section aria-labelledby="docs-heading" className="mt-6 rounded-2xl border border-border bg-surface px-4 py-4 shadow-[var(--shadow-card)] sm:px-6 sm:py-5">
      <h2 id="docs-heading" className="font-sans text-[1rem] font-semibold text-ink">
        Supporting documents
      </h2>
      <p className="mt-1 text-[0.875rem] leading-relaxed text-ink-muted">
        Only you and the parish office can see these photos. They are deleted 7 days after your request is finished.
      </p>

      {failedUploads.length > 0 && (
        <p role="alert" className="mt-3 rounded-xl border border-danger/25 bg-danger/[0.06] px-3.5 py-2.5 text-[0.875rem] text-ink">
          Your request was sent, but {failedUploads.length === 1 ? `${failedUploads[0]} wasn't` : `${failedUploads.length} photos weren't`}{" "}
          attached. {canChange ? "Add it again below." : "Bring it to the parish office instead."}
        </p>
      )}

      {documents.length > 0 ? (
        <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {documents.map((doc) => (
            <li key={doc.id} className="min-w-0">
              <DocumentThumb requestId={requestId} document={doc} />
              <p className="mt-1.5 truncate text-[0.75rem] text-ink-muted" title={doc.name}>
                {doc.name}
              </p>
              {canChange && (
                <button
                  type="button"
                  onClick={() => remove(doc)}
                  className="mt-0.5 rounded-md text-[0.8125rem] font-semibold text-danger hover:underline"
                  aria-label={`Remove ${doc.name}`}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[0.875rem] text-ink-muted">No photos attached.</p>
      )}

      {canChange && !full && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-dashed border-primary/50 bg-primary/[0.04] px-4 text-[0.875rem] font-semibold text-primary hover:bg-primary/[0.08] disabled:opacity-60"
        >
          {busy ? "Attaching…" : <><span aria-hidden="true">+</span> Add a photo</>}
        </button>
      )}
      {problem && (
        <p role="alert" className="mt-2 text-[0.8125rem] font-medium text-danger">
          {problem}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={DOCUMENT_ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          void add(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
    </section>
  );
}
