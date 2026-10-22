import type { ReactNode } from "react";
import { ArrowLeftIcon } from "@/components/ui/icons/AdminIcons";
import type { Parish } from "@/types";
import "@/features/auth/styles/authDesk.css";

interface AuthShellProps {
  /** The parish being signed in to or registered with; null before one is chosen. */
  parish: Parish | null;
  back?: { label: string; onClick: () => void };
  children: ReactNode;
}

/**
 * Full-screen layout for every sign-in, sign-up, and password page: a brand panel on the left with the parish
 * seal and name shown once, and the form alone on the right. On phones the panel folds into a small header.
 */
export function AuthShell({ parish, back, children }: AuthShellProps) {
  return (
    <div data-portal="admin" className="auth-desk auth-shell">
      <div className="auth-shell__frame">
        <AuthBrandPanel parish={parish} />
        <main className="auth-shell__main">
          <div className="auth-shell__mobile-brand md:hidden">
            <BrandMark parish={parish} tone="light" />
          </div>
          <div className="auth-shell__top">
            {back && (
              <button type="button" onClick={back.onClick} className="auth-desk__ghost">
                <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
                {back.label}
              </button>
            )}
          </div>
          <div className="auth-shell__body">
            <div className="auth-shell__content">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}

function AuthBrandPanel({ parish }: { parish: Parish | null }) {
  const tagline = parish?.tagline;
  return (
    <aside className="auth-brand" aria-label={parish ? parish.name : "HolyApp"}>
      <ArchFrame />
      <div className="auth-brand__inner">
        <BrandMark parish={parish} tone="dark" />
        <div className="auth-brand__copy">
          <CrossOrnament />
          <p className="auth-brand__headline">Your sacramental records, kept with care and always within reach.</p>
          <figure className="auth-brand__quote">
            <blockquote>{tagline ?? "“Let all that you do be done in love.”"}</blockquote>
            {!tagline && <figcaption>1 Corinthians 16:14</figcaption>}
          </figure>
        </div>
      </div>
    </aside>
  );
}

/** A fine double pointed-arch outline, like a chapel window, framing the brand panel. */
function ArchFrame() {
  return (
    <svg className="auth-brand__arch" viewBox="0 0 400 600" preserveAspectRatio="none" aria-hidden="true">
      <path d="M24 600 V230 Q24 70 200 24 Q376 70 376 230 V600" vectorEffect="non-scaling-stroke" />
      <path d="M38 600 V236 Q38 86 200 42 Q362 86 362 236 V600" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function CrossOrnament() {
  return (
    <svg className="auth-brand__cross" viewBox="0 0 120 24" aria-hidden="true">
      <line x1="0" y1="12" x2="48" y2="12" />
      <line x1="72" y1="12" x2="120" y2="12" />
      <path d="M60 2 V22 M53 9 H67" />
    </svg>
  );
}

function BrandMark({ parish, tone }: { parish: Parish | null; tone: "dark" | "light" }) {
  const seal = parish?.sealUrl || parish?.backgroundImageUrl;
  return (
    <div className={`auth-mark auth-mark--${tone}`}>
      {parish ? (
        seal ? (
          <img src={seal} alt="" className="auth-mark__seal" />
        ) : (
          <span className="auth-mark__seal auth-mark__seal--letter" aria-hidden="true">
            {parish.name.charAt(0)}
          </span>
        )
      ) : null}
      <span className="auth-mark__name">{parish ? parish.name : "HolyApp"}</span>
    </div>
  );
}
