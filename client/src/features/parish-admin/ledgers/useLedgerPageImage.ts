import { useEffect, useState } from "react";
import { getLedgerPageImage } from "@/features/parish-admin/ledgers/api/ledgersApi";

/**
 * A stored page photo as an object URL. The API needs the signed-in user's token, which a
 * plain <img src> can't send, so the photo is fetched and shown from memory. Also returns
 * the Blob, for the record form's row picture.
 */
export function useLedgerPageImage(parishId: string, pageId: string | undefined, size: "thumb" | "full" = "full") {
  const [state, setState] = useState<{ key: string; url: string; blob: Blob | null; failed: boolean }>({
    key: "",
    url: "",
    blob: null,
    failed: false,
  });
  const key = pageId ? `${parishId}/${pageId}/${size}` : "";

  useEffect(() => {
    if (!pageId) return undefined;
    let url = "";
    let cancelled = false;
    getLedgerPageImage(parishId, pageId, size)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setState({ key, url, blob, failed: false });
      })
      .catch(() => {
        if (!cancelled) setState({ key, url: "", blob: null, failed: true });
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [parishId, pageId, size, key]);

  // Until the photo for the current page arrives, report nothing (not the previous page's).
  return state.key === key ? state : { key, url: "", blob: null, failed: false };
}
