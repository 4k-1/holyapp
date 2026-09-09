import type { Parish } from "@/types";
import "@/features/auth/styles/authDesk.css";

interface ParishBrandingPanelProps {
  parish: Parish | null;
}

export function ParishBrandingPanel({ parish }: ParishBrandingPanelProps) {
  const hasBackground = Boolean(parish?.backgroundImageUrl);
  const tagline = parish?.tagline;

  return (
    <div
      className="auth-desk__brand h-full w-full"
      style={{
        backgroundImage: hasBackground ? `url(${parish!.backgroundImageUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {!hasBackground && (
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 80% at 20% 20%, #2f6f2a 0%, transparent 55%), linear-gradient(165deg, #1f4a3a 0%, #172d31 70%)",
          }}
          aria-hidden="true"
        />
      )}
      <div className="auth-desk__brand-overlay" aria-hidden="true" />

      <div className="auth-desk__brand-copy">
        <p className="mb-3 text-[0.75rem] font-semibold tracking-[0.04em] text-white/65">
          {parish?.name ?? "HolyApp"}
        </p>
        <h2 className="font-serif text-[1.75rem] font-bold leading-tight tracking-[-0.01em] text-white sm:text-[2rem]">
          Your sacramental records, kept with care and always within reach.
        </h2>
        <div className="mt-8 border-l-2 border-white/40 pl-4">
          <p className="max-w-sm font-serif text-lg italic leading-snug text-white/90">
            {tagline ?? '"Let all that you do be done in love."'}
          </p>
          {!tagline && (
            <p className="mt-1.5 text-[0.75rem] font-medium tracking-[0.03em] text-white/55">
              1 Corinthians 16:14
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
