import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getRequestDocumentImage, type RequestDocument } from "./requestDocumentsApi";

/**
 * A supporting photo, fetched with the signed-in user's token (a plain <img src> can't send it) and shown
 * from memory. The address is dropped as soon as the photo leaves the screen.
 */
function usePhotoUrl(requestId: string, documentId: string) {
  const [state, setState] = useState<{ id: string; url: string; failed: boolean }>({ id: "", url: "", failed: false });
  useEffect(() => {
    let url = "";
    let cancelled = false;
    getRequestDocumentImage(requestId, documentId)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setState({ id: documentId, url, failed: false });
      })
      .catch(() => {
        if (!cancelled) setState({ id: documentId, url: "", failed: true });
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [requestId, documentId]);
  return state.id === documentId ? state : { id: documentId, url: "", failed: false };
}

/** A square preview that opens the full photo. */
export function DocumentThumb({
  requestId,
  document,
  className = "",
}: {
  requestId: string;
  document: RequestDocument;
  className?: string;
}) {
  const { url, failed } = usePhotoUrl(requestId, document.id);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!url}
        aria-label={`View ${document.name}`}
        className={`relative block aspect-square overflow-hidden rounded-lg border border-black/10 bg-black/[0.04] ${className}`}
      >
        {url ? (
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center px-1 text-center text-[11px] text-black/50">
            {failed ? "Couldn't load" : "Loading…"}
          </span>
        )}
      </button>
      {open && url && <DocumentViewer url={url} name={document.name} onClose={() => setOpen(false)} />}
    </>
  );
}

/** The photo full size over the page. Escape, the close button or a click outside closes it. */
function DocumentViewer({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={name}
      className="fixed inset-0 z-[200] flex flex-col bg-black/85 p-3 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mb-3 flex items-center gap-3 text-white">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{name}</p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="rounded-lg bg-white/15 px-3.5 py-2 text-sm font-semibold hover:bg-white/25"
        >
          Close
        </button>
      </div>
      <div
        className="flex min-h-0 flex-1 items-center justify-center overflow-auto"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <img src={url} alt={name} className="max-h-full max-w-full rounded-md object-contain" />
      </div>
    </div>,
    document.body
  );
}
