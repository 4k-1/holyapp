import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { getCurrentUser, sendPasswordResetEmail } from "@/features/auth/api/authApi";
import { AccountSection } from "@/features/parishioner/account/components/AccountSection";
import { notifyError } from "@/lib/notify";
import type { Parish } from "@/types";

/** Password and closing the account. Personal details live on the Account page. */
export function SettingsPage() {
  const navigate = useNavigate();
  const { parish } = useOutletContext<{ parish: Parish }>();
  const user = getCurrentUser();

  if (!user) return null;

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

      <h1 className="mb-6 font-serif text-2xl font-bold text-ink">Settings</h1>

      <div className="flex flex-col gap-4">
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
