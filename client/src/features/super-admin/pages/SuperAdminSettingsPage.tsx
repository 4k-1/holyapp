import { useEffect, useState, type FormEvent } from "react";
import {
  fetchCurrentProfile,
  sendPasswordResetEmail,
  updateProfile,
} from "@/features/auth/api/authApi";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import {
  SaField,
  SuperAdminToast,
  saBtnPrimary,
  saBtnSecondary,
  saInputClass,
} from "@/features/super-admin/components/SuperAdminModal";
import type { CurrentUser } from "@/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function dateInputValue(value: string | undefined) {
  if (!value) return "";
  return value.slice(0, 10);
}

function formatBirthday(value: string | undefined) {
  if (!value) return "—";
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function SuperAdminSettingsPage() {
  const sessionUser = useCurrentUser();
  const [user, setUser] = useState<CurrentUser | null>(sessionUser);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState("");

  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [address, setAddress] = useState("");

  const [sendingReset, setSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchCurrentProfile()
      .then((next) => {
        if (cancelled) return;
        setUser(next);
        fillFrom(next);
        setLoadError("");
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : "Could not load your profile.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function fillFrom(next: CurrentUser) {
    setFirstName(next.firstName ?? "");
    setMiddleName(next.middleName ?? "");
    setLastName(next.lastName ?? "");
    setBirthday(dateInputValue(next.birthday));
    setEmail(next.email);
    setContactNumber(next.contactNumber ?? "");
    setAddress(next.address ?? "");
  }

  function startEditing() {
    if (!user) return;
    fillFrom(user);
    setFormError("");
    setEditing(true);
  }

  function cancelEditing() {
    if (user) fillFrom(user);
    setFormError("");
    setEditing(false);
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    const nextFirst = firstName.trim();
    const nextLast = lastName.trim();
    const nextEmail = email.trim().toLowerCase();
    if (!nextFirst || !nextLast) {
      setFormError("First and last name are required.");
      return;
    }
    if (!EMAIL_RE.test(nextEmail)) {
      setFormError("Enter a valid email address.");
      return;
    }

    setSaving(true);
    setFormError("");
    try {
      const updated = await updateProfile({
        firstName: nextFirst,
        lastName: nextLast,
        middleName: middleName.trim() || undefined,
        birthday,
        email: nextEmail,
        address: address.trim(),
        contactNumber: contactNumber.trim(),
      });
      setUser(updated);
      fillFrom(updated);
      setEditing(false);
      setToast("Profile saved.");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendReset() {
    setSendingReset(true);
    setResetError("");
    try {
      await sendPasswordResetEmail();
      setResetSent(true);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Could not send the reset email.");
    } finally {
      setSendingReset(false);
    }
  }

  if (loading) {
    return <p className="text-[13.5px] text-admin-ink-muted">Loading profile…</p>;
  }

  if (loadError || !user) {
    return (
      <div className="max-w-[560px] rounded-lg border border-admin-border bg-admin-surface px-6 py-8">
        <p className="text-[14px] text-admin-ink">{loadError || "Not signed in."}</p>
      </div>
    );
  }

  return (
    <div className="max-w-[640px]">
      <section className="overflow-hidden rounded-lg border border-admin-border bg-admin-surface">
        <div className="flex items-start justify-between gap-3 border-b border-admin-border px-5 py-4">
          <div>
            <h2 className="font-sans text-[16px] font-bold text-admin-ink">Account details</h2>
            <p className="mt-0.5 text-[13.5px] text-admin-ink-muted">
              This is how your name appears in audit logs and parish management.
            </p>
          </div>
          {!editing ? (
            <button type="button" className={saBtnSecondary} onClick={startEditing}>
              Edit
            </button>
          ) : null}
        </div>

        {editing ? (
          <form className="flex flex-col gap-3 px-5 py-[18px]" onSubmit={handleSave}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <SaField label="First name">
                <input
                  className={saInputClass}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  required
                />
              </SaField>
              <SaField label="Middle name">
                <input
                  className={saInputClass}
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  autoComplete="additional-name"
                />
              </SaField>
              <SaField label="Last name">
                <input
                  className={saInputClass}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  required
                />
              </SaField>
            </div>
            <SaField label="Birthday">
              <input
                type="date"
                className={saInputClass}
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
              />
            </SaField>
            <SaField label="Email">
              <input
                type="email"
                className={saInputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </SaField>
            <SaField label="Contact number">
              <input
                className={saInputClass}
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                autoComplete="tel"
              />
            </SaField>
            <SaField label="Address">
              <input
                className={saInputClass}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                autoComplete="street-address"
              />
            </SaField>
            {formError ? (
              <p className="text-[13.5px] font-semibold text-admin-red-700" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="mt-1 flex justify-end gap-2">
              <button type="button" className={saBtnSecondary} onClick={cancelEditing} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className={saBtnPrimary} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        ) : (
          <dl className="grid grid-cols-1 gap-x-8 gap-y-4 px-5 py-[18px] sm:grid-cols-2">
            <InfoRow label="Full name" value={user.fullName || "—"} />
            <InfoRow label="Birthday" value={formatBirthday(user.birthday)} />
            <InfoRow label="Email" value={user.email} />
            <InfoRow label="Contact number" value={user.contactNumber || "—"} />
            <InfoRow label="Address" value={user.address || "—"} />
          </dl>
        )}
      </section>

      <section className="mt-4 overflow-hidden rounded-lg border border-admin-border bg-admin-surface px-5 py-4">
        <h2 className="font-sans text-[16px] font-bold text-admin-ink">Password</h2>
        <p className="mt-0.5 text-[13.5px] text-admin-ink-muted">
          Passwords are changed by email, so a stolen session cannot change your credentials by itself.
        </p>
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-admin-border bg-admin-surface-alt px-3.5 py-3">
          <div className="min-w-0">
            <p className="text-[12.5px] font-bold text-admin-ink-muted">Account email</p>
            <p className="break-all text-[14px] font-semibold text-admin-ink">{user.email}</p>
          </div>
          <button
            type="button"
            className={saBtnSecondary}
            onClick={handleSendReset}
            disabled={sendingReset || resetSent}
          >
            {sendingReset ? "Sending…" : resetSent ? "Email sent" : "Send reset email"}
          </button>
        </div>
        {resetSent ? (
          <p className="mt-2.5 text-[13.5px] text-admin-green-700" role="status">
            Reset link sent to {user.email}. It expires in 30 minutes.
          </p>
        ) : null}
        {resetError ? (
          <p className="mt-2.5 text-[13.5px] font-semibold text-admin-red-700" role="alert">
            {resetError}
          </p>
        ) : null}
      </section>

      <SuperAdminToast message={toast} />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[12.5px] font-semibold text-admin-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-[14px] text-admin-ink">{value}</dd>
    </div>
  );
}
