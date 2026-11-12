import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "@/features/auth/api/authApi";
import { PersonalInfoPanel } from "@/features/parishioner/account/components/PersonalInfoPanel";
import type { CurrentUser } from "@/types";
import { userInitials } from "@/lib/userInitials";

/** Your personal details. Password and closing the account are on the Settings page. */
export function AccountPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<CurrentUser | null>(() => getCurrentUser());

  if (!user) return null;

  const initials = userInitials(user);

  /** Back to the previous page, or the dashboard when this page was opened directly. */
  function handleBack() {
    if ((window.history.state as { idx?: number } | null)?.idx) navigate(-1);
    else navigate("..");
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <button
        type="button"
        onClick={handleBack}
        className="mb-6 flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
      >
        ← Back
      </button>

      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent font-serif text-xl font-bold text-primary">
          {initials}
        </div>
        <div className="min-w-0">
          <h1 className="font-serif text-2xl font-bold text-ink">{user.fullName}</h1>
          <p className="truncate text-sm text-ink-muted">{user.email}</p>
        </div>
      </div>

      <PersonalInfoPanel user={user} onUpdated={setUser} />
    </div>
  );
}
