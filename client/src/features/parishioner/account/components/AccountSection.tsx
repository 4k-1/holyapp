import type { ReactNode } from "react";

/** One white card on the Account page, with a serif title and an optional button beside it. */
export function AccountSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-surface px-5 py-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-serif text-lg font-bold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
