import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "@/features/auth/api/authApi";
import { AccountListRow } from "@/features/parishioner/account/components/AccountListRow";
import { PersonalInfoPanel } from "@/features/parishioner/account/components/PersonalInfoPanel";
import { ChangePasswordPanel } from "@/features/parishioner/account/components/ChangePasswordPanel";
import { DeleteAccountPanel } from "@/features/parishioner/account/components/DeleteAccountPanel";
import type { CurrentUser } from "@/types";

export function AccountPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<CurrentUser | null>(() => getCurrentUser());

  if (!user) return null;

  const initials = user.fullName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

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
            📷
          </button>
        </div>
        <h2 className="mt-3 font-serif text-xl font-bold text-ink">{user.fullName}</h2>
      </div>

      <p className="mb-2.5 ml-1 text-xs font-bold uppercase tracking-wide text-ink-muted">My Account</p>
      <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <AccountListRow icon="ℹ" label="Personal Information">
          <PersonalInfoPanel user={user} onUpdated={setUser} />
        </AccountListRow>
      </div>

      <p className="mb-2.5 ml-1 text-xs font-bold uppercase tracking-wide text-ink-muted">Security</p>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <AccountListRow icon="🛡" label="Change Password">
          <ChangePasswordPanel email={user.email} />
        </AccountListRow>
        <AccountListRow icon="🗑" label="Account Deletion" danger>
          <DeleteAccountPanel />
        </AccountListRow>
      </div>
    </div>
  );
}