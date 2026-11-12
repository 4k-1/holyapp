import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { LogoutIcon } from "@/components/ui/icons/AdminIcons";

export interface ProfileMenuItem {
  to: string;
  label: string;
  icon: ReactNode;
}

interface ProfileMenuProps {
  initials: string;
  name: string;
  email?: string;
  /** A third header line, e.g. "Parish Admin · Mt. Carmel Parish". */
  detail?: string;
  /** Things about the signed-in person only; parish-wide setup stays in the sidebar. */
  items: ProfileMenuItem[];
  /** Asks to confirm, then logs out. The menu closes first. */
  onLogout: () => void;
  /** "portal" sits on the parishioner's teal navbar; "admin" on the white admin top bars. */
  tone: "portal" | "admin";
}

const TONES = {
  portal: {
    button:
      "bg-gradient-to-br from-accent to-accent/70 text-primary focus-visible:ring-white/70",
    panel: "border-border bg-surface text-ink shadow-[0_8px_24px_rgba(10,40,45,0.16)]",
    divider: "border-border",
    name: "text-ink",
    muted: "text-ink-muted",
    item: "text-ink hover:bg-surface-alt focus-visible:bg-surface-alt",
    icon: "text-ink-muted",
  },
  admin: {
    button: "bg-admin-green-100 text-admin-green-700 focus-visible:ring-admin-green-600/40",
    panel: "border-admin-border bg-admin-surface text-admin-ink shadow-[0_8px_24px_rgba(10,40,45,0.14)]",
    divider: "border-admin-border",
    name: "text-admin-ink",
    muted: "text-admin-ink-muted",
    item: "text-admin-ink hover:bg-admin-surface-alt focus-visible:bg-admin-surface-alt",
    icon: "text-admin-ink-muted",
  },
} as const;

/** The round initials button in every portal's top bar, opening the person's own menu: account items and Log out. */
export function ProfileMenu({ initials, name, email, detail, items, onLogout, tone }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const t = TONES[tone];

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const itemClass = `flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium focus-visible:outline-none ${t.item}`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${name}, account menu`}
        title={name}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 sm:h-9 sm:w-9 ${t.button}`}
      >
        {initials}
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute right-0 top-[calc(100%+8px)] z-50 w-[260px] overflow-hidden rounded-xl border py-1 ${t.panel}`}
        >
          <div className={`border-b px-4 py-3 ${t.divider}`}>
            <p className={`truncate text-sm font-semibold ${t.name}`}>{name}</p>
            {email && <p className={`mt-0.5 truncate text-[0.8125rem] ${t.muted}`}>{email}</p>}
            {detail && <p className={`mt-0.5 truncate text-[0.8125rem] ${t.muted}`}>{detail}</p>}
          </div>
          <div className="py-1">
            {items.map((item) => (
              <Link key={item.to} to={item.to} role="menuitem" onClick={() => setOpen(false)} className={itemClass}>
                <span className={`flex h-4 w-4 shrink-0 [&>svg]:h-full [&>svg]:w-full ${t.icon}`}>{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
          <div className={`border-t py-1 ${t.divider}`}>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className={itemClass}
            >
              <LogoutIcon className="h-4 w-4 shrink-0" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
