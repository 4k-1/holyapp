const FIELD_SELECTOR =
  'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]):not([disabled]), select:not([disabled]), textarea:not([disabled])';

const SKIP_INPUT_TYPES = new Set([
  "hidden",
  "checkbox",
  "radio",
  "file",
  "submit",
  "button",
  "reset",
  "image",
  "range",
  "color",
]);

function isVisibleField(el: HTMLElement) {
  if (el.getAttribute("aria-hidden") === "true") return false;
  return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

function fieldRoot(current: HTMLElement): ParentNode {
  return (
    current.closest("form") ||
    current.closest('[role="dialog"]') ||
    current.closest('[role="alertdialog"]') ||
    current.closest("[data-enter-fields]") ||
    current.closest("main") ||
    document.body
  );
}

function shouldAdvanceFrom(
  el: EventTarget | null
): el is HTMLInputElement | HTMLSelectElement {
  if (el instanceof HTMLSelectElement) return true;
  if (!(el instanceof HTMLInputElement)) return false;
  return !SKIP_INPUT_TYPES.has((el.type || "text").toLowerCase());
}

export function focusNextFormField(current: HTMLElement): boolean {
  const fields = Array.from(fieldRoot(current).querySelectorAll<HTMLElement>(FIELD_SELECTOR)).filter(
    isVisibleField
  );
  const index = fields.indexOf(current);
  if (index === -1) return false;

  const next = fields[index + 1];
  if (!next) return false;

  next.focus();
  if (next instanceof HTMLInputElement || next instanceof HTMLTextAreaElement) {
    try {
      const length = next.value.length;
      next.setSelectionRange(0, length);
    } catch {
      // date/number and similar types may not support selection
    }
  }
  return true;
}

export function handleEnterAdvancesField(event: KeyboardEvent) {
  if (event.defaultPrevented) return;
  if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.isComposing || event.keyCode === 229) return;
  if (!shouldAdvanceFrom(event.target)) return;

  if (focusNextFormField(event.target)) {
    event.preventDefault();
  }
}

export function bindEnterAdvancesField() {
  document.addEventListener("keydown", handleEnterAdvancesField, true);
  return () => document.removeEventListener("keydown", handleEnterAdvancesField, true);
}
