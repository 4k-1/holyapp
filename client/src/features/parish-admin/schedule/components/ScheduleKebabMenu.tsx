// src/features/parish-admin/schedule/components/ScheduleKebabMenu.tsx
import { useEffect, useRef, useState } from "react";

export interface KebabMenuItem {
  label: string;
  onClick: () => void;
  primary?: boolean;
}

interface ScheduleKebabMenuProps {
  items: (KebabMenuItem | null | false | undefined)[];
}

export function ScheduleKebabMenu({ items }: ScheduleKebabMenuProps) {
  const visible = items.filter(Boolean) as KebabMenuItem[];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handleOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    // Capture phase + mousedown so this fires before any other component's
    // click handler can stopPropagation() and swallow the event.
    document.addEventListener("mousedown", handleOutsideClick, true);
    return () => document.removeEventListener("mousedown", handleOutsideClick, true);
  }, [open]);

  if (visible.length === 0) return null;

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex h-6 w-6 items-center justify-center rounded-md text-admin-ink-muted hover:bg-black/5"
        aria-label="More actions"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
          <circle cx="12" cy="5" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="12" cy="19" r="1.7" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-md border border-admin-border bg-admin-surface py-1 shadow-[0_8px_24px_-4px_rgba(10,40,30,0.2)]"
          onClick={(e) => e.stopPropagation()}
        >
          {visible.map((it, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setOpen(false);
                it.onClick();
              }}
              className={`block w-full px-3 py-2 text-left text-admin-support font-medium hover:bg-admin-surface-alt ${
                it.primary ? "text-admin-green-700" : "text-admin-ink"
              }`}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}