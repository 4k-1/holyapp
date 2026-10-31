// src/features/parish-admin/settings/components/StaffAccountsSection.tsx
import { useEffect, useState } from "react";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { AdminCard } from "@/features/parish-admin/components/AdminCard";
import { AdminButton } from "@/features/parish-admin/components/AdminForm";
import { AdminTable, type AdminTableColumn } from "@/components/ui/AdminTable";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { addStaffAccount, listStaffAccounts, setStaffAccountStatus, updateStaffAccount } from "../api/staffApi";
import { DeactivateStaffModal } from "./DeactivateStaffModal";
import { StaffAccountModal } from "./StaffAccountModal";
import type { NewStaffInput, StaffAccount, StaffRole } from "../types";
import { notifyError } from "@/lib/notify";
import { SkeletonList } from "@/components/ui/Skeleton";

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
        const created = await addStaffAccount(input);
        setAccounts((prev) => [...prev, created]);
      }
      closeModal();
    } catch (err) {
      notifyError(err, "Could not save staff account.");
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
            </p>
            <p className="truncate text-admin-support text-admin-ink-faint">{s.email}</p>
          </div>
        </div>
      ),
    },
    { key: "role", header: "Role", render: (s) => s.role },
    {
      key: "access",
      header: "Access",
      render: (s) => (
        <AdminBadge tone={s.accessRole === "admin" ? "gold" : "muted"}>
          {s.accessRole === "admin" ? "Admin access" : "Staff access"}
        </AdminBadge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (s) => <AdminBadge tone={s.status === "Active" ? "green" : "muted"}>{s.status}</AdminBadge>,
    },
    {
      key: "actions",
      header: "Actions",
      render: (s) => {
        const isSelf = s.email === currentUser?.email;
        return (
          <div className="inline-flex gap-3">
            <button
              onClick={() => openEdit(s)}
              className="text-admin-support font-semibold text-admin-green-700 hover:underline"
            >
              Edit
            </button>
            {s.status === "Active" ? (
              <button
                onClick={() => setDeactivateTarget(s)}
                disabled={isSelf}
                title={isSelf ? "You can't deactivate your own account." : undefined}
                className="text-admin-support font-semibold text-red-700 hover:underline disabled:cursor-not-allowed disabled:text-admin-ink-faint disabled:no-underline"
              >
                Deactivate
              </button>
            ) : (
              <button
                onClick={() => handleReactivate(s)}
                className="text-admin-support font-semibold text-admin-green-700 hover:underline"
              >
                Reactivate
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <AdminCard className="overflow-hidden p-0">
        <div className="flex items-start justify-between gap-3 px-[22px] py-5">
          <div>
            <h2 className="font-serif text-admin-section font-semibold text-admin-ink">Staff Accounts</h2>
            <p className="mt-1 text-admin-support text-admin-ink-muted">
              People who can sign in to this parish's admin console.
            </p>
            <p className="mt-1.5 text-admin-label text-admin-ink-faint">
              {accounts.length} account{accounts.length === 1 ? "" : "s"} · {activeCount} active ·{" "}
              {adminCount} with admin access
            </p>
          </div>
          <AdminButton size="sm" onClick={openAdd} className="shrink-0">
            <PlusIcon />
            Add staff account
          </AdminButton>
        </div>

        <AdminTable
          columns={columns}
          rows={accounts}
          getRowKey={(s) => s.id}
          emptyMessage="No staff accounts yet. Add your first staff member to get started."
        />
      </AdminCard>

      {modalMode && (
        <StaffAccountModal
          account={modalMode === "edit" ? activeAccount ?? undefined : undefined}
          isSelf={modalMode === "edit" && activeAccount?.email === currentUser?.email}
          onClose={closeModal}
          onSave={handleSave}
        />
      )}

      {deactivateTarget && (
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
