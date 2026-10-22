import { useEffect } from "react";

/** Escape closes the dialog (unless busy) and the page behind it stops scrolling while open. */
export function useDialogDismiss(onClose: () => void, busy = false) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose, busy]);
}
