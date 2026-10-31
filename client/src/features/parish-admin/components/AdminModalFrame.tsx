import { type ReactNode, useRef } from "react";
import { useDialogDismiss } from "@/features/parish-admin/components/useDialogDismiss";

/**
 * The backdrop and panel shared by every pop-up window, so they all close on Escape or a
 * click outside, keep focus inside while open and hand it back when they close.
 * `align="top"` suits tall forms that scroll; `"center"` suits short questions.
 */
export function AdminModalFrame({
  children,
  onClose,
  busy = false,
  align = "top",
  role = "dialog",
  layer = "z-[60]",
  backdropClassName = "bg-black/45",
  panelClassName = "",
  panelProps,
}: {
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
  align?: "top" | "center";
  /** "alertdialog" for a question that needs an answer, such as confirming a removal. */
  role?: "dialog" | "alertdialog";
  layer?: string;
  backdropClassName?: string;
  panelClassName?: string;
  panelProps?: Record<string, unknown>;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogDismiss(onClose, busy, panelRef);

  const position =
    align === "top"
      ? "items-start overflow-y-auto p-4 pt-8 sm:pt-12"
      : "items-center overflow-hidden p-3 sm:p-4";

  return (
    <div className={`fixed inset-0 ${layer} flex justify-center ${position}`}>
      <div className={`absolute inset-0 ${backdropClassName}`} onClick={busy ? undefined : onClose} aria-hidden="true" />
      <div
        {...panelProps}
        ref={panelRef}
        role={role}
        aria-modal="true"
        tabIndex={-1}
        className={`relative z-10 w-full outline-none ${panelClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
