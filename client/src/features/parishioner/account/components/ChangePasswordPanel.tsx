import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { sendPasswordResetEmail } from "@/features/auth/api/authApi";

interface ChangePasswordPanelProps {
  email: string;
}

export function ChangePasswordPanel({ email }: ChangePasswordPanelProps) {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function handleSend() {
    setSending(true);
    try {
      await sendPasswordResetEmail();
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <p className="text-[13px] leading-relaxed text-ink/85">
        For your security, passwords are changed by email verification rather than in-portal. Click below and check
        your inbox at <strong className="text-ink">{email}</strong>.
      </p>
      <div className="mt-4">
        <Button variant="primary" onClick={handleSend} disabled={sending || sent}>
          {sending ? "Sending..." : sent ? "Email Sent" : "Send Password Reset Email"}
        </Button>
      </div>
      {sent && (
        <div className="mt-4 flex gap-2.5 rounded-xl border border-primary/20 bg-primary/[0.05] px-4 py-3.5 text-sm text-primary">
          <span className="shrink-0">✓</span>
          <p>
            Reset link sent. Check <strong>{email}</strong> for instructions — the link expires in 30 minutes.
          </p>
        </div>
      )}
    </div>
  );
}