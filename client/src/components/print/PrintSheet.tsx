import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import "./print.css";

/** Renders its content outside the app root, hidden on screen and alone on the page when printing. */
export function PrintSheet({ className = "", children }: { className?: string; children: ReactNode }) {
  return createPortal(<div className={`print-sheet ${className}`}>{children}</div>, document.body);
}
