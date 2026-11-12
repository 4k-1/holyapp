import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeftIcon } from "@/components/ui/icons/AdminIcons";
import type { Parish } from "@/types";
import { Cloud } from "@/features/public/Cloud";
import "@/features/auth/styles/authDesk.css";

interface AuthShellProps {
  /** The parish being signed in to or registered with; null before one is chosen. */
  parish: Parish | null;
  back?: { label: string; onClick: () => void };
  children: ReactNode;
}

/**
 * Full-screen layout for every sign-in, sign-up, and password page: a deep teal sky with the landing page's drawn clouds, the HolyApp
 * headline on the left, and the form on one white card on the right. The parish being signed
 * in to sits at the top of the card. On phones the headline sits above the card.
 */
export function AuthShell({ parish, back, children }: AuthShellProps) {
  return (
    <div data-portal="admin" className="auth-desk auth-shell">
      <div className="auth-shell__sky" aria-hidden="true">
        {/* High clouds, faint against the deep sky. */}
        <Cloud className="left-[-12%] top-[6%] w-[46vw] max-w-[620px] opacity-[0.14]" drift={80} />
        <Cloud className="right-[-14%] top-[2%] w-[40vw] max-w-[540px] opacity-[0.1]" drift={95} delay={-30} flip />
        {/* A bank of cloud along the bottom. */}
        <Cloud className="bottom-[-9vw] left-[-14%] w-[56vw] opacity-[0.3]" drift={60} delay={-10} />
        <Cloud className="bottom-[-12vw] left-[26%] w-[58vw] opacity-[0.24]" drift={75} delay={-35} flip />
        <Cloud className="bottom-[-8vw] right-[-16%] w-[52vw] opacity-[0.3]" drift={65} delay={-25} />
      </div>
      <header className="auth-shell__header">
        <Link to="/" className="auth-home" aria-label="HolyApp home">
          <img src="/holyapp-logo.webp" alt="" />
          HolyApp
        </Link>
      </header>

      <div className="auth-shell__frame">
        <aside className="auth-brand" aria-label="HolyApp">
          <p className="auth-brand__headline">
            <span className="auth-rise auth-rise--1">Your church</span>{" "}
            <span className="auth-rise auth-rise--2">
              on the <span className="auth-brand__mark">cloud.</span>
            </span>
          </p>
          <p className="auth-brand__lead auth-rise auth-rise--3">
            Sacramental records, certificate requests, the Mass schedule and offerings, kept safe in one place for
            Catholic parishes in the Philippines.
          </p>
        </aside>

        <main className="auth-shell__main">
          <div className="auth-card auth-card--enter">
            {(parish || back) && (
              <div className="auth-card__top">
                {parish && <BrandMark parish={parish} />}
                {back && (
                  <button type="button" onClick={back.onClick} className="auth-desk__ghost auth-card__back">
                    <ArrowLeftIcon className="h-4 w-4" aria-hidden="true" />
                    {back.label}
                  </button>
                )}
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function BrandMark({ parish }: { parish: Parish }) {
  const seal = parish.sealUrl || parish.backgroundImageUrl;
  return (
    <div className="auth-mark">
      {seal ? (
        <img src={seal} alt="" className="auth-mark__seal" />
      ) : (
        <span className="auth-mark__seal auth-mark__seal--letter" aria-hidden="true">
          {parish.name.charAt(0)}
        </span>
      )}
      <span className="auth-mark__name">{parish.name}</span>
    </div>
  );
}
