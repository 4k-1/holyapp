import { useState, type FocusEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GearIcon, UserIcon } from "@/components/ui/icons/AdminIcons";
import { ProfileMenu } from "@/components/layout/ProfileMenu";
import { PortalNotificationBell } from "@/features/parishioner/notifications/PortalNotificationBell";
import { logout } from "@/features/auth/api/authApi";
import { askConfirm } from "@/lib/notify";
import type { Parish } from "@/types";

interface NavbarProps {
  parish: Parish;
  userInitials: string;
  userName: string;
  userEmail: string;
}

type NavLinkItem = { to: string; label: string };
type NavEntry = { label: string; to?: string; links?: NavLinkItem[] };

// Grouped by what parishioners come to do. Paths are relative to /:parishSlug/portal.
const NAV: NavEntry[] = [
  { label: "Home", to: "" },
  {
    label: "Certificates",
    links: [
      { to: "requests/new", label: "Request a certificate" },
      { to: "requests", label: "My requests" },
      { to: "wallet", label: "Certificate wallet" },
    ],
  },
  {
    label: "Masses",
    links: [
      { to: "intention", label: "Offer a Mass" },
      { to: "intentions", label: "My Mass intentions" },
    ],
  },
  { label: "Give", to: "donate" },
  {
    label: "My records",
    links: [
      { to: "timeline", label: "Sacramental timeline" },
      { to: "marriage", label: "Marriage application" },
    ],
  },
];

/** Whether the page at `pathname` belongs to `to`: requests/123 belongs to "requests", but requests/new does not. */
function isUnder(pathname: string, portalRoot: string, to: string) {
  const here = pathname.replace(/\/+$/, "");
  if (!to) return here === portalRoot;
  const target = `${portalRoot}/${to}`;
  if (here === target) return true;
  if (to === "requests") return here.startsWith(`${target}/`) && !here.startsWith(`${target}/new`);
  return here.startsWith(`${target}/`);
}

export function Navbar({ parish, userInitials, userName, userEmail }: NavbarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const portalRoot = `/${parish.slug}/portal`;
  const here = (to: string) => isUnder(location.pathname, portalRoot, to);

  async function handleLogout() {
    const ok = await askConfirm({
      title: "Log out?",
      message: "You'll need to log in again to use the parishioner portal.",
      confirmLabel: "Log out",
    });
    if (!ok) return;
    await logout();
    navigate(`/${parish.slug}/login`, { replace: true });
  }

  return (
    <nav className="sticky top-0 z-50 bg-primary text-white shadow-md">
      <div className="mx-auto flex h-[64px] max-w-6xl items-center justify-between gap-3 px-4 sm:h-[68px] sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span
            title="HolyApp"
            className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/35 bg-white shadow-sm sm:h-9 sm:w-9"
          >
            <img src="/holyapp-logo.webp" alt="HolyApp" className="h-6 w-6 object-contain sm:h-7 sm:w-7" />
          </span>
          <span className="h-7 w-px shrink-0 bg-white/25" aria-hidden="true" />
          <Link
            to="."
            aria-label={`${parish.name}, back to your home page`}
            className="group flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            {parish.sealUrl ? (
              <img
                src={parish.sealUrl}
                alt=""
                className="h-8 w-8 shrink-0 rounded-full border border-white/35 bg-white object-cover transition-transform group-hover:scale-105 sm:h-9 sm:w-9"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/35 bg-gradient-to-br from-white to-accent font-serif text-sm font-bold text-primary transition-transform group-hover:scale-105 sm:h-9 sm:w-9">
                ✝
              </div>
            )}
            <div className="min-w-0 leading-tight">
              <div
                className="line-clamp-2 font-serif text-[13px] font-semibold leading-[1.2] sm:max-w-[280px] sm:text-[13.5px] lg:max-w-[260px]"
                title={parish.name}
              >
                {parish.name}
              </div>
              <div className="mt-0.5 truncate text-[11px] font-semibold uppercase tracking-wide text-white/75">
                Parishioner Portal
              </div>
            </div>
          </Link>
        </div>

        {/* Desktop nav */}
        <div className="hidden shrink-0 items-center gap-1 lg:flex">
          {NAV.map((entry) =>
            entry.links ? (
              <NavGroup key={entry.label} entry={entry} isHere={here} />
            ) : (
              <Link
                key={entry.label}
                to={entry.to || "."}
                aria-current={here(entry.to ?? "") ? "page" : undefined}
                className={`${topItem} ${here(entry.to ?? "") ? topActive : topIdle}`}
              >
                {entry.label}
              </Link>
            )
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <PortalNotificationBell parish={parish} />
          <ProfileMenu
            tone="portal"
            initials={userInitials}
            name={userName}
            email={userEmail}
            items={[
              { to: "account", label: "Account", icon: <UserIcon /> },
              { to: "settings", label: "Settings", icon: <GearIcon /> },
            ]}
            onLogout={handleLogout}
          />

          {/* Hamburger — mobile only */}
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xl text-white lg:hidden"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {menuOpen && (
        <div className="absolute max-h-[calc(100dvh-64px)] w-full overflow-y-auto border-t border-white/10 bg-primary px-4 pb-4 pt-2 shadow-lg lg:hidden">
          {/* A thin rule between sections, so a single page like Give doesn't read as part of the group above it. */}
          {NAV.map((entry, index) => (
            <div key={entry.label} className={index > 0 ? "mt-2 border-t border-white/10 pt-2" : ""}>
              {entry.links ? (
                <>
                  <p className="px-4 pb-1 pt-1 text-[0.8125rem] font-semibold text-white/60">{entry.label}</p>
                  {entry.links.map((item) => (
                    <MobileLink key={item.to} item={item} active={here(item.to)} onPick={() => setMenuOpen(false)} />
                  ))}
                </>
              ) : (
                <MobileLink
                  item={{ to: entry.to ?? "", label: entry.label }}
                  active={here(entry.to ?? "")}
                  onPick={() => setMenuOpen(false)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </nav>
  );
}

const topItem = "shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm transition-colors";
const topActive = "bg-white/15 font-semibold text-white";
const topIdle = "text-white/80 hover:bg-white/10 hover:text-white";

/** A top-level menu item with its pages underneath. Opens on click; closes on picking a page, Escape or clicking away. */
function NavGroup({ entry, isHere }: { entry: NavEntry; isHere: (to: string) => boolean }) {
  const [open, setOpen] = useState(false);
  const links = entry.links ?? [];
  const active = links.some((item) => isHere(item.to));

  function closeIfLeaving(e: FocusEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
  }

  return (
    <div className="relative" onBlur={closeIfLeaving} onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`${topItem} inline-flex items-center gap-1.5 ${active ? topActive : topIdle}`}
      >
        {entry.label}
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path d="m5 7.5 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 min-w-[220px] overflow-hidden rounded-xl border border-border bg-surface py-1.5 text-ink shadow-[0_12px_32px_rgba(14,59,70,0.18)]">
          {links.map((item) => {
            const current = isHere(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                aria-current={current ? "page" : undefined}
                className={`block px-4 py-2.5 text-sm hover:bg-surface-alt ${current ? "font-semibold text-primary" : "text-ink"}`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MobileLink({ item, active, onPick }: { item: NavLinkItem; active: boolean; onPick: () => void }) {
  return (
    <Link
      to={item.to || "."}
      onClick={onPick}
      aria-current={active ? "page" : undefined}
      className={`block rounded-lg px-4 py-2.5 text-sm ${
        active ? "bg-white/15 font-semibold text-white" : "text-white/85 hover:bg-white/10 hover:text-white"
      }`}
    >
      {item.label}
    </Link>
  );
}
