import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { getCurrentUser, logout, sendPasswordResetEmail } from "@/features/auth/api/authApi";
import { AccountSection } from "@/features/parishioner/account/components/AccountSection";
import { PersonalInfoPanel } from "@/features/parishioner/account/components/PersonalInfoPanel";
import { Button } from "@/components/ui/Button";
import { askConfirm, notifyError } from "@/lib/notify";
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
    const ok = await askConfirm({
      title: "Log out?",
      message: "You'll need to log in again to use the parishioner portal.",
      confirmLabel: "Log out",
    });
    if (!ok) return;
    await logout();
    navigate(`/${parish.slug}/login`, { replace: true });
  }

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

      <div className="flex flex-col gap-4">
        <PersonalInfoPanel user={user} onUpdated={setUser} />

        <AccountSection title="Password">
          <PasswordReset email={user.email} />
        </AccountSection>

        <AccountSection title="Closing your account">
          <p className="text-sm leading-relaxed text-ink-muted">
            To close your portal account, contact the parish office
            {parish.email || parish.contact ? " at " : "."}
            {parish.email && (
              <a href={`mailto:${parish.email}`} className="font-medium text-primary underline-offset-2 hover:underline">
                {parish.email}
              </a>
            )}
            {parish.email && parish.contact && " or "}
            {parish.contact && <span className="font-medium text-ink">{parish.contact}</span>}
            {(parish.email || parish.contact) && "."} Your sacramental records stay in the parish register either way.
          </p>
        </AccountSection>
      </div>

      <button
        type="button"
        onClick={handleLogout}
        className="mx-auto mt-8 block rounded-lg px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/5"
      >
        Log out
      </button>
    </div>
  );
}

function PasswordReset({ email }: { email: string }) {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleSend() {
    setSending(true);
    try {
      await sendPasswordResetEmail();
      setSent(true);
    } catch (err) {
      notifyError(err, "Could not send the reset email. Try again in a moment.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <p className="text-sm leading-relaxed text-ink">
        Reset link sent to <strong>{email}</strong>. It works for 30 minutes.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm leading-relaxed text-ink-muted">We'll email you a link to set a new password.</p>
      <Button variant="secondary" onClick={handleSend} disabled={sending} className="shrink-0">
        {sending ? "Sending…" : "Send reset link"}
      </Button>
    </div>
  );
}
