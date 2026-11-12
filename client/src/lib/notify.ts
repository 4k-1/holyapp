// Short messages in the corner of the screen, and confirm questions in a proper dialog,
// in place of the browser's alert(), confirm() and prompt() pop-ups, which block the page and
// look out of place. Never use those browser pop-ups.
// Shown by <Notices> and <ConfirmHost> in App.tsx.

export const NOTICE_EVENT = "holyapp-notice";
export const CONFIRM_EVENT = "holyapp-confirm";

export type NoticeTone = "success" | "error";

export function notify(text: string, tone: NoticeTone = "success") {
  window.dispatchEvent(new CustomEvent(NOTICE_EVENT, { detail: { text, tone } }));
}

/** Shows the error's own message when it has one, otherwise the fallback. */
export function notifyError(err: unknown, fallback: string) {
  notify(err instanceof Error && err.message ? err.message : fallback, "error");
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  /** Red confirm button, for removing or rejecting something. */
  danger?: boolean;
}

export interface ConfirmRequest extends ConfirmOptions {
  /** When set, the dialog also asks for a line of text, and won't confirm until it's filled in. */
  input?: { label: string; placeholder?: string };
  resolve: (ok: boolean, text?: string) => void;
}

/** Asks a yes/no question in a dialog; resolves true only when the person confirms. */
export function askConfirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent<ConfirmRequest>(CONFIRM_EVENT, { detail: { ...options, resolve } }));
  });
}

/** Asks for a short piece of text, such as a reason, in a dialog; resolves the trimmed text, or null if cancelled. */
export function askText(options: ConfirmOptions & { label: string; placeholder?: string }): Promise<string | null> {
  const { label, placeholder, ...rest } = options;
  return new Promise((resolve) => {
    const detail: ConfirmRequest = {
      ...rest,
      input: { label, placeholder },
      resolve: (ok, text) => resolve(ok && text?.trim() ? text.trim() : null),
    };
    window.dispatchEvent(new CustomEvent<ConfirmRequest>(CONFIRM_EVENT, { detail }));
  });
}
