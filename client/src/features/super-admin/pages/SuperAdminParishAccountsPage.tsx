import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useAsync } from "@/hooks/useAsync";
import { askConfirm } from "@/lib/notify";
import {
  getPlatformParish,
  listPlatformParishes,
  removePlatformAccount,
  resetPlatformAccountPassword,
  setPlatformAccountStatus,
} from "@/features/super-admin/api/superAdminApi";
import {
  ArrowLeftIcon,
  PlusIcon,
  SearchIcon,
} from "@/components/ui/icons/AdminIcons";
import { AccountDetailsModal } from "@/features/super-admin/components/AccountDetailsModal";
import {
  AddAccountModal,
  ResetPasswordModal,
} from "@/features/super-admin/components/AddAccountModal";
import { EditAccountModal } from "@/features/super-admin/components/EditAccountModal";
import { CredentialsModal } from "@/features/super-admin/components/OnboardParishModal";
import { SuperAdminKebabMenu } from "@/features/super-admin/components/SuperAdminKebabMenu";
import {
  SuperAdminToast,
  saBtnLink,
} from "@/features/super-admin/components/SuperAdminModal";
import { useSuperAdminPageHeading } from "@/features/super-admin/superAdminChromeContext";
import type { CurrentUser } from "@/types";

type OfficeAccount = CurrentUser & { canEditRecords?: boolean };

type Tab = "admins" | "parishioners";

function roleLabel(role: CurrentUser["role"]) {
  if (role === "parish_admin") return "Parish Admin";
  if (role === "parish_staff") return "Parish Staff";
  return role;
}

const TABS: [Tab, string][] = [
  ["admins", "Office accounts"],
  ["parishioners", "Parishioners"],
];

function formatJoined(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function tabFromSearch(value: string | null): Tab {
  if (value === "parishioners") return value;
  return "admins";
}

export function SuperAdminParishAccountsPage() {
  const { parishId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = tabFromSearch(searchParams.get("tab"));

  const {
    data: row,
    loading,
    error,
    refetch,
  } = useAsync(() => getPlatformParish(parishId), [parishId]);
  const { data: parishes = [] } = useAsync(() => listPlatformParishes(), []);

  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState<
    (CurrentUser & { canEditRecords?: boolean }) | null
  >(null);
  const [editing, setEditing] = useState<OfficeAccount | null>(null);
  const [resetting, setResetting] = useState<CurrentUser | null>(null);
  const [credentials, setCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [toast, setToast] = useState("");

  useSuperAdminPageHeading("", "");

  const [view, setView] = useState({ tab, parishId });
  if (view.tab !== tab || view.parishId !== parishId) {
    setView({ tab, parishId });
    setQuery("");
  }

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  function setTab(next: Tab) {
    const nextParams = new URLSearchParams(searchParams);
    if (next === "admins") nextParams.delete("tab");
    else nextParams.set("tab", next);
    setSearchParams(nextParams, { replace: true });
  }

  const officeAccounts = useMemo<OfficeAccount[]>(() => {
    if (!row) return [];
    return [...row.admins, ...row.staff];
  }, [row]);

  const people = useMemo(
    () =>
      tab === "admins"
        ? officeAccounts
        : tab === "parishioners"
          ? (row?.parishioners ?? [])
          : [],
    [tab, officeAccounts, row],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return people;
    return people.filter(
      (user) =>
        user.fullName.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q),
    );
  }, [people, query]);

  function failed(err: unknown, fallback: string) {
    setToast(err instanceof Error && err.message ? err.message : fallback);
  }

  async function handleReset() {
    if (!resetting) return;
    try {
      const result = await resetPlatformAccountPassword(resetting.id);
      setResetting(null);
      setCredentials(result.credentials);
    } catch (err) {
      setResetting(null);
      failed(err, "Couldn't reset the password. Try again.");
    }
  }

  async function handleRemove(user: CurrentUser) {
    const ok = await askConfirm({
      title: `Remove ${user.fullName}?`,
      message: `Their account is deleted for good and they can no longer sign in to ${row?.parish.name ?? "the parish"}. This can't be undone. To stop them signing in for now, suspend them instead.`,
      confirmLabel: "Remove account",
      danger: true,
    });
    if (!ok) return;
    try {
      await removePlatformAccount(user.id);
      refetch();
      setToast(`${user.fullName} removed`);
    } catch (err) {
      failed(err, `Couldn't remove ${user.fullName}. Try again.`);
    }
  }

  async function handleToggleStatus(user: CurrentUser) {
    const next = user.status === "active" ? "suspended" : "active";
    if (next === "suspended") {
      const ok = await askConfirm({
        title: `Suspend ${user.fullName}?`,
        message:
          "They won't be able to sign in until you reactivate them. Nothing in their account is deleted.",
        confirmLabel: "Suspend",
        danger: true,
      });
      if (!ok) return;
    }
    try {
      await setPlatformAccountStatus(user.id, next);
      refetch();
      setToast(
        `${user.fullName} ${next === "active" ? "reactivated" : "suspended"}`,
      );
    } catch (err) {
      failed(err, `Couldn't update ${user.fullName}. Try again.`);
    }
  }

  if (error) {
    return (
      <div className="overflow-hidden rounded-lg border border-admin-border bg-admin-surface px-[18px] py-10 text-center">
        <p className="text-[13.5px] text-admin-red-700">
          Couldn't load this parish. Refresh the page to try again.
        </p>
      </div>
    );
  }

  if (!loading && !row) {
    return (
      <div className="overflow-hidden rounded-lg border border-admin-border bg-admin-surface px-[18px] py-10 text-center">
        <p className="text-[13.5px] text-admin-ink-muted">
          That parish was not found.
        </p>
        <Link
          to="/super-admin/parishes"
          className={`${saBtnLink} mt-3 inline-block`}
        >
          Back to Parishes
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/super-admin/parishes"
        className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-bold text-admin-green-700 hover:text-admin-green-900"
      >
        <ArrowLeftIcon className="h-[13px] w-[13px]" />
        Back to Parishes
      </Link>

      <div className="mb-3.5 flex flex-wrap gap-1.5">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-lg border px-3.5 py-2 text-[13.5px] font-bold ${
              tab === id
                ? "border-admin-green-700 bg-admin-green-700 text-white"
                : "border-admin-border bg-white text-admin-ink-muted hover:border-admin-green-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-admin-border bg-admin-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-admin-border px-[18px] py-4">
          <div className="min-w-0">
            <h2 className="font-sans text-[16px] font-bold text-admin-ink">
              {row?.parish.name ?? "Parish"}
            </h2>
            <p className="mt-0.5 text-[13px] text-admin-ink-faint">
              {row?.parish.address}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-admin-green-700 px-3.5 py-2 text-[13.5px] font-bold text-white hover:bg-admin-green-900"
          >
            <PlusIcon className="h-[13px] w-[13px] stroke-white" />
            {tab === "admins" ? "Add Admin Account" : "Add Parishioner Account"}
          </button>
        </div>

        <>
          <div className="px-[18px] pt-3.5">
            <label className="flex items-center gap-2 rounded-lg border border-admin-border px-2.5 py-[7px] text-admin-ink-faint">
              <SearchIcon className="h-3.5 w-3.5 shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  tab === "admins"
                    ? "Search name or email"
                    : "Search parishioner name or email"
                }
                aria-label="Search accounts"
                className="w-full bg-transparent font-sans text-[13.5px] text-admin-ink outline-none placeholder:text-admin-ink-faint"
              />
            </label>
          </div>

          <div className="relative overflow-x-auto">
            {tab === "admins" ? (
              <AdminTable
                loading={loading}
                empty={people.length === 0}
                noMatch={filtered.length === 0}
                rows={filtered as OfficeAccount[]}
                onView={setViewing}
                onEdit={setEditing}
                onReset={setResetting}
                onToggleStatus={handleToggleStatus}
                onRemove={handleRemove}
              />
            ) : (
              <ParishionerTable
                loading={loading}
                empty={people.length === 0}
                noMatch={filtered.length === 0}
                rows={filtered}
                onView={setViewing}
                onEdit={setEditing}
                onReset={setResetting}
                onToggleStatus={handleToggleStatus}
                onRemove={handleRemove}
              />
            )}
          </div>
        </>
      </div>

      {adding && row ? (
        <AddAccountModal
          role={tab === "admins" ? "parish_admin" : "parishioner"}
          parishes={parishes.length ? parishes : [row]}
          lockedParishId={row.parish.id}
          onClose={() => setAdding(false)}
          onCreated={({ credentials: creds }) => {
            setAdding(false);
            refetch();
            setCredentials(creds);
          }}
        />
      ) : null}

      {viewing && row ? (
        <AccountDetailsModal
          user={viewing}
          parishName={row.parish.name}
          onClose={() => setViewing(null)}
        />
      ) : null}

      {editing ? (
        <EditAccountModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={(name) => {
            setEditing(null);
            refetch();
            setToast(`${name} updated`);
          }}
        />
      ) : null}

      {resetting ? (
        <ResetPasswordModal
          name={resetting.fullName}
          onClose={() => setResetting(null)}
          onConfirm={handleReset}
        />
      ) : null}

      {credentials ? (
        <CredentialsModal
          email={credentials.email}
          password={credentials.password}
          audience={tab === "admins" ? "the Parish Admin" : "the parishioner"}
          onClose={() => setCredentials(null)}
        />
      ) : null}

      <SuperAdminToast message={toast} />
    </div>
  );
}

function AdminTable({
  loading,
  empty,
  noMatch,
  rows,
  onView,
  onEdit,
  onReset,
  onToggleStatus,
  onRemove,
}: {
  loading: boolean;
  empty: boolean;
  noMatch: boolean;
  rows: OfficeAccount[];
  onView: (user: OfficeAccount) => void;
  onEdit: (user: OfficeAccount) => void;
  onReset: (user: CurrentUser) => void;
  onToggleStatus: (user: CurrentUser) => void;
  onRemove: (user: CurrentUser) => void;
}) {
  return (
    <div className="relative mt-3 overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse">
        <thead>
          <tr className="bg-admin-surface-alt">
            {["Name", "Email", "Role", "Status"].map((h) => (
              <th
                key={h}
                className="border-b border-admin-border px-[18px] py-2.5 text-left text-[12.5px] font-semibold text-admin-ink-muted"
              >
                {h}
              </th>
            ))}
            <th className="border-b border-admin-border px-[18px] py-2.5 text-right text-[12.5px] font-semibold text-admin-ink-muted">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <EmptyRow cols={5} text="Loading accounts…" />
          ) : empty ? (
            <EmptyRow cols={5} text="No admin accounts yet." />
          ) : noMatch ? (
            <EmptyRow cols={5} text="No accounts match your search." />
          ) : (
            rows.map((user) => (
              <tr
                key={user.id}
                className="hover:bg-admin-green-100 last:[&>td]:border-b-0"
              >
                <td className="border-b border-admin-border px-[18px] py-3 text-[14px] font-bold text-admin-ink">
                  {user.fullName}
                </td>
                <td className="border-b border-admin-border px-[18px] py-3 text-[14px] text-admin-ink">
                  {user.email}
                </td>
                <td className="border-b border-admin-border px-[18px] py-3 text-[14px] text-admin-ink">
                  {roleLabel(user.role)}
                </td>
                <td className="border-b border-admin-border px-[18px] py-3">
                  <StatusPill status={user.status} />
                </td>
                <td className="border-b border-admin-border px-[18px] py-3">
                  <SuperAdminKebabMenu
                    labelledBy={user.fullName}
                    items={[
                      { label: "View", onClick: () => onView(user) },
                      { label: "Edit", onClick: () => onEdit(user) },
                      { label: "Reset password", onClick: () => onReset(user) },
                      {
                        label:
                          user.status === "active" ? "Suspend" : "Activate",
                        onClick: () => onToggleStatus(user),
                      },
                      {
                        label: "Remove",
                        onClick: () => onRemove(user),
                        danger: true,
                      },
                    ]}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function StatusPill({ status }: { status: CurrentUser["status"] }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-[3px] text-[12.5px] font-bold ${
        status === "active"
          ? "bg-admin-green-100 text-admin-green-900"
          : "bg-admin-red-100 text-admin-red-700"
      }`}
    >
      {status === "active" ? "Active" : "Suspended"}
    </span>
  );
}

function ParishionerTable({
  loading,
  empty,
  noMatch,
  rows,
  onView,
  onEdit,
  onReset,
  onToggleStatus,
  onRemove,
}: {
  loading: boolean;
  empty: boolean;
  noMatch: boolean;
  rows: CurrentUser[];
  onView: (user: CurrentUser) => void;
  onEdit: (user: CurrentUser) => void;
  onReset: (user: CurrentUser) => void;
  onToggleStatus: (user: CurrentUser) => void;
  onRemove: (user: CurrentUser) => void;
}) {
  return (
    <div className="relative mt-3 overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse">
        <thead>
          <tr className="bg-admin-surface-alt">
            {["Name", "Email", "Joined", "Status"].map((h) => (
              <th
                key={h}
                className="border-b border-admin-border px-[18px] py-2.5 text-left text-[12.5px] font-semibold text-admin-ink-muted"
              >
                {h}
              </th>
            ))}
            <th className="border-b border-admin-border px-[18px] py-2.5 text-right text-[12.5px] font-semibold text-admin-ink-muted">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <EmptyRow cols={5} text="Loading accounts…" />
          ) : empty ? (
            <EmptyRow cols={5} text="No parishioner accounts yet." />
          ) : noMatch ? (
            <EmptyRow cols={5} text="No accounts match your search." />
          ) : (
            rows.map((user) => (
              <tr
                key={user.id}
                className="hover:bg-admin-green-100 last:[&>td]:border-b-0"
              >
                <td className="border-b border-admin-border px-[18px] py-3 text-[14px] font-bold text-admin-ink">
                  {user.fullName}
                </td>
                <td className="border-b border-admin-border px-[18px] py-3 text-[14px] text-admin-ink">
                  {user.email}
                </td>
                <td className="border-b border-admin-border px-[18px] py-3 text-[14px] text-admin-ink">
                  {formatJoined(user.createdAt)}
                </td>
                <td className="border-b border-admin-border px-[18px] py-3">
                  <StatusPill status={user.status} />
                </td>
                <td className="border-b border-admin-border px-[18px] py-3">
                  <SuperAdminKebabMenu
                    labelledBy={user.fullName}
                    items={[
                      { label: "View", onClick: () => onView(user) },
                      { label: "Edit", onClick: () => onEdit(user) },
                      { label: "Reset password", onClick: () => onReset(user) },
                      {
                        label:
                          user.status === "active" ? "Suspend" : "Activate",
                        onClick: () => onToggleStatus(user),
                      },
                      {
                        label: "Remove",
                        onClick: () => onRemove(user),
                        danger: true,
                      },
                    ]}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function EmptyRow({ cols, text }: { cols: number; text: string }) {
  return (
    <tr>
      <td
        colSpan={cols}
        className="px-[18px] py-[26px] text-center text-[13.5px] text-admin-ink-faint"
      >
        {text}
      </td>
    </tr>
  );
}
