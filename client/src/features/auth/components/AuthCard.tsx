import type { ReactNode } from "react";
import type { Parish } from "@/types";

interface AuthCardProps {
  parish?: Parish | null;
  children: ReactNode;
}

export function AuthCard({ parish, children }: AuthCardProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-primary px-4 py-10">
      {/* subtle pattern, purely decorative, safe to remove if you'd rather keep it flat */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(circle, white 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md rounded-xl bg-surface p-6 shadow-lg sm:p-8">
        {parish ? (
          <div className="mb-6 flex items-center gap-3 border-b border-border pb-4">
            {parish.sealUrl ? (
              <img
                src={parish.sealUrl}
                alt={`${parish.name} seal`}
                className="h-12 w-12 shrink-0 rounded object-contain"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-primary/10 font-serif text-lg font-semibold text-primary">
                {parish.name.charAt(0)}
              </div>
            )}
            <p className="font-serif text-sm font-semibold uppercase leading-tight tracking-wide text-ink">
              {parish.name}
            </p>
          </div>
        ) : (
          <div className="mb-6 flex items-center gap-2 border-b border-border pb-4">
            <span className="font-serif text-xl font-semibold text-primary">HolyApp</span>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}