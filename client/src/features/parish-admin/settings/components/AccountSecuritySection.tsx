// src/features/parish-admin/settings/components/AccountSecuritySection.tsx
import { useCallback, useEffect, useState } from "react";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import { sendPasswordResetEmail } from "@/features/auth/api/authApi";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import {
  endAllOtherSessions,
  endSession,
  getSecurityOverview,
  setTwoFactorEnabled,
} from "../api/securityApi";
import { Disable2FAModal } from "./Disable2FAModal";
import { SignOutAllSessionsModal } from "./SignOutAllSessionsModal";
import type { LoginActivityEntry, LoginSession } from "../types";

export function AccountSecuritySection() {
  const user = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [twoFactorEnabled, setTwoFactorEnabledState] = useState(false);
  const [sessions, setSessions] = useState<LoginSession[]>([]);
  const [activity, setActivity] = useState<LoginActivityEntry[]>([]);

  const [sendingReset, setSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState("");
  const [savingTwoFactor, setSavingTwoFactor] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState("");
  const [twoFactorJustEnabled, setTwoFactorJustEnabled] = useState(false);
  const [confirmDisable2FA, setConfirmDisable2FA] = useState(false);
  const [confirmSignOutAll, setConfirmSignOutAll] = useState(false);
  const [endingSessionId, setEndingSessionId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState("");

  const loadOverview = useCallback(() => {
    setLoading(true);
    setLoadError("");
    getSecurityOverview()
      .then((data) => {
        setTwoFactorEnabledState(data.twoFactorEnabled);
        setSessions(data.sessions);
        setActivity(data.activity);
      })
      .catch(() => {
        setLoadError("Couldn't load account security details. Please try again.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  async function handleSendReset() {
    setSendingReset(true);
    setResetError("");
    try {
      await sendPasswordResetEmail();
      setResetSent(true);
    } catch {
      setResetError("Couldn't send the reset email. Please try again.");
    } finally {
      setSendingReset(false);
    }
  }

  async function handleToggleTwoFactor() {
    if (twoFactorEnabled) {
      setConfirmDisable2FA(true);
      return;
    }
    setSavingTwoFactor(true);
    setTwoFactorError("");
    try {
      const result = await setTwoFactorEnabled(true);
      setTwoFactorEnabledState(result);
      setTwoFactorJustEnabled(true);
    } catch {
      setTwoFactorError("Couldn't turn on two-factor authentication. Please try again.");
    } finally {
      setSavingTwoFactor(false);
    }
  }

  async function handleConfirmDisable2FA() {
    setSavingTwoFactor(true);
    setTwoFactorError("");
    try {
      const result = await setTwoFactorEnabled(false);
      setTwoFactorEnabledState(result);
      setTwoFactorJustEnabled(false);
      setConfirmDisable2FA(false);
    } catch {
      setTwoFactorError("Couldn't turn off two-factor authentication. Please try again.");
      setConfirmDisable2FA(false);
    } finally {
      setSavingTwoFactor(false);
    }
  }

  async function handleEndSession(id: string) {
    setEndingSessionId(id);
    setSessionError("");
    try {
      await endSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setSessionError("Couldn't sign out that session. Please try again.");
    } finally {
      setEndingSessionId(null);
    }
  }

  async function handleSignOutAllConfirmed() {
    setSessionError("");
    try {
      const kept = await endAllOtherSessions();
      setSessions(kept);
      setConfirmSignOutAll(false);
    } catch {
      setSessionError("Couldn't sign out the other sessions. Please try again.");
      setConfirmSignOutAll(false);
    }
  }

  if (loading || !user) {
    return <p className="text-admin-body text-admin-ink-muted">Loading…</p>;
  }

  if (loadError) {
    return (
      <AdminCard className="p-5 px-[22px]">
        <p className="text-admin-body text-admin-ink">{loadError}</p>
        <AdminButton variant="secondary" size="sm" className="mt-3" onClick={loadOverview}>
          Try again
        </AdminButton>
      </AdminCard>
    );
  }

  const otherSessionsCount = sessions.filter((s) => !s.current).length;

  return (
    <div className="space-y-5">
      <AdminCard className="p-5 px-[22px]">
        <h2 className="mb-1 font-serif text-admin-section font-semibold text-admin-ink">Sign-in &amp; Password</h2>
        <p className="mb-4 text-admin-support text-admin-ink-muted">
          Passwords are changed by email verification rather than in-portal, so a stolen session alone
          can't be used to change your credentials.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-admin-border bg-admin-surface-alt px-4 py-3">
          <div className="min-w-0">
            <p className="text-admin-label font-semibold uppercase tracking-admin-label text-admin-ink-muted">
              Account email
            </p>
            <p className="break-all text-admin-body font-semibold text-admin-ink">{user.email}</p>
          </div>
          <AdminButton
            variant="secondary"
            size="sm"
            onClick={handleSendReset}
            disabled={sendingReset || resetSent}
          >
            {sendingReset ? "Sending…" : resetSent ? "Email sent" : "Send password reset email"}
          </AdminButton>
        </div>
        {resetSent && (
          <p className="mt-2.5 text-admin-support text-admin-green-700" role="status">
            Reset link sent to {user.email} — check your inbox. The link expires in 30 minutes.
          </p>
        )}
        {resetError && (
          <p className="mt-2.5 text-admin-support font-semibold text-admin-red-700" role="alert">
            {resetError}
          </p>
        )}
      </AdminCard>

      <AdminCard className="p-5 px-[22px]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="two-factor-heading" className="font-serif text-admin-section font-semibold text-admin-ink">
                Two-Factor Authentication
              </h2>
              <AdminBadge tone={twoFactorEnabled ? "green" : "muted"}>
                {twoFactorEnabled ? "On" : "Off"}
              </AdminBadge>
            </div>
            <p className="mt-1 text-admin-support text-admin-ink-muted">
              Require a one-time code sent to your email in addition to your password when signing in
              from a new device.
            </p>
            {twoFactorEnabled && (
              <p className="mt-2 text-admin-support text-admin-ink">
                Codes will be sent to {user.email} on the next sign-in from a new device.
              </p>
            )}
          </div>
          <ToggleSwitch
            labelledBy="two-factor-heading"
            checked={twoFactorEnabled}
            onChange={handleToggleTwoFactor}
            disabled={savingTwoFactor}
          />
        </div>
        {twoFactorJustEnabled && twoFactorEnabled && (
          <p className="mt-3 text-admin-support text-admin-green-700" role="status">
            Two-factor authentication is on.
          </p>
        )}
        {twoFactorError && (
          <p className="mt-3 text-admin-support font-semibold text-admin-red-700" role="alert">
            {twoFactorError}
          </p>
        )}
      </AdminCard>

      <AdminCard className="overflow-hidden p-0">
        <div className="flex flex-wrap items-start justify-between gap-3 px-[22px] py-5">
          <div>
            <h2 className="font-serif text-admin-section font-semibold text-admin-ink">Active Sessions</h2>
            <p className="mt-1 text-admin-support text-admin-ink-muted">
              Devices currently signed in to this account.
            </p>
          </div>
          {otherSessionsCount > 0 && (
            <button
              type="button"
              onClick={() => setConfirmSignOutAll(true)}
              className="shrink-0 rounded-md text-admin-support font-semibold text-admin-red-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-green-600/25"
            >
              Sign out of all other sessions
            </button>
          )}
        </div>

        {sessionError && (
          <p className="px-[22px] pb-3 text-admin-support font-semibold text-admin-red-700" role="alert">
            {sessionError}
          </p>
        )}

        <div className="divide-y divide-admin-border border-t border-admin-border">
          {sessions.length === 0 ? (
            <p className="px-[22px] py-8 text-center text-admin-body text-admin-ink-muted">
              No active sessions on this account.
            </p>
          ) : (
            sessions.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-[22px] py-3.5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-admin-surface-alt text-admin-ink-muted">
                    {isMobileDevice(s.device) ? <PhoneIcon /> : <MonitorIcon />}
                  </span>
                  <div>
                    <p className="text-admin-body font-semibold text-admin-ink">
                      {s.device}
                      {s.current && (
                        <span className="ml-2 text-admin-label font-semibold text-admin-green-700">
                          This device
                        </span>
                      )}
                    </p>
                    <p className="text-admin-support text-admin-ink-faint">
                      {s.location} · {s.lastActive}
                    </p>
                  </div>
                </div>
                {!s.current && (
                  <button
                    type="button"
                    onClick={() => handleEndSession(s.id)}
                    disabled={endingSessionId === s.id}
                    className="shrink-0 rounded-md text-admin-support font-semibold text-admin-ink-muted hover:text-admin-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-green-600/25 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {endingSessionId === s.id ? "Signing out…" : "Sign out"}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </AdminCard>

      <AdminCard className="overflow-hidden p-0">
        <div className="px-[22px] py-5">
          <h2 className="font-serif text-admin-section font-semibold text-admin-ink">Recent Login Activity</h2>
          <p className="mt-1 text-admin-support text-admin-ink-muted">
            The last several sign-in attempts on this account. Don't recognize one? Send a password
            reset above.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-t border-admin-border text-left text-admin-body">
            <thead>
              <tr className="border-b border-admin-border text-admin-label font-semibold uppercase tracking-wide text-admin-ink-muted">
                <th className="px-[22px] py-2.5">When</th>
                <th className="px-3 py-2.5">Device</th>
                <th className="px-3 py-2.5">Location</th>
                <th className="py-2.5 pr-[22px] text-right">Result</th>
              </tr>
            </thead>
            <tbody>
              {activity.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-[22px] py-8 text-center text-admin-ink-muted">
                    No login attempts recorded yet.
                  </td>
                </tr>
              ) : (
                activity.map((a) => (
                  <tr key={a.id} className="border-b border-admin-border last:border-b-0">
                    <td className="px-[22px] py-3 tabular-nums text-admin-ink">{a.timestamp}</td>
                    <td className="px-3 py-3 text-admin-ink">{a.device}</td>
                    <td className="px-3 py-3 text-admin-ink-muted">{a.location}</td>
                    <td className="py-3 pr-[22px] text-right">
                      <AdminBadge tone={a.status === "success" ? "green" : "red"}>
                        {a.status === "success" ? "Success" : "Failed"}
                      </AdminBadge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminCard>

      {confirmDisable2FA && (
        <Disable2FAModal
          saving={savingTwoFactor}
          onClose={() => setConfirmDisable2FA(false)}
          onConfirm={handleConfirmDisable2FA}
        />
      )}

      {confirmSignOutAll && (
        <SignOutAllSessionsModal
          count={otherSessionsCount}
          onClose={() => setConfirmSignOutAll(false)}
          onConfirm={handleSignOutAllConfirmed}
        />
      )}
    </div>
  );
}

function isMobileDevice(device: string) {
  return /iphone|android|mobile/i.test(device);
}

function ToggleSwitch({
  checked,
  onChange,
  disabled,
  labelledBy,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  labelledBy: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      onClick={onChange}
      disabled={disabled}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-green-600/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-admin-green-700" : "bg-admin-border-strong"
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}

function MonitorIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
      <rect x="3" y="4" width="18" height="13" rx="1.8" />
      <line x1="8" y1="21" x2="16" y2="21" strokeLinecap="round" />
      <line x1="12" y1="17" x2="12" y2="21" strokeLinecap="round" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
      <rect x="7" y="2.5" width="10" height="19" rx="2.2" />
      <line x1="11" y1="18.3" x2="13" y2="18.3" strokeLinecap="round" />
    </svg>
  );
}
