import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type SuperAdminKebabItem = {
  label: string;
  onClick: () => void;
  danger?: boolean;
};

export function SuperAdminKebabMenu({
  items,
  labelledBy,
}: {
  items: SuperAdminKebabItem[];
  labelledBy: string;
}) {
  const [open, setOpen] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) setPlaced(false);
  }

  useLayoutEffect(() => {
    if (!open) return;

    function place() {
      const btn = buttonRef.current;
      const menu = menuRef.current;
      if (!btn || !menu) return;
      const r = btn.getBoundingClientRect();
      const mw = menu.offsetWidth;
      const mh = menu.offsetHeight;
      let left = r.right - mw;
      if (left < 8) left = 8;
      if (left + mw > window.innerWidth - 8) left = Math.max(8, window.innerWidth - mw - 8);
      let top = r.bottom + 4;
      if (top + mh > window.innerHeight - 8 && r.top - mh - 4 >= 8) {
        top = r.top - mh - 4;
      }
      setCoords({ top, left });
      setPlaced(true);
    }

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, items.length]);

  useEffect(() => {
    if (!open) return;

    function handlePointer(e: MouseEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointer, true);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer, true);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className="relative flex justify-end">
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-admin-ink-muted hover:bg-admin-green-100 hover:text-admin-green-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-green-600/40"
        aria-label={`Actions for ${labelledBy}`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
          <circle cx="12" cy="5" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="12" cy="19" r="1.7" />
        </svg>
      </button>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              data-portal="admin"
              data-surface="platform"
              style={{ top: coords.top, left: coords.left }}
              className={`fixed z-[80] min-w-[168px] overflow-hidden rounded-md border border-admin-border bg-admin-surface py-1 font-sans shadow-[0_8px_24px_-4px_rgba(20,30,25,0.18)] ${
                placed ? "opacity-100" : "opacity-0"
              }`}
            >
              {items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    item.onClick();
                  }}
                  className={`block w-full px-3 py-2 text-left text-[12.5px] font-medium hover:bg-admin-green-100 ${
                    item.danger
                      ? "text-admin-red-700 hover:bg-admin-red-100 hover:text-admin-red-700"
                      : "text-admin-ink hover:text-admin-green-900"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
