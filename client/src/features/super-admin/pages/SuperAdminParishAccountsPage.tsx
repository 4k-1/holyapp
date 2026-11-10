import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useAsync } from "@/hooks/useAsync";
import {
  CERT_THEMES,
  getCertTheme,
  getPlatformParish,
  listPlatformParishes,
  removePlatformAccount,
  resetPlatformAccountPassword,
  setPlatformAccountStatus,
  setPlatformParishCertTheme,
} from "@/features/super-admin/api/superAdminApi";
import { ArrowLeftIcon, PlusIcon, SearchIcon } from "@/components/ui/icons/AdminIcons";
import { AccountDetailsModal } from "@/features/super-admin/components/AccountDetailsModal";
import { AddAccountModal, ResetPasswordModal } from "@/features/super-admin/components/AddAccountModal";
import { EditAccountModal } from "@/features/super-admin/components/EditAccountModal";
import { CredentialsModal } from "@/features/super-admin/components/OnboardParishModal";
import { SuperAdminKebabMenu } from "@/features/super-admin/components/SuperAdminKebabMenu";
import {
  SuperAdminModal,
  SuperAdminToast,
  saBtnLink,
  saBtnPrimary,
  saBtnSecondary,
} from "@/features/super-admin/components/SuperAdminModal";
import { useSuperAdminPageHeading } from "@/features/super-admin/superAdminChromeContext";
import type { CurrentUser } from "@/types";

type OfficeAccount = CurrentUser & { canEditRecords?: boolean };

type Tab = "admins" | "parishioners" | "style";

function roleLabel(role: CurrentUser["role"]) {
  if (role === "parish_admin") return "Parish Admin";
  if (role === "parish_staff") return "Parish Staff";
  return role;
}

const TABS: [Tab, string][] = [
  ["admins", "Admins"],
  ["parishioners", "Parishioners"],
  ["style", "Certificate Style"],
];

function formatJoined(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function tabFromSearch(value: string | null): Tab {
  if (value === "parishioners" || value === "style") return value;
  return "admins";
}

export function SuperAdminParishAccountsPage() {
  const { parishId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = tabFromSearch(searchParams.get("tab"));

  const { data: row, loading, refetch } = useAsync(() => getPlatformParish(parishId), [parishId]);
  const { data: parishes = [] } = useAsync(() => listPlatformParishes(), []);

  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState<(CurrentUser & { canEditRecords?: boolean }) | null>(null);
  const [editing, setEditing] = useState<OfficeAccount | null>(null);
  const [resetting, setResetting] = useState<CurrentUser | null>(null);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [toast, setToast] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [pickedTheme, setPickedTheme] = useState<string | null>(null);
  const [savingTheme, setSavingTheme] = useState(false);

  useSuperAdminPageHeading("", "");

  const [view, setView] = useState({ tab, parishId });
  if (view.tab !== tab || view.parishId !== parishId) {
    setView({ tab, parishId });
    setQuery("");
    setPickedTheme(null);
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
    () => (tab === "admins" ? officeAccounts : tab === "parishioners" ? (row?.parishioners ?? []) : []),
    [tab, officeAccounts, row]
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return people;
    return people.filter(
      (user) => user.fullName.toLowerCase().includes(q) || user.email.toLowerCase().includes(q)
    );
  }, [people, query]);

  const activeThemeId = pickedTheme ?? row?.certTheme ?? "classic";

  async function handleReset() {
    if (!resetting) return;
    const result = await resetPlatformAccountPassword(resetting.id);
    setResetting(null);
    setCredentials(result.credentials);
  }

  async function handleRemove(user: CurrentUser) {
    await removePlatformAccount(user.id);
    refetch();
    setToast(`${user.fullName} removed`);
  }

  async function handleToggleStatus(user: CurrentUser) {
    const next = user.status === "active" ? "suspended" : "active";
    await setPlatformAccountStatus(user.id, next);
    refetch();
    setToast(`${user.fullName} ${next === "active" ? "reactivated" : "suspended"}`);
  }

  async function handleSaveTheme() {
    if (!row) return;
    setSavingTheme(true);
    try {
      const result = await setPlatformParishCertTheme(row.parish.id, activeThemeId);
      refetch();
      setToast(`${row.parish.name} now uses the ${result.theme.name} certificate style`);
    } finally {
      setSavingTheme(false);
    }
  }

  if (!loading && !row) {
    return (
      <div className="overflow-hidden rounded-lg border border-admin-border bg-admin-surface px-[18px] py-10 text-center">
        <p className="text-[12.5px] text-admin-ink-muted">That parish was not found.</p>
        <Link to="/super-admin/parishes" className={`${saBtnLink} mt-3 inline-block`}>
          Back to Parishes
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/super-admin/parishes"
        className="mb-3 inline-flex items-center gap-1.5 text-[12px] font-bold text-admin-green-700 hover:text-admin-green-900"
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
            className={`rounded-lg border px-3.5 py-2 text-[12.5px] font-bold ${
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
            <h2 className="font-sans text-[14.5px] font-bold text-admin-ink">{row?.parish.name ?? "Parish"}</h2>
            <p className="mt-0.5 text-[11.5px] text-admin-ink-faint">{row?.parish.address}</p>
          </div>
          {tab === "style" ? (
            <button type="button" onClick={() => setPreviewing(true)} className={saBtnSecondary}>
              Preview Certificate
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-admin-green-700 px-3.5 py-2 text-[12.5px] font-bold text-white hover:bg-admin-green-900"
            >
              <PlusIcon className="h-[13px] w-[13px] stroke-white" />
              {tab === "admins" ? "Add Admin Account" : "Add Parishioner Account"}
            </button>
          )}
        </div>

        {tab === "style" ? (
          <CertificateStylePanel
            activeThemeId={activeThemeId}
            saving={savingTheme}
            onPick={setPickedTheme}
            onSave={handleSaveTheme}
          />
        ) : (
          <>
            <div className="px-[18px] pt-3.5">
              <label className="flex items-center gap-2 rounded-lg border border-admin-border px-2.5 py-[7px] text-admin-ink-faint">
                <SearchIcon className="h-3.5 w-3.5 shrink-0" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={tab === "admins" ? "Search name or email" : "Search parishioner name or email"}
                  aria-label="Search accounts"
                  className="w-full bg-transparent font-sans text-[12.5px] text-admin-ink outline-none placeholder:text-admin-ink-faint"
                />
              </label>
            </div>

            <div className="overflow-x-auto">
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
        )}
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

      {previewing && row ? (
        <CertificatePreviewModal
          parishName={row.parish.name}
          parishAddress={row.parish.address}
          themeId={activeThemeId}
          onClose={() => setPreviewing(false)}
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
    <table className="mt-3 w-full border-collapse">
      <thead>
        <tr className="bg-admin-surface-alt">
          {["Name", "Email", "Role", "Status"].map((h) => (
            <th
              key={h}
              className="border-b border-admin-border px-[18px] py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.04em] text-admin-ink-muted"
            >
              {h}
            </th>
          ))}
          <th className="border-b border-admin-border px-[18px] py-2.5 text-right text-[11px] font-bold uppercase tracking-[0.04em] text-admin-ink-muted">
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
            <tr key={user.id} className="hover:bg-admin-green-100 last:[&>td]:border-b-0">
              <td className="border-b border-admin-border px-[18px] py-3 text-[13px] font-bold text-admin-ink">
                {user.fullName}
              </td>
              <td className="border-b border-admin-border px-[18px] py-3 text-[13px] text-admin-ink">{user.email}</td>
              <td className="border-b border-admin-border px-[18px] py-3 text-[13px] text-admin-ink">
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
                      label: user.status === "active" ? "Suspend" : "Activate",
                      onClick: () => onToggleStatus(user),
                    },
                    { label: "Remove", onClick: () => onRemove(user), danger: true },
                  ]}
                />
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function StatusPill({ status }: { status: CurrentUser["status"] }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-[3px] text-[11px] font-bold ${
        status === "active" ? "bg-admin-green-100 text-admin-green-900" : "bg-admin-red-100 text-admin-red-700"
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
    <table className="mt-3 w-full border-collapse">
      <thead>
        <tr className="bg-admin-surface-alt">
          {["Name", "Email", "Joined", "Status"].map((h) => (
            <th
              key={h}
              className="border-b border-admin-border px-[18px] py-2.5 text-left text-[11px] font-bold uppercase tracking-[0.04em] text-admin-ink-muted"
            >
              {h}
            </th>
          ))}
          <th className="border-b border-admin-border px-[18px] py-2.5 text-right text-[11px] font-bold uppercase tracking-[0.04em] text-admin-ink-muted">
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
            <tr key={user.id} className="hover:bg-admin-green-100 last:[&>td]:border-b-0">
              <td className="border-b border-admin-border px-[18px] py-3 text-[13px] font-bold text-admin-ink">
                {user.fullName}
              </td>
              <td className="border-b border-admin-border px-[18px] py-3 text-[13px] text-admin-ink">{user.email}</td>
              <td className="border-b border-admin-border px-[18px] py-3 text-[13px] text-admin-ink">
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
                      label: user.status === "active" ? "Suspend" : "Activate",
                      onClick: () => onToggleStatus(user),
                    },
                    { label: "Remove", onClick: () => onRemove(user), danger: true },
                  ]}
                />
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function CertificateStylePanel({
  activeThemeId,
  saving,
  onPick,
  onSave,
}: {
  activeThemeId: string;
  saving: boolean;
  onPick: (id: string) => void;
  onSave: () => void;
}) {
  return (
    <div>
      <p className="m-0 px-[18px] pt-3.5 text-[12px] leading-relaxed text-admin-ink-faint">
        Pick a curated certificate style for this parish. Field positions stay locked platform-wide — this only
        changes the visual theme.
      </p>
      <div className="grid grid-cols-1 gap-3.5 p-[18px] sm:grid-cols-3">
        {CERT_THEMES.map((theme) => {
          const active = activeThemeId === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onPick(theme.id)}
              className={`rounded-md border p-3 text-left ${
                active
                  ? "border-admin-green-700 bg-admin-green-100 shadow-[inset_0_0_0_1px_var(--color-admin-green-700)]"
                  : "border-admin-border bg-white hover:border-admin-green-600"
              }`}
            >
              <div
                className="mb-2.5 rounded-md px-2.5 py-3.5 text-center"
                style={{
                  background: "#FDFCF8",
                  borderColor: theme.accent,
                  borderWidth: theme.borderWidth,
                  borderStyle: theme.borderStyle,
                }}
              >
                <div className="mx-auto mb-2 h-0.5 w-[70%]" style={{ background: theme.accent }} />
                <div className="font-serif text-[15px] font-bold text-admin-ink">Aa</div>
                <div className="mx-auto mt-2 h-0.5 w-[70%]" style={{ background: theme.accent }} />
              </div>
              <p className="text-[12.8px] font-bold text-admin-ink">{theme.name}</p>
              <p className="mt-[3px] text-[11.3px] leading-snug text-admin-ink-faint">{theme.desc}</p>
            </button>
          );
        })}
      </div>
      <div className="flex justify-end px-[18px] pb-[18px]">
        <button type="button" className={saBtnPrimary} onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save Certificate Style"}
        </button>
      </div>
    </div>
  );
}

function CertificatePreviewModal({
  parishName,
  parishAddress,
  themeId,
  onClose,
}: {
  parishName: string;
  parishAddress: string;
  themeId: string;
  onClose: () => void;
}) {
  const theme = getCertTheme(themeId);
  return (
    <SuperAdminModal
      title="Certificate Preview"
      onClose={onClose}
      widthClass="max-w-[460px]"
      footer={
        <button type="button" className={saBtnSecondary} onClick={onClose}>
          Close
        </button>
      }
    >
      <p className="m-0 text-[12px] leading-relaxed text-admin-ink-faint">
        This merges the parish's own branding into the locked master layout — for spot-checking only. Edit the
        parish's name, crest, or verification message from that Parish Admin's own Settings.
      </p>
      <div
        className="rounded-md px-[22px] py-[26px] text-center"
        style={{
          background: "#FDFCF8",
          borderColor: theme.accent,
          borderWidth: theme.borderWidth,
          borderStyle: theme.borderStyle,
        }}
      >
        <p className="font-serif text-[15px] font-bold" style={{ color: theme.accent }}>
          {parishName}
        </p>
        <p className="mt-0.5 text-[11px] text-admin-ink-faint">{parishAddress}</p>
        <div className="my-3.5 h-px" style={{ background: theme.accent }} />
        <p className="text-[11.5px] font-bold uppercase tracking-[0.03em] text-admin-ink-muted">
          Certificate of Baptism
        </p>
        <p className="mt-2.5 text-[12.5px] leading-relaxed text-admin-ink-muted">
          This is to certify that the sacrament of baptism was duly administered and recorded per the parish
          register.
          <br />
          <br />
          Book ___ · Page ___ · Entry ___
        </p>
        <div className="my-3.5 h-px" style={{ background: theme.accent }} />
        <p className="text-[10.5px] text-admin-ink-faint">
          Verified via SHA-256 hash · {theme.name} style · v3 template
        </p>
      </div>
    </SuperAdminModal>
  );
}

function EmptyRow({ cols, text }: { cols: number; text: string }) {
  return (
    <tr>
      <td colSpan={cols} className="px-[18px] py-[26px] text-center text-[12.5px] text-admin-ink-faint">
        {text}
      </td>
    </tr>
  );
}
