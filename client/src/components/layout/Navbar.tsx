import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import type { Parish } from "@/types";

interface NavbarProps {
  parish: Parish;
  userInitials: string;
  userName: string;
}

const navItems = [
  { to: "", label: "Dashboard", end: true },
  { to: "requests/new", label: "Request Certificate", end: true },
  { to: "requests", label: "My Requests", end: true },
  { to: "wallet", label: "Wallet", end: true },
];

export function Navbar({ parish, userInitials, userName }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-primary text-white shadow-md">
      <div className="mx-auto flex h-[64px] max-w-6xl items-center justify-between gap-3 px-4 sm:h-[68px] sm:px-6">
        {/* ⬇️ THIS is the block that got replaced */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {parish.sealUrl ? (
            <img
              src={parish.sealUrl}
              alt={`${parish.name} seal`}
              className="h-8 w-8 shrink-0 rounded-full border border-white/35 bg-white object-cover sm:h-9 sm:w-9"
            />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/35 bg-gradient-to-br from-white to-accent font-serif text-sm font-bold text-primary sm:h-9 sm:w-9">
              ✝
            </div>
          )}
          <div className="min-w-0 leading-tight">
            <div
              className="truncate font-serif text-[14px] font-semibold leading-tight sm:line-clamp-2 sm:max-w-[280px] sm:text-[12.5px] sm:whitespace-normal lg:max-w-[420px]"
              title={parish.name}
            >
              {parish.name}
            </div>
            <div className="mt-0.5 truncate text-[9px] uppercase tracking-wide text-white/60">
              Parishioner Portal
            </div>
          </div>
        </div>
        {/* ⬆️ end of replaced block */}

        {/* Desktop nav */}
        <div className="hidden shrink-0 items-center gap-1 md:flex">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to || "."}
              end={item.end}
              className={({ isActive }) =>
                `shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm transition-colors ${
                  isActive ? "bg-accent/20 font-semibold text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
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
            className="hidden items-center gap-1.5 rounded-full border border-accent/40 px-3 py-1.5 text-xs text-accent transition-colors hover:border-accent hover:bg-accent/10 sm:flex"
          >
            🛡 Verify
          </NavLink>
          <Link
            to="account"
            title={userName}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent/70 text-xs font-bold text-primary shadow-sm transition-transform hover:scale-105 sm:h-9 sm:w-9"
          >
            {userInitials}
          </Link>

          {/* Hamburger — mobile only */}
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xl text-white md:hidden"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {menuOpen && (
        <div className="absolute w-full flex flex-col gap-1 border-t border-white/10 bg-primary px-4 pb-4 pt-2 shadow-lg md:hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to || "."}
              end={item.to === ""}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `rounded-lg px-4 py-2.5 text-sm ${
                  isActive ? "bg-accent/20 font-semibold text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <NavLink
            to="verify"
            onClick={() => setMenuOpen(false)}
            className="mt-1 rounded-lg px-4 py-2.5 text-sm text-accent hover:bg-white/10"
          >
            🛡 Verify a Certificate
          </NavLink>
        </div>
      )}
    </nav>
  );
}