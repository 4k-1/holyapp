import { useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { getCurrentUser, logout } from "@/features/auth/api/authApi";
import { AccountListRow } from "@/features/parishioner/account/components/AccountListRow";
import { PersonalInfoPanel } from "@/features/parishioner/account/components/PersonalInfoPanel";
import { ChangePasswordPanel } from "@/features/parishioner/account/components/ChangePasswordPanel";
import { DeleteAccountPanel } from "@/features/parishioner/account/components/DeleteAccountPanel";
import type { CurrentUser, Parish } from "@/types";

export function AccountPage() {
  const navigate = useNavigate();
  const { parish } = useOutletContext<{ parish: Parish }>();
  const [user, setUser] = useState<CurrentUser | null>(() => getCurrentUser());

  if (!user) return null;

  const initials = user.fullName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleLogout() {
    await logout();
    navigate(`/${parish.slug}/login`, { replace: true });
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
      >
        ← Back
      </button>

      {/* Hero */}
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="relative">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent/70 font-serif text-2xl font-bold text-primary shadow-sm">
            {initials}
          </div>
          <button
            type="button"
            title="Change photo"
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-primary text-xs text-white shadow-sm"
          >
            
          </button>
        </div>
        <h2 className="mt-3 font-serif text-xl font-bold text-ink">{user.fullName}</h2>
      </div>

      <p className="mb-2.5 ml-1 text-xs font-bold uppercase tracking-wide text-ink-muted">My Account</p>
      <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <AccountListRow icon="ℹ" label="Personal Information">
          <PersonalInfoPanel user={user} onUpdated={setUser} />
        </AccountListRow>
        <Link
          to="../timeline"
          className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-surface-alt"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            ✝
          </span>
          <span className="flex-1 text-[14.5px] font-semibold text-ink">Sacramental timeline</span>
          <span className="shrink-0 text-ink-muted" aria-hidden="true">
            ›
          </span>
        </Link>
      </div>

      <p className="mb-2.5 ml-1 text-xs font-bold uppercase tracking-wide text-ink-muted">Security</p>
      <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <AccountListRow icon="🛡" label="Change Password">
          <ChangePasswordPanel email={user.email} />
        </AccountListRow>
        <AccountListRow icon="🗑" label="Account Deletion" danger>
          <DeleteAccountPanel />
        </AccountListRow>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="w-full rounded-2xl border border-border bg-surface px-4 py-3.5 text-center text-sm font-semibold text-danger shadow-sm transition-colors hover:bg-danger/5"
      >
        Log Out
      </button>
    </div>
  );
}