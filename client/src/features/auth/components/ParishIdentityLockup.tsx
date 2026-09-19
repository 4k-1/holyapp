import type { Parish } from "@/types";

interface ParishIdentityLockupProps {
  parish: Parish;
  eyebrow: string;
}

/** Compact seal + name letterhead used on login/register. */
export function ParishIdentityLockup({ parish, eyebrow }: ParishIdentityLockupProps) {
  return (
    <div className="mb-4 flex items-center gap-3.5 border-b border-[var(--auth-border)] pb-8">
      {parish.sealUrl ? (
        <img
          src={parish.sealUrl}
          alt=""
          className="h-12 w-12 shrink-0 rounded-full bg-white object-contain p-1.5 ring-1 ring-[var(--auth-border)]"
        />
      ) : (
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white font-serif text-lg font-bold text-[var(--auth-green-deep)] ring-1 ring-[var(--auth-border)]"
          aria-hidden
        >
          {parish.name.charAt(0)}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[0.6875rem] font-semibold tracking-[0.04em] text-[var(--auth-ink-soft)]">
          {eyebrow}
        </p>
        <p className="mt-0.5 font-serif text-[1.125rem] font-bold leading-snug tracking-[-0.01em] text-[var(--auth-ink)]">
          {parish.name}
        </p>
      </div>
    </div>
  );
}
