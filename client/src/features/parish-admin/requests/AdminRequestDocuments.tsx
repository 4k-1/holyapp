import { useEffect, useState } from "react";
import { DocumentThumb } from "@/features/parishioner/requests/documents/DocumentPhoto";
import {
  listRequestDocuments,
  type RequestDocument,
} from "@/features/parishioner/requests/documents/requestDocumentsApi";

/** The photos a parishioner attached to help find the record. Each one opened is written to the audit log. */
export function AdminRequestDocuments({
  requestId,
  count,
  bare = false,
}: {
  requestId: string;
  count: number;
  /** Without its own border, for a card that already has one. */
  bare?: boolean;
}) {
  const [documents, setDocuments] = useState<RequestDocument[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (count === 0) return undefined;
    let cancelled = false;
    listRequestDocuments(requestId)
      .then((data) => {
        if (!cancelled) setDocuments(data.documents);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [requestId, count]);

  if (count === 0) return null;

  return (
    <div className={bare ? "w-full" : "mb-3.5 rounded-md border border-admin-border px-4 py-3"}>
      <h4 className="font-sans text-admin-label font-semibold text-admin-ink">Supporting documents</h4>
      <p className="mt-0.5 text-admin-support text-admin-ink-muted">
        Photos the parishioner attached to help find the record. Deleted 7 days after the request is finished.
      </p>
      {failed ? (
        <p className="mt-2 text-admin-support text-admin-ink-muted">Couldn't load the photos.</p>
      ) : !documents ? (
        <p className="mt-2 text-admin-support text-admin-ink-muted">Loading…</p>
      ) : documents.length === 0 ? (
        <p className="mt-2 text-admin-support text-admin-ink-muted">The photos have been deleted.</p>
      ) : (
        <ul className={`mt-3 grid grid-cols-3 gap-2.5 ${bare ? "" : "sm:grid-cols-5"}`}>
          {documents.map((doc) => (
            <li key={doc.id} className="min-w-0">
              <DocumentThumb requestId={requestId} document={doc} />
              <p className="mt-1 truncate text-[11.5px] text-admin-ink-muted" title={doc.name}>
                {doc.name}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
