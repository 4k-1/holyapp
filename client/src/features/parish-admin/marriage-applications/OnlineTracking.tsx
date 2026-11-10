// Links a marriage application to the couple's parishioner account, so they can follow its status in the
// portal. Without an account they can't track it online; the office can link it once they sign up.
import { useState } from "react";
import { AdminButton, AdminInput } from "@/features/parish-admin/components/AdminForm";
import { askConfirm } from "@/lib/notify";
import { linkParishionerAccount, unlinkParishionerAccount } from "./api/marriageApplicationsApi";
import type { MarriageApplication } from "./types";

export function OnlineTracking({
  application,
  disabled = false,
  onChange,
}: {
  application: MarriageApplication;
  disabled?: boolean;
  onChange: (application: MarriageApplication) => void;
}) {
  const account = application.linkedAccount;
  const [linking, setLinking] = useState(false);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(task: () => Promise<MarriageApplication>) {
    setSaving(true);
    setError("");
    try {
      onChange(await task());
      setLinking(false);
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save.");
    } finally {
      setSaving(false);
    }
  }

  async function unlink() {
    if (!account) return;
    const ok = await askConfirm({
      title: "Unlink this account?",
      message: `${account.name} will no longer see this application in their portal. The office keeps it as before.`,
      confirmLabel: "Unlink",
      danger: true,
    });
    if (ok) await save(() => unlinkParishionerAccount(application.id));
  }

  return (
    <div className="mt-4 border-t border-admin-border pt-3">
      <p className="text-admin-support font-semibold uppercase tracking-admin-label text-admin-ink-muted">
        Online tracking
      </p>

      {account ? (
        <div className="mt-1.5 flex flex-wrap items-start justify-between gap-2">
          <p className="min-w-0 text-admin-body text-admin-ink">
            Followed in the portal by <span className="font-semibold">{account.name}</span>
            <span className="block break-all text-admin-support text-admin-ink-muted">{account.email}</span>
          </p>
          <button
            type="button"
            onClick={unlink}
            disabled={disabled || saving}
            className="text-admin-support font-semibold text-admin-red-700 hover:underline disabled:opacity-50"
          >
            Unlink
          </button>
        </div>
      ) : linking ? (
        <form
          className="mt-2 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (email.trim()) save(() => linkParishionerAccount(application.id, email.trim()));
          }}
        >
          <AdminInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email of their parishioner account"
            aria-label="Email of their parishioner account"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <AdminButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setLinking(false);
                setError("");
              }}
              disabled={saving}
            >
              Cancel
            </AdminButton>
            <AdminButton type="submit" size="sm" disabled={!email.trim() || saving || disabled}>
              {saving ? "Linking…" : "Link account"}
            </AdminButton>
          </div>
        </form>
      ) : (
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
          <p className="text-admin-body text-admin-ink-muted">Not tracked online.</p>
          <AdminButton type="button" variant="secondary" size="sm" onClick={() => setLinking(true)} disabled={disabled}>
            Link an account
          </AdminButton>
        </div>
      )}

      {error && <p className="mt-2 text-admin-support font-semibold text-admin-red-700">{error}</p>}
    </div>
  );
}
