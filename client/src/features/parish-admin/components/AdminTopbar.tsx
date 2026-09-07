import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDownIcon, LogoutIcon, PanelLeftCloseIcon, PanelLeftOpenIcon } from "@/components/ui/icons/AdminIcons";
import { logout } from "@/features/auth/api/authApi";
import { AdminNotificationBell } from "@/features/parish-admin/notifications/AdminNotificationBell";
import type { CurrentUser, Parish } from "@/types";

interface AdminTopbarProps {
  user: CurrentUser;
  parish: Parish;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  unreadCount?: number;
  onUnreadChange?: () => void;
}

export function AdminTopbar({
  user,
  parish,
  sidebarCollapsed,
  onToggleSidebar,
  unreadCount = 0,
  onUnreadChange,
}: AdminTopbarProps) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const initials = user.fullName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const roleLabel = user.role === "parish_admin" ? "Parish Admin" : "Parish Staff";

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  function handleSignOut() {
    setMenuOpen(false);
    logout();
    navigate(`/${parish.slug}/login`, { replace: true });
  }

  return (
    <div className="flex h-16 items-center border-b border-admin-border bg-admin-surface pr-6">
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center pl-2">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="flex shrink-0 items-center justify-center rounded-lg px-2.5 py-2 text-admin-ink-muted hover:bg-admin-surface-alt hover:text-admin-ink"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpenIcon className="h-[17px] w-[17px]" />
            ) : (
              <PanelLeftCloseIcon className="h-[17px] w-[17px]" />
            )}
          </button>

          <div className="flex min-w-0 items-center gap-2.5">
            {parish.sealUrl ? (
              <img src={parish.sealUrl} alt="" className="h-[34px] w-[34px] shrink-0 rounded-full object-contain" />
            ) : (
              <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-admin-green-100 font-serif text-sm font-bold text-admin-green-700">
                {parish.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0 overflow-hidden whitespace-nowrap leading-tight">
              <p className="truncate font-serif text-admin-group font-semibold text-admin-green-900">
                Parish Admin Portal
              </p>
              <p className="mt-0.5 truncate text-admin-label tracking-admin-label text-admin-ink-muted">{parish.name}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-3">
          <AdminNotificationBell
            parish={parish}
            unreadCount={unreadCount}
            onUnreadChange={onUnreadChange}
          />

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 hover:bg-admin-surface-alt"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-admin-green-100 text-xs font-bold text-admin-green-700">
                {initials}
              </div>
              <div className="text-left leading-tight">
                <p className="text-admin-body font-semibold text-admin-ink">{user.fullName}</p>
                <p className="text-admin-label text-admin-ink-muted">{roleLabel}</p>
              </div>
              <ChevronDownIcon
                className={`h-3.5 w-3.5 text-admin-ink-muted transition-transform duration-150 ${menuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[180px] overflow-hidden rounded-[10px] border border-admin-border bg-admin-surface py-1 shadow-[0_8px_24px_rgba(10,40,30,0.12)]"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-admin-body font-semibold text-admin-ink-muted hover:bg-admin-surface-alt hover:text-admin-ink"
                >
                  <LogoutIcon className="h-4 w-4 shrink-0 opacity-80" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
