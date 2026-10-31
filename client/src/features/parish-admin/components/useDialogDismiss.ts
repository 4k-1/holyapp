import { type RefObject, useEffect, useId, useRef, useState } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const FIELD = 'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])';

// Open dialogs, newest last. Only the top one answers Escape and Tab, so a confirm opened
// over a form closes on its own.
const openDialogs: object[] = [];

/**
 * Makes a pop-up window behave like one: Escape closes it (unless busy), the page behind
 * stops scrolling, focus starts inside it and Tab cannot leave it, screen readers announce
 * its heading, and focus goes back to whatever opened it when it closes.
 */
export function useDialogDismiss(onClose: () => void, busy = false, panelRef?: RefObject<HTMLElement | null>) {
  // Taken while rendering, before any autoFocus field inside the dialog moves focus.
  const [opener] = useState(() => document.activeElement as HTMLElement | null);
  const onCloseRef = useRef(onClose);
  const busyRef = useRef(busy);
  useEffect(() => {
    onCloseRef.current = onClose;
    busyRef.current = busy;
  });
  const headingId = useId();

  useEffect(() => {
    const panel = panelRef?.current ?? null;
    const focusables = () => Array.from(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);

    if (panel) {
      if (!panel.hasAttribute("aria-labelledby")) {
        const heading = panel.querySelector<HTMLElement>("h1, h2, h3");
        if (heading) {
          if (!heading.id) heading.id = headingId;
          panel.setAttribute("aria-labelledby", heading.id);
        }
      }
      // Start in the first field when there is one, rather than on the close button.
      if (!panel.contains(document.activeElement)) {
        (panel.querySelector<HTMLElement>(FIELD) ?? focusables()[0] ?? panel).focus();
      }
    }

    const token = {};
    openDialogs.push(token);

    function onKey(e: KeyboardEvent) {
      if (openDialogs[openDialogs.length - 1] !== token) return;
      if (e.key === "Escape") {
        if (!busyRef.current) {
          e.preventDefault();
          onCloseRef.current();
        }
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
        e.preventDefault();
        first.focus();
      }
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
      openDialogs.splice(openDialogs.indexOf(token), 1);
      if (opener?.isConnected) opener.focus();
    };
  }, [panelRef, opener, headingId]);
}
