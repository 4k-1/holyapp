import { Fragment, useCallback, useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";

/*
 * The ⋮ menu at the end of a table row, for the actions that would otherwise crowd it.
 * The everyday action can stay in the row as a button. Removing or rejecting goes last,
 * in red, below a divider.
 */

export interface RowAction {
  label: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** Leave the action out, e.g. when it doesn't apply to this row. */
  hidden?: boolean;
}

const MENU_WIDTH = 208;
const ITEM = "[role=menuitem]:not([disabled])";

export function AdminRowActions({ label, actions }: { label: string; actions: RowAction[] }) {
  const shown = actions.filter((a) => !a.hidden);
  const ordered = [...shown.filter((a) => !a.danger), ...shown.filter((a) => a.danger)];
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }, []);

  function toggle() {
    if (open) return close();
    const rect = buttonRef.current!.getBoundingClientRect();
    const height = ordered.length * 40 + 16;
    const opensUp = rect.bottom + height > window.innerHeight - 8 && rect.top > height;
    setPlace({
      position: "fixed",
      // Kept on screen on narrow phones.
      left: Math.max(8, Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8)),
      ...(opensUp ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
      width: MENU_WIDTH,
    });
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLButtonElement>(ITEM)?.focus();
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) close(false);
    }
    // The menu is placed against the window, so it would drift away from its row.
    function onMove() {
      close(false);
    }
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, close]);

  function onMenuKey(event: KeyboardEvent) {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>(ITEM) ?? []);
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const go = (i: number) => {
      event.preventDefault();
      items[(i + items.length) % items.length]?.focus();
    };
    if (event.key === "ArrowDown") go(index + 1);
    else if (event.key === "ArrowUp") go(index - 1);
    else if (event.key === "Home") go(0);
    else if (event.key === "End") go(items.length - 1);
    else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === "Tab") close(false);
  }

  if (!ordered.length) return null;
  const firstDanger = ordered.findIndex((a) => a.danger);
  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-admin-ink-muted transition hover:bg-admin-surface-alt hover:text-admin-ink focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-admin-green-100 ${
          open ? "bg-admin-surface-alt text-admin-ink" : ""
        }`}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-[18px] w-[18px]" aria-hidden="true">
          <circle cx="10" cy="4" r="1.6" />
          <circle cx="10" cy="10" r="1.6" />
          <circle cx="10" cy="16" r="1.6" />
        </svg>
      </button>
      {open &&
        createPortal(
          // Inside data-portal so the admin colours apply; the menu itself is drawn on <body>.
          <div data-portal="admin" className="contents">
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label={label}
              style={place}
              onKeyDown={onMenuKey}
              onClick={(e) => e.stopPropagation()}
              className="z-[65] overflow-hidden rounded-lg border border-admin-border bg-white py-1 text-left shadow-[0_12px_32px_-8px_rgb(14_59_70/0.3)]"
            >
              {ordered.map((action, i) => (
                <Fragment key={action.label}>
                  {i === firstDanger && i > 0 && <div role="separator" className="my-1 border-t border-admin-border" />}
                  <button
                    type="button"
                    role="menuitem"
                    disabled={action.disabled}
                    onClick={() => {
                      close(false);
                      action.onSelect();
                    }}
                    className={`flex w-full items-center px-4 py-2.5 text-left text-admin-body outline-none transition disabled:cursor-not-allowed disabled:opacity-50 ${
                      action.danger
                        ? "text-red-700 hover:bg-red-50 focus:bg-red-50"
                        : "text-admin-ink hover:bg-admin-surface-alt focus:bg-admin-surface-alt"
                    }`}
                  >
                    {action.label}
                  </button>
                </Fragment>
              ))}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
