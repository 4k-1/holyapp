import { useState, type ReactNode } from "react";

interface AccountListRowProps {
  icon: ReactNode;
  label: string;
  danger?: boolean;
  children: ReactNode;
}

export function AccountListRow({ icon, label, danger, children }: AccountListRowProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-surface-alt"
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            danger ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary"
          }`}
        >
          {icon}
        </span>
        <span className={`flex-1 text-[14.5px] font-semibold ${danger ? "text-danger" : "text-ink"}`}>
          {label}
        </span>
        <span
          className={`shrink-0 text-ink-muted transition-transform ${open ? "rotate-90" : ""}`}
          aria-hidden="true"
        >
          ›
        </span>
      </button>
      {open && <div className="border-t border-border bg-surface-alt/60 px-4 py-5">{children}</div>}
    </div>
  );
}