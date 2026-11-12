import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { GearIcon, UserIcon } from "@/components/ui/icons/AdminIcons";
import { ProfileMenu } from "@/components/layout/ProfileMenu";
import { logout } from "@/features/auth/api/authApi";
import { askConfirm } from "@/lib/notify";
import type { Parish } from "@/types";

interface NavbarProps {
  parish: Parish;
  userInitials: string;
  userName: string;
  userEmail: string;
}

const navItems = [
  { to: "", label: "Dashboard", end: true },
  { to: "requests/new", label: "Request Certificate", end: true },
  { to: "requests", label: "My Requests", end: true },
  { to: "wallet", label: "Wallet", end: true },
  { to: "timeline", label: "Timeline", end: true },
];

export function Navbar({ parish, userInitials, userName, userEmail }: NavbarProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

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
            aria-label={`${parish.name}, back to your dashboard`}
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
                className="truncate font-serif text-[14px] font-semibold leading-tight sm:line-clamp-2 sm:max-w-[280px] sm:text-[13.5px] sm:whitespace-normal lg:max-w-[420px]"
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
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to || "."}
              end={item.end}
              className={({ isActive }) =>
                `shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm transition-colors ${
                  isActive ? "bg-white/15 font-semibold text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <NavLink
            to="verify"
            className={({ isActive }) =>
              `hidden items-center rounded-full border px-3 py-1.5 text-xs font-medium text-white transition-colors sm:flex ${
                isActive ? "border-white/60 bg-white/15" : "border-white/30 hover:border-white/60 hover:bg-white/10"
              }`
            }
          >
            Verify
          </NavLink>
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
        <div className="absolute w-full flex flex-col gap-1 border-t border-white/10 bg-primary px-4 pb-4 pt-2 shadow-lg lg:hidden">
          {[...navItems, { to: "verify", label: "Verify a Certificate", end: true }].map((item) => (
            <NavLink
              key={item.label}
              to={item.to || "."}
              end={item.end}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `rounded-lg px-4 py-2.5 text-sm ${
                  isActive ? "bg-white/15 font-semibold text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  );
}
