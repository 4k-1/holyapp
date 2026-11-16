// src/features/parish-admin/settings/components/StaffAccountsSection.tsx
import { useEffect, useState } from "react";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import { AdminRowActions } from "@/components/ui/AdminRowActions";
import { AdminTable, type AdminTableColumn } from "@/components/ui/AdminTable";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { addStaffAccount, listStaffAccounts, sendStaffSignInLink, setStaffAccountStatus, updateStaffAccount } from "../api/staffApi";
import { DeactivateStaffModal } from "./DeactivateStaffModal";
import { HandoverModal } from "@/features/parish-admin/staff/components/HandoverModal";
import { StaffAccountModal } from "./StaffAccountModal";
import type { NewStaffInput, StaffAccount, StaffRole } from "../types";
import { notify, notifyError } from "@/lib/notify";
import { SkeletonList } from "@/components/ui/Skeleton";
import { SettingsPanel } from "./SettingsUI";
import { describeAccess } from "@/features/parish-admin/access";

const ROLE_AVATAR_STYLES: Record<StaffRole, string> = {
  Priest: "bg-admin-gold-100 text-admin-gold-700",
  "Parish Secretary": "bg-[#D6EAF8] text-[#2F6FA8]",
  "Admin Staff": "bg-admin-green-100 text-admin-green-700",
};

// Strip honorifics/titles so "Fr. Juan Santos" reads as "JS", not "FJ".
const HONORIFICS = new Set(["fr.", "fr", "rev.", "rec.", "staff", "dr.", "dr", "sr.", "sr", "mr.", "ms.", "mrs."]);

function initials(name: string) {
  const all = name.split(/\s+/).filter(Boolean);
  const words = all.filter((w) => !HONORIFICS.has(w.toLowerCase()));
  const clean = words.length ? words : all;
  if (clean.length === 0) return "?";
  if (clean.length === 1) return clean[0][0].toUpperCase();
  return (clean[0][0] + clean[clean.length - 1][0]).toUpperCase();
}

export function StaffAccountsSection() {
  const currentUser = useCurrentUser();
  const [accounts, setAccounts] = useState<StaffAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [activeAccount, setActiveAccount] = useState<StaffAccount | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<StaffAccount | null>(null);

  useEffect(() => {
    listStaffAccounts()
      .then(setAccounts)
      .catch((err: unknown) => {
        notifyError(err, "Could not load staff accounts.");
      })
      .finally(() => setLoading(false));
  }, []);

  function openAdd() {
    setActiveAccount(null);
    setModalMode("add");
  }

  function openEdit(account: StaffAccount) {
    setActiveAccount(account);
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setActiveAccount(null);
  }

  async function handleSave(input: NewStaffInput) {
    try {
      if (modalMode === "edit" && activeAccount) {
        const updated = await updateStaffAccount(activeAccount.id, input);
        setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      } else {
        const { account: created, inviteSent } = await addStaffAccount(input);
        setAccounts((prev) => [...prev, created]);
        notify(
          inviteSent
            ? `Account created. We emailed ${created.email} a link to set their password.`
            : `Account created, but the email to ${created.email} didn't go out. Use Send sign-in link to try again.`,
          inviteSent ? "success" : "error"
        );
      }
      closeModal();
    } catch (err) {
      notifyError(err, "Could not save staff account.");
    }
  }

  async function handleSendLink(account: StaffAccount) {
    try {
      await sendStaffSignInLink(account.id);
      notify(`We emailed ${account.email} a link to set a new password. It works for 24 hours.`);
    } catch (err) {
      notifyError(err, "Couldn't send the sign-in link.");
    }
  }

  async function handleReactivate(account: StaffAccount) {
    const updated = await setStaffAccountStatus(account.id, "Active");
    setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  }

  async function handleDeactivateConfirmed() {
    if (!deactivateTarget) return;
    const updated = await setStaffAccountStatus(deactivateTarget.id, "Inactive");
    setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    setDeactivateTarget(null);
  }

  if (loading) {
    return <SkeletonList rows={4} className="px-0" />;
  }

  const adminCount = accounts.filter((a) => a.accessRole === "admin").length;
  const activeCount = accounts.filter((a) => a.status === "Active").length;

  const columns: AdminTableColumn<StaffAccount>[] = [
    {
      key: "staff",
      header: "Staff member",
      sortValue: (s) => s.name,
      render: (s) => (
        <div className="flex items-center gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-serif text-admin-support font-bold ${ROLE_AVATAR_STYLES[s.role] ?? "bg-admin-gold-100 text-admin-gold-700"}`}
          >
            {initials(s.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-admin-body font-semibold text-admin-ink">
              {s.name}
              {s.email === currentUser?.email && (
                <span className="ml-1.5 text-admin-label font-normal text-admin-ink-faint">(You)</span>
              )}
              {s.status !== "Active" && (
                <span className="ml-2 align-middle">
                  <AdminBadge tone="muted">Deactivated</AdminBadge>
                </span>
              )}
            </p>
            <p className="truncate text-admin-support text-admin-ink-faint">{s.email}</p>
          </div>
        </div>
      ),
    },
    { key: "role", header: "Role", sortValue: (s) => s.role, render: (s) => s.role },
    {
      key: "access",
      header: "Access",
      sortValue: (s) => s.accessRole,
      render: (s) =>
        s.accessRole === "admin" ? (
          <AdminBadge tone="gold">Admin access</AdminBadge>
        ) : (
          <div className="min-w-0">
            <AdminBadge tone="muted">Staff access</AdminBadge>
            <p className="mt-0.5 truncate text-admin-support text-admin-ink-faint">{describeAccess(s.areaAccess)}</p>
          </div>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-12 text-right",
      render: (s) => {
        const isSelf = s.email === currentUser?.email;
        return (
          <AdminRowActions
            label={`Actions for ${s.name}`}
            actions={[
              { label: "Edit", onSelect: () => openEdit(s) },
              { label: "Send sign-in link", onSelect: () => handleSendLink(s), hidden: s.status !== "Active" },
              { label: "Reactivate", onSelect: () => handleReactivate(s), hidden: s.status === "Active" },
              // You can't lock yourself out, so your own row has no Deactivate.
              { label: "Deactivate", onSelect: () => setDeactivateTarget(s), danger: true, hidden: s.status !== "Active" || isSelf },
            ]}
          />
        );
      },
    },
  ];

  return (
    <>
      <SettingsPanel
        title="Accounts"
        description={`${accounts.length} account${accounts.length === 1 ? "" : "s"} · ${activeCount} active · ${adminCount} with admin access`}
        action={
          <AdminButton size="sm" onClick={openAdd} className="rounded-full">
            <PlusIcon />
            Add staff account
          </AdminButton>
        }
        flush
      >

        <AdminTable
          columns={columns}
          rows={accounts}
          getRowKey={(s) => s.id}
          pageKey="staff-accounts"
          emptyMessage="No staff accounts yet. Add your first staff member to get started."
        />
      </SettingsPanel>

      {modalMode && (
        <StaffAccountModal
          account={modalMode === "edit" ? activeAccount ?? undefined : undefined}
          isSelf={modalMode === "edit" && activeAccount?.email === currentUser?.email}
          onClose={closeModal}
          onSave={handleSave}
        />
      )}

      {deactivateTarget?.personnelId && (
        <HandoverModal
          personId={deactivateTarget.personnelId}
          personName={deactivateTarget.name}
          onClose={() => setDeactivateTarget(null)}
          onDone={() => {
            const id = deactivateTarget.id;
            setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, status: "Inactive" } : a)));
            setDeactivateTarget(null);
          }}
        />
      )}

      {deactivateTarget && !deactivateTarget.personnelId && (
        <DeactivateStaffModal
          account={deactivateTarget}
          onClose={() => setDeactivateTarget(null)}
          onConfirm={handleDeactivateConfirmed}
        />
      )}
    </>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-3.5 w-3.5">
      <line x1="12" y1="5" x2="12" y2="19" strokeLinecap="round" />
      <line x1="5" y1="12" x2="19" y2="12" strokeLinecap="round" />
    </svg>
  );
}
