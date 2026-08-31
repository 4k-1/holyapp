import type { Parish } from "@/types";

interface ParishBrandingPanelProps {
  parish: Parish | null;
}

export function ParishBrandingPanel({ parish }: ParishBrandingPanelProps) {
  const hasBackground = Boolean(parish?.backgroundImageUrl);
  const tagline = parish?.tagline;

  return (
    <div
      className="relative hidden h-full w-full flex-col justify-center overflow-hidden p-10 md:flex"
      style={{
        backgroundImage: hasBackground ? `url(${parish!.backgroundImageUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {!hasBackground && (
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(160deg, var(--color-primary) 0%, #0e2419 100%)" }}
          aria-hidden="true"
        />
      )}
      <div className="absolute inset-0 bg-black/45" aria-hidden="true" />

      {/* ambient gold glow */}
      <div
        className="pointer-events-none absolute -left-24 top-1/4 h-[28rem] w-[28rem] rounded-full opacity-25 blur-[100px]"
        style={{ background: "#d4a017" }}
        aria-hidden="true"
      />

      <div className="relative z-10">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/70">
          {parish?.name ?? "HolyApp"}
        </p>
        <h2 className="max-w-md font-serif text-3xl font-semibold leading-tight text-white">
          Your sacramental records, kept with care and always within reach.
        </h2>
        <div className="mt-8 border-l-2 border-accent pl-4">
          <p className="max-w-sm font-serif text-lg italic text-white/90">
            {tagline ?? '"Let all that you do be done in love."'}
          </p>
          {!tagline && (
            <p className="mt-1 text-sm font-medium uppercase tracking-wide text-white/60">
              1 Corinthians 16:14
            </p>
          )}
        </div>
      </div>
    </div>
  );
}